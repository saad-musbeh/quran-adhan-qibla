import Foundation
import IslamicCore

struct Surah: Codable, Identifiable {
  let number: Int
  let arabicName: String
  let transliteration: String
  let englishName: String
  let verseCount: Int
  let startPage: Int
  var id: Int { number }
}

struct Verse: Codable, Identifiable, Hashable {
  let surah: Int
  let number: Int
  let globalNumber: Int
  let text: String
  let page: Int
  let juz: Int
  var id: String { "\(surah):\(number)" }
}

struct QuranData: Codable {
  let attribution: String
  let surahs: [Surah]
  let verses: [Verse]
}

struct MushafPage: Codable {
  let page: Int
  let width: Double
  let height: Double
  let verseKeys: [String]
}

struct Dhikr: Codable, Identifiable {
  let id: String
  let text: String
  let count: Int
  let reference: String
}

struct Country: Codable, Identifiable {
  let code: String
  let name: String
  let arabicName: String
  let cityCount: Int
  var id: String { code }
  func label(_ arabic: Bool) -> String { arabic ? arabicName : name }
}

struct City: Codable, Identifiable, Sendable {
  let id: Int
  let name: String
  let arabicName: String?
  let asciiName: String?
  let countryCode: String
  let latitude: Double
  let longitude: Double
  let timeZone: String?
  func label(_ arabic: Bool) -> String { arabic ? arabicName ?? name : name }
  var point: GeoPoint { GeoPoint(latitude: latitude, longitude: longitude) }
}

struct SavedLocation: Codable, Equatable {
  var point: GeoPoint
  var source: String
  var label: String
  var labelAr: String?
  var accuracy: Double?
  var updatedAt: Date
  func title(_ arabic: Bool) -> String { arabic ? labelAr ?? label : label }
}

struct QuranBook: Codable, Identifiable {
  var id = UUID().uuidString
  var name = ""
  var page = 1
  var pageBookmarks: Set<Int> = []
  var verseBookmarks: Set<String> = []
}

struct PrayerSound: Codable, Equatable {
  var sound = true
  var voice = "short"
}

struct Reminder: Codable, Identifiable, Equatable {
  var id = UUID().uuidString
  var kind = "salawat"
  var enabled = false
  var hour = 8
  var minute = 0
  var intervalMinutes = 0
  var startHour = 8
  var endHour = 20
  var sound = "reminder_salawat_muhammad.wav"
}

struct Preferences: Codable, Equatable {
  var language = "ar"
  var color = "green"
  var dark = false
  var textScale = 1.0
  var showHome = true
  var fixedCompass = false
  var dhikrCounters = false
  var reciterID = "husary"
  var playbackRate: Float = 1
  var tafsirID = "moyassar"
  var prayers = PrayerSettings()
  var alertsEnabled = false
  var sounds = Dictionary(
    uniqueKeysWithValues: PrayerID.allCases.filter(\.isPrayer).map { ($0.rawValue, PrayerSound()) })
  var reminders: [Reminder] = []
}

struct PersistedState: Codable {
  var schema = 1
  var preferences = Preferences()
  var books = [QuranBook()]
  var location: SavedLocation?

  func validated() throws -> PersistedState {
    guard schema == 1, (1...6).contains(books.count), Set(books.map(\.id)).count == books.count,
      books.allSatisfy({
        (1...606).contains($0.page) && $0.pageBookmarks.allSatisfy { (1...606).contains($0) }
      }),
      ["ar", "en"].contains(preferences.language), (0.75...2).contains(preferences.textScale),
      ["green", "maroon", "blue", "black", "brown"].contains(preferences.color),
      preferences.playbackRate.isFinite, (0.5...2).contains(preferences.playbackRate),
      (0...5).contains(preferences.prayers.method),
      (0...2).contains(preferences.prayers.highLatitudeRule),
      location?.point.isValid ?? true,
      preferences.reminders.allSatisfy({
        (0...23).contains($0.hour) && (0...59).contains($0.minute)
          && (0...23).contains($0.startHour) && (0...23).contains($0.endHour)
          && [0, 30, 60, 120].contains($0.intervalMinutes)
      })
    else { throw CocoaError(.coderReadCorrupt) }
    return self
  }
}

final class Content {
  let root: URL
  let quran: QuranData
  let pages: [MushafPage]
  let adhkar: [String: [Dhikr]]
  let countries: [Country]
  let reciters: [Reciter]
  let byPage: [Int: [Verse]]
  let byKey: [String: Verse]
  let juzPages: [Int: Int]

  init(root: URL) throws {
    self.root = root
    func read<T: Decodable>(_ file: String, _ type: T.Type) throws -> T {
      try JSONDecoder().decode(type, from: Data(contentsOf: root.appendingPathComponent(file)))
    }
    quran = try read("quran.json", QuranData.self)
    pages = try read("mushaf-pages.json", [MushafPage].self)
    adhkar = try read("adhkar.json", [String: [Dhikr]].self)
    countries = try read("countries.json", [Country].self)
    reciters = try read("reciters.json", [Reciter].self)
    guard quran.surahs.count == 114, quran.verses.count == 6236, pages.count == 604,
      Set(quran.verses.map(\.id)).count == 6236, reciters.count == 20,
      (1...606).allSatisfy({
        FileManager.default.fileExists(
          atPath: root.appendingPathComponent(String(format: "Pages/%03d.svgz", $0)).path)
      })
    else { throw CocoaError(.fileReadCorruptFile) }
    byPage = Dictionary(grouping: quran.verses, by: \.page)
    byKey = Dictionary(uniqueKeysWithValues: quran.verses.map { ($0.id, $0) })
    juzPages = Dictionary(grouping: quran.verses, by: \.juz).mapValues { $0.map(\.page).min() ?? 1 }
  }

  func pageURL(_ page: Int) -> URL {
    root.appendingPathComponent(String(format: "Pages/%03d.svgz", page))
  }
  func surah(_ number: Int) -> Surah { quran.surahs[min(113, max(0, number - 1))] }
  func verses(_ page: Int) -> [Verse] { byPage[page] ?? [] }
  func search(_ query: String) -> [Verse] {
    let term = Self.normalized(query.trimmingCharacters(in: .whitespacesAndNewlines))
    guard !term.isEmpty else { return [] }
    return Array(
      quran.verses.lazy.filter { Self.normalized($0.text).contains(term) || $0.id == term }.prefix(
        150))
  }
  static func normalized(_ value: String) -> String {
    value.folding(
      options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "ar")
    )
    .replacingOccurrences(
      of: "[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED]", with: "", options: .regularExpression
    )
    .replacingOccurrences(of: "[أإآٱ]", with: "ا", options: .regularExpression)
    .replacingOccurrences(of: "ى", with: "ي")
  }
  static func number(_ text: String) -> Double? {
    let value = text.unicodeScalars.map { scalar -> String in
      if let numeric = scalar.properties.numericValue, numeric >= 0, numeric <= 9,
        numeric.rounded() == numeric
      {
        return String(Int(numeric))
      }
      if scalar == "٫" { return "." }
      if scalar == "−" { return "-" }
      return String(scalar)
    }.joined().trimmingCharacters(in: .whitespacesAndNewlines)
    guard let number = Double(value), number.isFinite else { return nil }
    return number
  }
}

actor CityIndex {
  let root: URL
  let codes: [String]
  private var cache: [String: [City]] = [:]
  init(root: URL, codes: [String]) {
    self.root = root
    self.codes = codes
  }
  func search(_ query: String, country: String) throws -> [City] {
    let term = Content.normalized(query.trimmingCharacters(in: .whitespacesAndNewlines))
    guard !term.isEmpty || !country.isEmpty else { return [] }
    var exact: [City] = []
    var prefix: [City] = []
    var partial: [City] = []
    for code in country.isEmpty ? codes : [country] {
      try Task.checkCancellation()
      let cities: [City]
      if let saved = cache[code] {
        cities = saved
      } else {
        cities = try JSONDecoder().decode(
          [City].self, from: Data(contentsOf: root.appendingPathComponent("Cities/\(code).json")))
        cache[code] = cities
      }
      for city in cities {
        let names = [city.name, city.arabicName ?? "", city.asciiName ?? ""].map(Content.normalized)
        if term.isEmpty || names.contains(term) {
          if exact.count < 80 { exact.append(city) }
        } else if names.contains(where: { $0.hasPrefix(term) }) {
          if prefix.count < 80 { prefix.append(city) }
        } else if names.contains(where: { $0.contains(term) }) {
          if partial.count < 80 { partial.append(city) }
        }
      }
    }
    return Array((exact + prefix + partial).prefix(80))
  }
}
