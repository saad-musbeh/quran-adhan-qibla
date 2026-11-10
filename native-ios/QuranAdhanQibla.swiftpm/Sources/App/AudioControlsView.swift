import SwiftUI

struct AudioControlsView: View {
  @ObservedObject var audio: QuranAudio
  @ObservedObject private var downloads: AudioDownloads
  let arabic: Bool
  let surah: Int
  let verse: Int
  let verseCount: Int
  @State private var loopStart: String
  @State private var loopEnd = ""
  @State private var loopError: String?

  init(audio: QuranAudio, arabic: Bool, surah: Int, verse: Int, verseCount: Int) {
    self.audio = audio
    self.arabic = arabic
    self.surah = surah
    self.verse = verse
    self.verseCount = verseCount
    _downloads = ObservedObject(wrappedValue: audio.downloads)
    _loopStart = State(initialValue: String(verse))
  }
  private var reciter: Reciter? { audio.reciters.first { $0.id == audio.selectedReciterID } }
  private func t(_ en: String, _ ar: String) -> String { arabic ? ar : en }
  private func arabicDigits(_ value: String) -> String {
    value.map { char in
      guard let digit = char.wholeNumberValue, (0...9).contains(digit),
        let scalar = UnicodeScalar((arabic ? 0x0660 : 0x0030) + digit)
      else { return String(char) }
      return String(scalar)
    }.joined()
  }
  private func parseNumber(_ input: String) -> Int? {
    let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return nil }
    let normalized = String(
      trimmed.map { character in
        guard let digit = character.wholeNumberValue, (0...9).contains(digit),
          let scalar = UnicodeScalar(0x0030 + digit)
        else { return character }
        return Character(scalar)
      })
    return Int(normalized)
  }
  private var downloadStatus: String? {
    guard let status = downloads.status else { return nil }
    if !arabic {
      return status == "Downloading"
        ? "Downloading surah \(downloads.currentSurah ?? surah)"
          + (downloads.currentVerse.map { " · ayah \($0)" } ?? " · full recording") : status
    }
    switch status {
    case "Downloading":
      return "جارٍ تنزيل السورة \(arabicDigits(String(downloads.currentSurah ?? surah)))"
        + (downloads.currentVerse.map { " · الآية \(arabicDigits(String($0)))" }
          ?? " · التسجيل الكامل")
    case "Download complete": return "اكتمل التنزيل"
    case "Download cancelled": return "أُلغي التنزيل"
    default: return status
    }
  }
  var body: some View {
    VStack(spacing: 12) {
      HStack {
        Menu {
          ForEach(audio.reciters) { item in
            Button(item.label(arabic: arabic)) { audio.selectedReciterID = item.id }
          }
        } label: {
          Label(
            reciter?.label(arabic: arabic) ?? t("Choose reciter", "اختر القارئ"),
            systemImage: "mic.fill"
          ).lineLimit(1)
        }
        .accessibilityLabel(t("Choose reciter", "اختر القارئ"))
        Spacer()
        Button {
          if let reciter {
            downloads.start(reciter: reciter, surahs: [surah], verseCounts: audio.verseCounts)
          }
        } label: {
          Label(t("Download", "تنزيل"), systemImage: "arrow.down.circle")
        }
        .disabled(reciter == nil || downloads.isDownloading)
      }
      HStack(spacing: 22) {
        Button {
          audio.previous()
        } label: {
          Image(systemName: "backward.end.fill")
        }.accessibilityLabel(t("Previous", "السابق"))
        Button {
          audio.replay()
        } label: {
          Image(systemName: "arrow.counterclockwise")
        }.accessibilityLabel(t("Replay", "إعادة التشغيل"))
        Button {
          audio.toggle(surah: surah)
        } label: {
          Image(systemName: audio.isPlaying ? "pause.fill" : "play.fill").font(.title2)
        }
        .accessibilityLabel(
          audio.isPlaying ? t("Pause", "إيقاف مؤقت") : t("Play surah", "تشغيل السورة"))
        Button {
          audio.next()
        } label: {
          Image(systemName: "forward.end.fill")
        }.accessibilityLabel(t("Next", "التالي"))
        Button {
          audio.stop()
        } label: {
          Image(systemName: "stop.fill")
        }.accessibilityLabel(t("Stop", "إيقاف"))
      }.buttonStyle(.bordered)
      HStack(spacing: 8) {
        Text(clock(audio.currentTime)).monospacedDigit().font(.caption)
        Slider(
          value: Binding(get: { audio.currentTime }, set: { audio.seek(to: $0) }),
          in: 0...max(audio.duration, 1)
        )
        .disabled(audio.duration <= 0)
        .accessibilityLabel(t("Playback position", "موضع التشغيل"))
        Text(clock(audio.duration)).monospacedDigit().font(.caption)
      }
      HStack {
        Text(t("Speed", "السرعة"))
        Slider(
          value: Binding(get: { Double(audio.rate) }, set: { audio.rate = Float($0) }), in: 0.5...2,
          step: 0.25
        )
        .accessibilityLabel(t("Playback speed", "سرعة التشغيل"))
        Text(String(format: "%.2g×", audio.rate)).monospacedDigit().frame(width: 42)
      }
      HStack {
        Text(t("At surah end", "عند نهاية السورة"))
        Spacer()
        Picker(t("At surah end", "عند نهاية السورة"), selection: $audio.endMode) {
          Text(t("Stop", "إيقاف")).tag(QuranAudio.EndMode.stop)
          Text(t("Next", "التالية")).tag(QuranAudio.EndMode.next)
          Text(t("Repeat", "تكرار")).tag(QuranAudio.EndMode.repeatSurah)
        }.pickerStyle(.segmented).frame(maxWidth: 270)
      }
      HStack {
        TextField(t("Start ayah", "آية البداية"), text: $loopStart).keyboardType(.numberPad)
          .textFieldStyle(.roundedBorder).accessibilityLabel(
            t("Loop start ayah", "آية بداية التكرار"))
        TextField(t("End ayah", "آية النهاية"), text: $loopEnd).keyboardType(.numberPad)
          .textFieldStyle(.roundedBorder).accessibilityLabel(
            t("Loop end ayah", "آية نهاية التكرار"))
        Button(t("Loop range", "تكرار المدى"), action: startLoop).buttonStyle(.borderedProminent)
      }
      if let loopError { Text(loopError).foregroundStyle(.red).font(.footnote) }
      if downloads.isDownloading, let progress = downloads.progress {
        ProgressView(value: progress).accessibilityLabel(t("Download progress", "تقدم التنزيل"))
      }
      if let error = audio.error {
        Text(arabic ? "تعذر تشغيل التسجيل. تحقق من الاتصال وحاول مرة أخرى." : error)
          .foregroundStyle(.red).font(.footnote)
      }
      if let downloadStatus {
        Text(downloadStatus).font(.footnote).accessibilityLabel(downloadStatus)
      }
      if downloads.isDownloading {
        Button(t("Cancel download", "إلغاء التنزيل"), role: .cancel) { downloads.cancel() }
      }
      if let downloadError = downloads.error {
        Text(arabic ? "تعذر تنزيل التسجيل. تحقق من الاتصال وحاول مرة أخرى." : downloadError)
          .foregroundStyle(.red).font(.footnote)
      }
    }
    .environment(\.layoutDirection, arabic ? .rightToLeft : .leftToRight)
    .padding()
  }
  private func startLoop() {
    let start = parseNumber(loopStart)
    let end =
      loopEnd.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
      ? verseCount : parseNumber(loopEnd)
    guard let start, let end, start >= 1, end >= start, end <= verseCount else {
      loopError = t("Enter a valid ayah range for this surah.", "أدخل مدى آيات صالحاً لهذه السورة.")
      return
    }
    loopError = nil
    audio.loop(surah: surah, start: start, end: end)
  }
  private func clock(_ value: Double) -> String {
    guard value.isFinite, value >= 0 else { return "0:00" }
    return String(format: "%d:%02d", Int(value) / 60, Int(value) % 60)
  }
}

struct AudioDownloadsView: View {
  @ObservedObject var audio: QuranAudio
  @ObservedObject private var downloads: AudioDownloads
  let arabic: Bool
  @State private var selectedID: String
  init(audio: QuranAudio, arabic: Bool) {
    self.audio = audio
    self.arabic = arabic
    _selectedID = State(initialValue: audio.selectedReciterID)
    _downloads = ObservedObject(wrappedValue: audio.downloads)
  }
  private func t(_ en: String, _ ar: String) -> String { arabic ? ar : en }
  private func digits(_ value: String) -> String {
    guard arabic else { return value }
    return value.map { char in
      guard let digit = char.wholeNumberValue, (0...9).contains(digit),
        let scalar = UnicodeScalar(0x0660 + digit)
      else { return String(char) }
      return String(scalar)
    }.joined()
  }
  private var selected: Reciter? { audio.reciters.first { $0.id == selectedID } }
  private var statusText: String? {
    guard let status = downloads.status else { return nil }
    if !arabic {
      if status == "Downloading" {
        return "Downloading surah \(downloads.currentSurah ?? 1)"
          + (downloads.currentVerse.map { " · ayah \($0)" } ?? " · full recording")
      }
      return status
    }
    switch status {
    case "Downloading":
      return "جارٍ تنزيل السورة \(digits(String(downloads.currentSurah ?? 1)))"
        + (downloads.currentVerse.map { " · الآية \(digits(String($0)))" } ?? " · التسجيل الكامل")
    case "Download complete": return "اكتمل التنزيل"
    case "Download cancelled": return "أُلغي التنزيل"
    default: return status
    }
  }
  var body: some View {
    List {
      Section(t("Reciter", "القارئ")) {
        Picker(t("Reciter", "القارئ"), selection: $selectedID) {
          ForEach(audio.reciters) { Text($0.label(arabic: arabic)).tag($0.id) }
        }
        if let selected {
          Button(t("Download whole Quran", "تنزيل القرآن كاملاً")) {
            downloads.start(
              reciter: selected, surahs: Array(1...114), verseCounts: audio.verseCounts)
          }
          .disabled(downloads.isDownloading)
          Button(t("Remove all saved audio", "حذف كل التسجيلات المحفوظة"), role: .destructive) {
            downloads.cancel()
            for chapter in 1...114 { downloads.remove(reciter: selected, surah: chapter) }
          }
        }
      }
      Section(t("Storage", "المساحة")) {
        Text(
          String(
            format: t("%.1f MB used", "%.1f م.ب مستخدمة"), Double(downloads.byteCount) / 1_048_576))
        if downloads.isDownloading, let progress = downloads.progress {
          ProgressView(value: progress)
          Text("\(Int(progress * 100))%")
        }
        if let statusText { Text(statusText) }
        Text(t("Keep the app open while audio downloads.", "أبقِ التطبيق مفتوحاً أثناء تنزيل الصوت."))
          .font(.footnote).foregroundStyle(.secondary)
        if downloads.isDownloading {
          Button(t("Cancel download", "إلغاء التنزيل"), role: .cancel) { downloads.cancel() }
        }
        if let error = downloads.error {
          Text(arabic ? "تعذر تنزيل التسجيل. تحقق من الاتصال وحاول مرة أخرى." : error)
            .foregroundStyle(.red)
        }
      }
      if let selected {
        Section(t("Saved surahs", "السور المحفوظة")) {
          let saved = downloads.savedSurahs(reciter: selected, verseCounts: audio.verseCounts)
          if saved.isEmpty {
            Text(t("No complete surahs saved", "لا توجد سور كاملة محفوظة")).foregroundStyle(
              .secondary)
          }
          ForEach(saved, id: \.self) { chapter in
            HStack {
              Text(t("Surah \(chapter)", "السورة \(digits(String(chapter)))"))
              Spacer()
              Button(role: .destructive) {
                downloads.remove(reciter: selected, surah: chapter)
              } label: {
                Image(systemName: "trash")
              }
              .accessibilityLabel(
                t("Remove surah \(chapter)", "حذف السورة \(digits(String(chapter)))"))
            }
          }
        }
      }
    }.environment(\.layoutDirection, arabic ? .rightToLeft : .leftToRight)
  }
}
