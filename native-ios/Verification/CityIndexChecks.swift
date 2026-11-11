import Foundation
import SQLite3

@main
struct CityIndexChecks {
  static func main() async throws {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: root) }
    var db: OpaquePointer?
    precondition(sqlite3_open(root.appendingPathComponent("cities.db").path, &db) == SQLITE_OK)
    defer { sqlite3_close(db) }
    func execute(_ sql: String) {
      precondition(sqlite3_exec(db, sql, nil, nil, nil) == SQLITE_OK, "Fixture SQL failed")
    }
    execute("""
      CREATE TABLE cities(id INTEGER PRIMARY KEY, ordinal INTEGER, name TEXT, arabicName TEXT,
        asciiName TEXT, countryCode TEXT, latitude REAL, longitude REAL, timeZone TEXT);
      CREATE INDEX cities_country ON cities(countryCode,ordinal);
      INSERT INTO cities VALUES(1,0,'Cairo','القاهرة',NULL,'EG',30.0444,31.2357,'Africa/Cairo');
      INSERT INTO cities VALUES(2,1,'Cairo Heights',NULL,NULL,'EG',30,31,NULL);
      INSERT INTO cities VALUES(3,2,'New Cairo',NULL,NULL,'EG',30,31,NULL);
      INSERT INTO cities VALUES(4,3,'Cairo',NULL,NULL,'US',37,-89,NULL);
      INSERT INTO cities VALUES(5,4,'São Paulo',NULL,'Sao Paulo','BR',-23.55,-46.63,'America/Sao_Paulo');
      """)
    let index = CityIndex(root: root, codes: ["US", "EG", "BR"])
    let all = try await index.search("cAiRo", country: "")
    precondition(all.map(\.id) == [4, 1, 2, 3], "Exact, prefix and partial ranks preserve country/source ordering")
    let country = try await index.search("", country: "EG")
    precondition(country.map(\.id) == [1, 2, 3])
    precondition(country[0].latitude == 30.0444 && country[0].longitude == 31.2357)
    precondition(country[0].timeZone == "Africa/Cairo" && country[1].timeZone == nil)
    let arabic = try await index.search(" الْقَاهِرَة ", country: "EG")
    precondition(arabic.map(\.id) == [1], "Arabic aliases and diacritics are preserved")
    let accent = try await index.search("sao paulo", country: "BR")
    precondition(accent.map(\.id) == [5], "Accents and ASCII aliases are preserved")
    let empty = try await index.search("", country: "")
    precondition(empty.isEmpty)
    let unknown = try await index.search("Cairo", country: "XX")
    precondition(unknown.isEmpty)
    let literal = try await index.search("' OR 1=1 --", country: "EG")
    precondition(literal.isEmpty, "Search text is never executable SQL")

    execute("UPDATE cities SET name='Changed' WHERE id=1")
    let fresh = try await index.search("Changed", country: "EG")
    precondition(fresh.map(\.id) == [1], "Searches read disk instead of retaining decoded country arrays")
    for id in 6...105 {
      execute("INSERT INTO cities VALUES(\(id),\(id),'Cairo',NULL,NULL,'EG',30,31,NULL)")
    }
    let capped = try await index.search("Cairo", country: "EG")
    precondition(capped.count == 80 && capped.allSatisfy { $0.name == "Cairo" }, "Exact results outrank earlier partials and stay bounded")
    let cancelled = Task {
      try? await Task.sleep(nanoseconds: 20_000_000)
      return try await index.search("Cairo", country: "")
    }
    cancelled.cancel()
    do {
      _ = try await cancelled.value
      fatalError("Expected cancelled search")
    } catch is CancellationError { }
    print("SQLite city search checks passed: ranking, provenance fields, Arabic/ASCII aliases, result limits, fresh reads and cancellation.")
  }
}
