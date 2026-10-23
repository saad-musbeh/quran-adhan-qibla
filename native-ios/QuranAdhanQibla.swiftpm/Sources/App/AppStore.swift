import Combine
import CoreText
import IslamicCore
import SwiftUI

@MainActor final class AppStore: ObservableObject {
  let content: Content
  let cities: CityIndex
  let audio: QuranAudio
  let tafsir: TafsirLibrary
  let device = DeviceLocation()
  let alerts = PrayerAlerts()
  let stateURL: URL
  @Published var state: PersistedState {
    didSet {
      persist()
      refreshAlerts()
    }
  }
  @Published var selectedTab = 0
  @Published var adhkarCollection = "morning"
  @Published var activeBookID: String?
  @Published var showSettings = false
  @Published var showLocation = false
  @Published var showDownloads = false
  @Published var showTafsirLibrary = false
  @Published var storageWarning: String?
  @Published var error: String?
  private var ready = false
  private var readOnly = false
  private var alertTask: Task<Void, Never>?
  private var lastAlertKey: String?

  var arabic: Bool { state.preferences.language == "ar" }
  var scale: Double { state.preferences.textScale }
  var isDark: Bool { state.preferences.dark }
  var accent: Color {
    switch state.preferences.color {
    case "maroon": return Color(red: 0.55, green: 0.13, blue: 0.23)
    case "blue": return Color(red: 0.12, green: 0.34, blue: 0.62)
    case "black": return isDark ? .gray : .black
    case "brown": return Color(red: 0.48, green: 0.31, blue: 0.18)
    default: return Color(red: 0.12, green: 0.45, blue: 0.32)
    }
  }
  func t(_ ar: String, _ en: String) -> String { arabic ? ar : en }

  init(resources: URL, support: URL) throws {
    content = try Content(root: resources)
    cities = CityIndex(root: resources, codes: content.countries.map(\.code))
    try FileManager.default.createDirectory(at: support, withIntermediateDirectories: true)
    stateURL = support.appendingPathComponent("state-v1.json")
    var loaded = PersistedState()
    var loadFailure: Error?
    if FileManager.default.fileExists(atPath: stateURL.path) {
      do {
        loaded = try JSONDecoder().decode(PersistedState.self, from: Data(contentsOf: stateURL))
          .validated()
      } catch { loadFailure = error }
    }
    state = loaded
    audio = QuranAudio(
      reciters: content.reciters, verseCounts: content.quran.surahs.map(\.verseCount),
      root: support.appendingPathComponent("Audio"))
    tafsir = try TafsirLibrary(
      catalogueURL: resources.appendingPathComponent("tafsir-catalogue.json"),
      root: support.appendingPathComponent("Tafsir"),
      verseCounts: content.quran.surahs.map(\.verseCount))
    audio.selectedReciterID = loaded.preferences.reciterID
    audio.rate = loaded.preferences.playbackRate
    tafsir.selectedID = loaded.preferences.tafsirID
    selectedTab = loaded.preferences.showHome ? 0 : 2
    readOnly = loadFailure != nil
    if let loadFailure { storageWarning = loadFailure.localizedDescription }
    device.onFix = { [weak self] value in self?.state.location = value }
    CTFontManagerRegisterFontsForURL(
      resources.appendingPathComponent("AmiriQuran.ttf") as CFURL, .process, nil)
    alerts.prepareSounds(at: resources.appendingPathComponent("Sounds"))
    ready = true
    refreshAlerts(force: true)
  }

  private func persist() {
    guard ready, !readOnly else { return }
    do {
      try JSONEncoder().encode(state).write(
        to: stateURL, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    } catch {
      readOnly = true
      storageWarning = error.localizedDescription
    }
  }

  func resetSavedState() {
    do {
      if FileManager.default.fileExists(atPath: stateURL.path) {
        let backup = stateURL.deletingLastPathComponent().appendingPathComponent(
          "state-backup-\(Int(Date().timeIntervalSince1970)).json")
        try FileManager.default.copyItem(at: stateURL, to: backup)
      }
      readOnly = false
      storageWarning = nil
      state = PersistedState()
    } catch { storageWarning = error.localizedDescription }
  }

  func open(_ book: QuranBook) {
    activeBookID = book.id
    selectedTab = 1
  }
  func book(_ id: String) -> QuranBook? { state.books.first { $0.id == id } }
  func updateBook(_ id: String, _ body: (inout QuranBook) -> Void) {
    guard let index = state.books.firstIndex(where: { $0.id == id }) else { return }
    body(&state.books[index])
  }
  func turnBook(_ id: String, to page: Int) {
    guard (1...606).contains(page) else { return }
    updateBook(id) { $0.page = page }
  }
  func addBook() {
    guard state.books.count < 6 else { return }
    state.books.append(QuranBook())
  }
  func deleteBook(_ id: String) {
    guard state.books.count > 1 else { return }
    state.books.removeAll { $0.id == id }
    if activeBookID == id { activeBookID = nil }
  }
  func togglePageBookmark(_ id: String) {
    updateBook(id) { book in
      if book.pageBookmarks.contains(book.page) {
        book.pageBookmarks.remove(book.page)
      } else {
        book.pageBookmarks.insert(book.page)
      }
    }
  }
  func toggleVerseBookmark(_ id: String, verse: String) {
    updateBook(id) { book in
      if book.verseBookmarks.contains(verse) {
        book.verseBookmarks.remove(verse)
      } else {
        book.verseBookmarks.insert(verse)
      }
    }
  }

  func resume() {
    if let location = state.location, location.source == "device",
      Date().timeIntervalSince(location.updatedAt) > 21600
    {
      device.request(prompt: false)
    }
    refreshAlerts(force: true)
  }

  func refreshAlerts(force: Bool = false) {
    guard ready else { return }
    // Reading-position saves must not cancel and rebuild notification schedules.
    struct Key: Encodable {
      let language: String
      let prayers: PrayerSettings
      let enabled: Bool
      let sounds: [String: PrayerSound]
      let reminders: [Reminder]
      let location: SavedLocation?
      let timezone: String
      let day: String
    }
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys]
    let key =
      (try? encoder.encode(
        Key(
          language: state.preferences.language, prayers: state.preferences.prayers,
          enabled: state.preferences.alertsEnabled, sounds: state.preferences.sounds,
          reminders: state.preferences.reminders, location: state.location,
          timezone: TimeZone.current.identifier,
          day: Calendar(identifier: .gregorian).startOfDay(for: Date()).description))).map {
        $0.base64EncodedString()
      }
    guard force || key != lastAlertKey else { return }
    lastAlertKey = key
    alertTask?.cancel()
    let preferences = state.preferences
    let location = state.location
    alertTask = Task { [weak self] in
      try? await Task.sleep(for: .milliseconds(250))
      guard !Task.isCancelled, let self else { return }
      await self.alerts.reconcile(preferences: preferences, location: location, now: Date())
    }
  }
}

extension PrayerID {
  func label(_ arabic: Bool) -> String {
    let ar: [PrayerID: String] = [
      .fajr: "الفجر", .sunrise: "الشروق", .dhuhr: "الظهر", .asr: "العصر", .maghrib: "المغرب",
      .isha: "العشاء",
    ]
    let en: [PrayerID: String] = [
      .fajr: "Fajr", .sunrise: "Sunrise", .dhuhr: "Dhuhr", .asr: "Asr", .maghrib: "Maghrib",
      .isha: "Isha",
    ]
    return (arabic ? ar : en)[self] ?? rawValue
  }
}
