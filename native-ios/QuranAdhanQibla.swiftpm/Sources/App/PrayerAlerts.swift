import Combine
import Foundation
import IslamicCore
import UserNotifications

@MainActor final class PrayerAlerts: NSObject, ObservableObject, UNUserNotificationCenterDelegate {
  @Published private(set) var scheduledCount = 0
  @Published private(set) var lastPrayerDate: Date?
  @Published private(set) var authorization = "unknown"
  @Published var error: String?
  var onOpen: ((String) -> Void)? {
    didSet {
      if let pendingOpen, let onOpen {
        self.pendingOpen = nil
        onOpen(pendingOpen)
      }
    }
  }
  private var pendingOpen: String?
  private let center = UNUserNotificationCenter.current()
  private let prefix = "qaq.swift."
  private var generation = UUID()

  override init() {
    super.init()
    center.delegate = self
  }

  func prepareSounds(at source: URL) {
    do {
      let library = try FileManager.default.url(
        for: .libraryDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
      let destination = library.appendingPathComponent("Sounds", isDirectory: true)
      try FileManager.default.createDirectory(at: destination, withIntermediateDirectories: true)
      for url in try FileManager.default.contentsOfDirectory(
        at: source, includingPropertiesForKeys: nil) where url.pathExtension == "wav"
      {
        let target = destination.appendingPathComponent(url.lastPathComponent)
        if !FileManager.default.fileExists(atPath: target.path) {
          try FileManager.default.copyItem(at: url, to: target)
        }
      }
    } catch { self.error = error.localizedDescription }
  }

  func requestPermission() async -> Bool {
    do { return try await center.requestAuthorization(options: [.alert, .sound, .badge]) } catch {
      self.error = error.localizedDescription
      return false
    }
  }

  private struct Candidate {
    let key: String
    let date: Date
    let prayer: PrayerID?
    let kind: String
    let title: String
    let body: String
    let sound: String?
  }

  static let voices: [(id: String, ar: String, en: String, file: String)] = [
    ("short", "أذان قصير", "Short Adhan", "adhan_brief.wav"),
    ("makkah", "مكة المكرمة", "Makkah", "adhan_makkah_clean_short.wav"),
    ("madinah", "المدينة المنورة", "Al-Madinah", "adhan_madinah_clean_short.wav"),
    ("andrewler", "تسجيل Andrewler", "Andrewler recording", "adhan_andrewler_clean_short.wav"),
    ("original", "الأذان الأصلي", "Original Adhan", "adhan_clean_short.wav"),
  ]
  static func sound(_ choice: PrayerSound, prayer: PrayerID) -> String? {
    guard choice.sound else { return nil }
    if choice.voice == "short" && prayer == .fajr { return "adhan_brief_fajr.wav" }
    return voices.first { $0.id == choice.voice }?.file ?? "adhan_brief.wav"
  }

  func reconcile(preferences: Preferences, location: SavedLocation?, now: Date) async {
    let token = UUID()
    generation = token
    let settings = await center.notificationSettings()
    guard generation == token, !Task.isCancelled else { return }
    switch settings.authorizationStatus {
    case .authorized: authorization = settings.soundSetting == .enabled ? "authorized" : "silent"
    case .provisional, .ephemeral: authorization = "quiet"
    case .denied: authorization = "denied"
    case .notDetermined: authorization = "notDetermined"
    @unknown default: authorization = "unknown"
    }
    let existing = await center.pendingNotificationRequests()
    guard generation == token, !Task.isCancelled else { return }
    center.removePendingNotificationRequests(
      withIdentifiers: existing.filter {
        $0.identifier.hasPrefix(prefix) && !$0.identifier.hasPrefix(prefix + "test.")
      }.map(\.identifier))
    if !preferences.alertsEnabled {
      center.removePendingNotificationRequests(
        withIdentifiers: existing.filter { $0.identifier.hasPrefix(prefix + "test.") }.map(
          \.identifier))
    }
    scheduledCount = 0
    lastPrayerDate = nil
    error = nil
    guard [.authorized, .provisional, .ephemeral].contains(settings.authorizationStatus) else {
      return
    }
    let ar = preferences.language == "ar"
    var calendar = Calendar(identifier: .gregorian)
    calendar.timeZone = .current
    var candidates: [Candidate] = []
    do {
      for offset in 0...7 {
        guard let day = calendar.date(byAdding: .day, value: offset, to: now) else { continue }
        if preferences.alertsEnabled, let location {
          let schedule = try PrayerCalculator.schedule(
            point: location.point, date: day, settings: preferences.prayers)
          for event in schedule.events where event.prayer.isPrayer && event.date > now {
            let choice = preferences.sounds[event.prayer.rawValue] ?? PrayerSound()
            candidates.append(
              Candidate(
                key: "prayer.\(event.prayer.rawValue).\(Int(event.date.timeIntervalSince1970))",
                date: event.date, prayer: event.prayer, kind: "prayer",
                title: event.prayer.label(ar),
                body: ar ? "حان وقت الصلاة" : "It is time for prayer",
                sound: Self.sound(choice, prayer: event.prayer)))
          }
        }
      }
    } catch {
      self.error =
        ar
        ? "تعذّر حساب المواقيت. أُلغيت تنبيهات الصلاة القديمة. راجع الموقع وإعدادات المناطق القطبية."
        : "Prayer calculation failed. Old prayer alerts were cancelled. Check your location and polar settings."
    }
    for reminder in preferences.reminders where reminder.enabled {
      let times: [(Int, Int)]
      if reminder.intervalMinutes > 0 && reminder.startHour <= reminder.endHour {
        times = stride(
          from: reminder.startHour * 60, through: reminder.endHour * 60,
          by: reminder.intervalMinutes
        ).map { ($0 / 60, $0 % 60) }
      } else {
        times = [(reminder.hour, reminder.minute)]
      }
      for offset in 0...7 {
        guard let day = calendar.date(byAdding: .day, value: offset, to: now) else { continue }
        for (hour, minute) in times {
          guard let date = ReminderClock.date(day: day, hour: hour, minute: minute), date > now
          else { continue }
          let title: String
          switch reminder.kind {
          case "morning": title = ar ? "أذكار الصباح" : "Morning adhkar"
          case "evening": title = ar ? "أذكار المساء" : "Evening adhkar"
          default: title = ar ? "الصلاة على النبي" : "Salawat reminder"
          }
          candidates.append(
            Candidate(
              key: "reminder.\(reminder.id).\(Int(date.timeIntervalSince1970))", date: date,
              prayer: nil, kind: reminder.kind, title: title,
              body: ar ? "افتح التطبيق لقراءة الأذكار" : "Open the app to read adhkar",
              sound: reminder.sound.isEmpty ? nil : reminder.sound))
        }
      }
    }
    // Reserve twelve upcoming prayers, then give the remaining capacity to the
    // closest events. Two independent slots remain available for sound tests.
    let selectedKeys = Set(
      AlertBudget.select(
        candidates.map { AlertCandidate(id: $0.key, date: $0.date, isPrayer: $0.prayer != nil) },
        now: now
      ).map(\.id))
    let selected = candidates.filter { selectedKeys.contains($0.key) }.sorted { $0.date < $1.date }
    for entry in selected {
      guard generation == token, !Task.isCancelled else { return }
      let content = UNMutableNotificationContent()
      content.title = entry.title
      content.body = entry.body
      content.userInfo = ["kind": entry.kind]
      if let sound = entry.sound {
        content.sound = UNNotificationSound(named: UNNotificationSoundName(rawValue: sound))
      }
      let trigger = UNTimeIntervalNotificationTrigger(
        timeInterval: max(1, entry.date.timeIntervalSinceNow), repeats: false)
      let id = prefix + token.uuidString + "." + entry.key
      do {
        try await center.add(
          UNNotificationRequest(identifier: id, content: content, trigger: trigger))
        guard generation == token, !Task.isCancelled else {
          center.removePendingNotificationRequests(withIdentifiers: [id])
          return
        }
        scheduledCount += 1
        if entry.prayer != nil { lastPrayerDate = entry.date }
      } catch { self.error = error.localizedDescription }
    }
  }

  func test(prayer: PrayerID, choice: PrayerSound, arabic: Bool) async {
    guard await requestPermission() else { return }
    let content = UNMutableNotificationContent()
    content.title = arabic ? "تجربة الأذان" : "Adhan test"
    content.body = prayer.label(arabic)
    if let sound = Self.sound(choice, prayer: prayer) {
      content.sound = UNNotificationSound(named: UNNotificationSoundName(rawValue: sound))
    }
    do {
      try await center.add(
        UNNotificationRequest(
          identifier: prefix + "test.adhan", content: content,
          trigger: UNTimeIntervalNotificationTrigger(timeInterval: 5, repeats: false)))
    } catch { self.error = error.localizedDescription }
  }

  nonisolated func userNotificationCenter(
    _ center: UNUserNotificationCenter, willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) { completionHandler([.banner, .list, .sound]) }
  nonisolated func userNotificationCenter(
    _ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let kind = response.notification.request.content.userInfo["kind"] as? String ?? "prayer"
    Task { @MainActor [weak self] in
      guard let self else { return }
      if let open = self.onOpen { open(kind) } else { self.pendingOpen = kind }
    }
    completionHandler()
  }
}
