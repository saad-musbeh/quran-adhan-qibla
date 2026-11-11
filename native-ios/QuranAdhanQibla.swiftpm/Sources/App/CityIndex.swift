import Foundation
import SQLite3

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
}

enum SearchText {
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
}

/// Stream the pinned catalogue from disk. No decoded country arrays survive a search.
actor CityIndex {
  let root: URL
  let codes: [String]

  init(root: URL, codes: [String]) { self.root = root; self.codes = codes }

  func search(_ query: String, country: String) throws -> [City] {
    try Task.checkCancellation()
    let term = SearchText.normalized(query.trimmingCharacters(in: .whitespacesAndNewlines))
    guard !term.isEmpty || !country.isEmpty else { return [] }
    guard country.isEmpty || codes.contains(country) else { return [] }
    var connection: OpaquePointer?
    let opened = sqlite3_open_v2(root.appendingPathComponent("cities.db").path, &connection,
      SQLITE_OPEN_READONLY | SQLITE_OPEN_NOMUTEX, nil)
    defer { if let connection { sqlite3_close(connection) } }
    guard opened == SQLITE_OK, let connection else { throw CocoaError(.fileReadCorruptFile) }
    guard sqlite3_exec(connection,
      "PRAGMA cache_size=-512; PRAGMA mmap_size=0; PRAGMA temp_store=FILE;", nil, nil, nil) == SQLITE_OK
    else { throw CocoaError(.fileReadCorruptFile) }
    var statement: OpaquePointer?
    let sql = """
      SELECT id,name,arabicName,asciiName,countryCode,latitude,longitude,timeZone
      FROM cities WHERE countryCode=? ORDER BY ordinal
      """
    guard sqlite3_prepare_v2(connection, sql, -1, &statement, nil) == SQLITE_OK, let statement
    else { throw CocoaError(.fileReadCorruptFile) }
    defer { sqlite3_finalize(statement) }
    var exact: [City] = [], prefix: [City] = [], partial: [City] = []
    for code in country.isEmpty ? codes : [country] {
      try Task.checkCancellation()
      sqlite3_reset(statement)
      let bound = code.withCString {
        sqlite3_bind_text(statement, 1, $0, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
      }
      guard bound == SQLITE_OK else { throw CocoaError(.fileReadCorruptFile) }
      while true {
        try Task.checkCancellation()
        let status = sqlite3_step(statement)
        if status == SQLITE_DONE { break }
        guard status == SQLITE_ROW else { throw CocoaError(.fileReadCorruptFile) }
        // Foundation normalization creates temporary objects; drain them per row.
        autoreleasepool {
          func text(_ column: Int32) -> String? {
            guard let value = sqlite3_column_text(statement, column) else { return nil }
            return String(cString: value)
          }
          let city = City(id: Int(sqlite3_column_int64(statement, 0)), name: text(1) ?? "",
            arabicName: text(2), asciiName: text(3), countryCode: text(4) ?? "",
            latitude: sqlite3_column_double(statement, 5), longitude: sqlite3_column_double(statement, 6),
            timeZone: text(7))
          let names = [city.name, city.arabicName ?? "", city.asciiName ?? ""].map(SearchText.normalized)
          if term.isEmpty || names.contains(term) {
            if exact.count < 80 { exact.append(city) }
          } else if names.contains(where: { $0.hasPrefix(term) }) {
            if prefix.count < 80 { prefix.append(city) }
          } else if names.contains(where: { $0.contains(term) }) {
            if partial.count < 80 { partial.append(city) }
          }
        }
        // Exact matches already fill the result; later ranks cannot displace them.
        if exact.count == 80 { return exact }
      }
    }
    return Array((exact + prefix + partial).prefix(80))
  }
}
