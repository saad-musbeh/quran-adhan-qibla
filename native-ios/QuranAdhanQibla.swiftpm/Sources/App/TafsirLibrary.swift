import CryptoKit
import Foundation
import SwiftUI

#if canImport(zlib)
  import zlib
#endif

public struct TafsirEdition: Codable, Identifiable, Hashable, Sendable {
  public let id: String
  public let title: String
  public let publisher: String
  public let version: String
  public let url: String
  public let apiKey: String
  public let apiKind: String?
  public let language: String?
  public let sourceName: String?
  public let allowedEmptyVerseKeys: [String]?
  public let allowEmptyRows: Bool?
  public let firstPublicationHijri: Int?
  public let publicationSource: String?
  public let firstDigitalPublication: String
  public let sourceEdition: String?
  public let author: String?
  public let shortTitle: String?
  public let editionHijri: Int?
  public let compositionHijri: Int?
  public let compositionSource: String?
  public let digitalDateIsRelease: Bool?
  public let dump: Dump?
  public struct Dump: Codable, Hashable, Sendable {
    public let url: String
    public let sha256: String
    public let bytes: Int
    public let decodedBytes: Int
    public let bookId: Int
    public let rows: Int
    public let sourceVersion: String
    public let originalUrl: String
    public let originalSha256: String
    public let licenseSource: String?
  }
  public var isArabic: Bool { (language ?? "ar") == "ar" }
  public var displayTitle: String { shortTitle ?? title }
}

public struct TafsirPassage: Hashable, Sendable {
  public let text: String
  public let footnotes: String?
  public let start: Int?
  public let end: Int?
}

@MainActor public final class TafsirLibrary: ObservableObject {
  @Published public private(set) var editions: [TafsirEdition] = []
  @Published public var selectedID: String = "" {
    didSet {
      guard selectedID != oldValue else { return }
      passages = [:]
      isLoading = false
      selectionRevision += 1
      let revision = selectionRevision
      guard installedIDs.contains(selectedID), let book = edition(selectedID) else { return }
      isLoading = true
      let file = path(book)
      let verseCounts = counts
      Task {
        let result = await Task.detached(priority: .userInitiated) {
          Result { try Self.readPassages(book: book, url: file, counts: verseCounts) }
        }.value
        guard revision == self.selectionRevision, self.selectedID == book.id else { return }
        self.isLoading = false
        switch result {
        case .success(let loaded):
          self.passages = loaded
          self.error = nil
        case .failure(let failure): self.error = failure.localizedDescription
        }
      }
    }
  }
  @Published public private(set) var installedIDs: Set<String> = []
  @Published public private(set) var progress: Double?
  @Published public private(set) var busyID: String?
  @Published public private(set) var isLoading = false
  private var selectionRevision = 0
  @Published public var error: String?
  private let root: URL
  private let counts: [Int]
  private var passages: [String: TafsirPassage] = [:]
  private var task: Task<Void, Never>?
  private var generation = 0
  private struct Envelope: Codable, Sendable {
    let schema: Int
    let book: Identity
    let records: [Record]?
    let chapters: [[RangeRecord]]?
    let compressed: String?
    let sha256: String?
  }
  private struct Identity: Codable, Equatable, Sendable {
    let id, title, publisher, version, url: String
  }
  private struct Record: Codable, Sendable {
    let sura: IntOrString
    let aya: IntOrString
    let arabic_text: String?
    let translation: String
    let footnotes: String?
  }
  private enum IntOrString: Codable, Sendable {
    case int(Int)
    case string(String)
    init(from d: Decoder) throws {
      let c = try d.singleValueContainer()
      if let n = try? c.decode(Int.self) {
        self = .int(n)
      } else {
        self = .string(try c.decode(String.self))
      }
    }
    var int: Int {
      switch self {
      case .int(let n): return n
      case .string(let s): return Int(s) ?? -1
      }
    }
    func encode(to e: Encoder) throws {
      var c = e.singleValueContainer()
      try c.encode(int)
    }
  }
  private struct RangeRecord: Codable, Sendable {
    let id: Int
    let sura: Int
    let from_aya: Int
    let to_aya: Int
    let type: String
    let text: String
  }
  private struct Dump: Decodable {
    struct License: Decodable {
      let source: String
      let version: String
    }
    struct Book: Decodable {
      struct Language: Decodable { let code: String }
      let id: Int
      let language: Language
    }
    struct Source: Decodable {
      let url: String
      let sha256: String
      let version: String
    }
    struct Ayah: Decodable {
      struct Part: Decodable { let textIndex: Int }
      let surah: Int
      let ayah: Int
      let content: [Part]
    }
    let license: License
    let book: Book
    let schema: String
    let source: Source
    let texts: [String]
    let ayahs: [Ayah]
  }
  public init(catalogueURL: URL, root: URL, verseCounts: [Int]) throws {
    self.root = root
    self.counts = verseCounts
    let data = try Data(contentsOf: catalogueURL)
    let decoded = try JSONDecoder().decode([TafsirEdition].self, from: data)
    guard decoded.count == 36, Set(decoded.map(\.id)).count == decoded.count,
      verseCounts.count == 114, verseCounts.reduce(0, +) == 6236
    else { throw LibraryError.invalid("Tafsir catalogue or Quran verse index is invalid.") }
    editions = decoded
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    for book in decoded {
      let file = path(book)
      if let valid = try? loadEnvelope(file, book), valid { installedIDs.insert(book.id) }
    }
    passages = [:]
  }
  private enum LibraryError: LocalizedError {
    case invalid(String)
    var errorDescription: String? {
      switch self { case .invalid(let message): return message }
    }
  }
  private func path(_ e: TafsirEdition) -> URL { root.appendingPathComponent(e.id + ".json") }
  private func edition(_ id: String) -> TafsirEdition? { editions.first { $0.id == id } }
  private func identity(_ e: TafsirEdition) -> Identity {
    Identity(id: e.id, title: e.title, publisher: e.publisher, version: e.version, url: e.url)
  }
  private func loadEnvelope(_ url: URL, _ book: TafsirEdition) throws -> Bool {
    let e = try JSONDecoder().decode(Envelope.self, from: Data(contentsOf: url))
    let schema = book.dump != nil ? 3 : ((book.apiKind ?? "translation") == "tafsir" ? 2 : 1)
    return e.book == identity(book) && e.schema == schema
      && (schema == 1
        ? e.records != nil
        : schema == 2 ? e.chapters != nil : e.compressed != nil && e.sha256 != nil)
  }
  public func text(surah: Int, verse: Int) -> TafsirPassage? { passages["\(surah):\(verse)"] }
  public func cancel() {
    generation += 1
    task?.cancel()
    task = nil
    busyID = nil
    progress = nil
  }
  public func remove(_ edition: TafsirEdition) {
    guard busyID != edition.id else { return }
    try? FileManager.default.removeItem(at: path(edition))
    installedIDs.remove(edition.id)
    if selectedID == edition.id {
      selectedID = ""
      passages = [:]
    }
  }
  public func download(_ edition: TafsirEdition) {
    guard busyID == nil, editions.contains(edition) else { return }
    generation += 1
    let token = generation
    busyID = edition.id
    error = nil
    progress = 0
    task = Task {
      do {
        let env = try await Self.fetch(edition, counts: counts) { [weak self] p in
          Task { @MainActor in if self?.generation == token { self?.progress = p } }
        }
        try Task.checkCancellation()
        let verseCounts = counts
        let validated = try await Task.detached(priority: .userInitiated) {
          try Self.index(env, book: edition, counts: verseCounts)
        }.value
        let data = try JSONEncoder().encode(env)
        let temp = root.appendingPathComponent(".\(edition.id).\(UUID().uuidString).part")
        defer { try? FileManager.default.removeItem(at: temp) }
        try data.write(to: temp, options: .atomic)
        try Task.checkCancellation()
        let final = path(edition)
        if FileManager.default.fileExists(atPath: final.path) {
          _ = try FileManager.default.replaceItemAt(final, withItemAt: temp)
        } else {
          try FileManager.default.moveItem(at: temp, to: final)
        }
        installedIDs.insert(edition.id)
        if selectedID.isEmpty { selectedID = edition.id }
        if selectedID == edition.id {
          passages = validated
          isLoading = false
        }
        progress = 1
      } catch is CancellationError {} catch {
        if generation == token { self.error = error.localizedDescription }
      }
      if generation == token {
        busyID = nil
        task = nil
        progress = nil
      }
    }
  }
  private func loadPassages(_ book: TafsirEdition) throws -> [String: TafsirPassage] {
    let result = try Self.readPassages(book: book, url: path(book), counts: counts)
    passages = result
    return result
  }
  private nonisolated static func readPassages(book: TafsirEdition, url: URL, counts: [Int]) throws
    -> [String: TafsirPassage]
  {
    let e: Envelope
    do { e = try JSONDecoder().decode(Envelope.self, from: Data(contentsOf: url)) } catch {
      throw LibraryError.invalid(
        "Saved tafsir data for \(book.title) is unreadable. Remove it and download again.")
    }
    guard
      e.book
        == Identity(
          id: book.id, title: book.title, publisher: book.publisher, version: book.version,
          url: book.url)
    else { throw LibraryError.invalid("Saved edition identity differs from catalogue.") }
    return try index(e, book: book, counts: counts)
  }
  private nonisolated static func fetch(
    _ book: TafsirEdition, counts: [Int], onProgress: @escaping (Double) -> Void
  ) async throws -> Envelope {
    if let dump = book.dump {
      let (data, response) = try await URLSession.shared.data(from: URL(string: dump.url)!)
      guard (response as? HTTPURLResponse)?.statusCode == 200, data.count == dump.bytes,
        SHA256.hash(data: data).map({ String(format: "%02x", $0) }).joined() == dump.sha256
      else { throw LibraryError.invalid("Tafsir archive checksum or size failed.") }
      let decoded = try gunzip(data, limit: dump.decodedBytes)
      guard decoded.count == dump.decodedBytes else {
        throw LibraryError.invalid("Tafsir archive decoded size failed.")
      }
      let d = try JSONDecoder().decode(Dump.self, from: decoded)
      guard validDump(d, book: book, counts: counts) else {
        throw LibraryError.invalid("Tafsir archive metadata or index failed.")
      }
      onProgress(0.8)
      return Envelope(
        schema: 3,
        book: Identity(
          id: book.id, title: book.title, publisher: book.publisher, version: book.version,
          url: book.url), records: nil, chapters: nil, compressed: data.base64EncodedString(),
        sha256: dump.sha256)
    }
    let (catalogueData, catalogueResponse) = try await URLSession.shared.data(
      from: URL(string: "https://quranenc.com/ar/home")!)
    guard (catalogueResponse as? HTTPURLResponse)?.statusCode == 200 else {
      throw LibraryError.invalid("Could not verify the QuranEnc release.")
    }
    let html = String(decoding: catalogueData, as: UTF8.self)
    let href = "/ar/browse/\(book.apiKey)"
    guard let link = html.range(of: href),
      let cardStart = html[..<link.lowerBound].range(
        of: "<div class=\"tab_card ", options: .backwards)
    else {
      throw LibraryError.invalid("Could not find \(book.title) in QuranEnc's current catalogue.")
    }
    let card = String(html[cardStart.lowerBound..<link.lowerBound])
    let releasePattern = "(\\d{2})/(\\d{2})/(\\d{4})\\s*-\\s*V([\\d.]+)"
    let pinnedPattern = "^V?([\\d.]+)\\s*\\(([0-9]{4})-([0-9]{2})-([0-9]{2})\\)$"
    let releaseRegex = try NSRegularExpression(pattern: releasePattern)
    let pinnedRegex = try NSRegularExpression(pattern: pinnedPattern)
    let cardNSString = card as NSString
    let versionNSString = book.version as NSString
    let cardRange = NSRange(location: 0, length: cardNSString.length)
    let versionRange = NSRange(location: 0, length: versionNSString.length)
    guard let release = releaseRegex.firstMatch(in: card, range: cardRange),
      let pinned = pinnedRegex.firstMatch(in: book.version, range: versionRange),
      release.numberOfRanges == 5, pinned.numberOfRanges == 5
    else {
      throw LibraryError.invalid("Release metadata for \(book.title) is not pinned in this app.")
    }
    let actual = (1...4).map { cardNSString.substring(with: release.range(at: $0)) }
    let expected = [
      pinnedNSString(versionNSString, pinned, 4), pinnedNSString(versionNSString, pinned, 3),
      pinnedNSString(versionNSString, pinned, 2), pinnedNSString(versionNSString, pinned, 1),
    ]
    guard actual == expected else {
      throw LibraryError.invalid(
        "QuranEnc has a newer release of \(book.title). Update the app's pinned metadata before downloading."
      )
    }
    var chapters = [[RangeRecord]]()
    var records = [Record]()
    for s in 1...114 {
      try Task.checkCancellation()
      let kind = book.apiKind ?? "translation"
      let url = URL(string: "https://quranenc.com/api/v1/\(kind)/sura/\(book.apiKey)/\(s)")!
      let (data, response) = try await URLSession.shared.data(from: url)
      guard (response as? HTTPURLResponse)?.statusCode == 200,
        let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any],
        let rows = obj["result"]
      else { throw LibraryError.invalid("QuranEnc download failed at surah \(s).") }
      if kind == "tafsir" {
        let raw = try JSONSerialization.data(withJSONObject: rows)
        let rows = try JSONDecoder().decode([RangeRecord].self, from: raw)
        guard
          validRange(rows, surah: s, count: counts[s - 1], allowEmpty: book.allowEmptyRows == true)
        else { throw LibraryError.invalid("Invalid tafsir passage coverage.") }
        chapters.append(rows)
      } else {
        let raw = try JSONSerialization.data(withJSONObject: rows)
        let rows = try JSONDecoder().decode([Record].self, from: raw)
        guard rows.count == counts[s - 1],
          rows.enumerated().allSatisfy({
            $0.element.sura.int == s && $0.element.aya.int == $0.offset + 1
              && $0.element.arabic_text?.isEmpty == false
              && (!$0.element.translation.isEmpty
                || book.allowedEmptyVerseKeys?.contains("\(s):\($0.offset+1)") == true)
          })
        else { throw LibraryError.invalid("Invalid QuranEnc verse coverage.") }
        records += rows
      }
      onProgress(Double(s) / 114 * 0.8)
    }
    return Envelope(
      schema: book.apiKind == "tafsir" ? 2 : 1,
      book: Identity(
        id: book.id, title: book.title, publisher: book.publisher, version: book.version,
        url: book.url), records: records.isEmpty ? nil : records,
      chapters: chapters.isEmpty ? nil : chapters, compressed: nil, sha256: nil)
  }
  private nonisolated static func validDump(_ d: Dump, book: TafsirEdition, counts: [Int]) -> Bool {
    guard let pin = book.dump, d.license.source == (pin.licenseSource ?? "https://quranpedia.net"),
      d.license.version == pin.sourceVersion, d.book.id == pin.bookId,
      d.book.language.code == (book.language ?? "ar"),
      d.schema == (book.apiKind == "archive" ? "tafsir-text-v1" : "quranpedia-text-v1"),
      d.source.url == pin.originalUrl, d.source.sha256 == pin.originalSha256,
      d.source.version == pin.sourceVersion, !d.texts.isEmpty, d.ayahs.count == pin.rows
    else { return false }
    var seen = Set<String>()
    return d.ayahs.allSatisfy { row in
      row.surah >= 1 && row.surah <= counts.count && row.ayah >= 1
        && row.ayah <= counts[row.surah - 1] && !row.content.isEmpty
        && row.content.allSatisfy { $0.textIndex >= 0 && $0.textIndex < d.texts.count }
        && seen.insert("\(row.surah):\(row.ayah)").inserted
    }
  }
  private nonisolated static func pinnedNSString(
    _ value: NSString, _ match: NSTextCheckingResult, _ group: Int
  ) -> String { value.substring(with: match.range(at: group)) }
  private nonisolated static func validRange(
    _ rows: [RangeRecord], surah: Int, count: Int, allowEmpty: Bool
  ) -> Bool {
    guard !rows.isEmpty,
      rows.allSatisfy({
        $0.sura == surah && $0.from_aya >= 0 && $0.to_aya >= $0.from_aya && $0.to_aya <= count
          && ($0.from_aya != 0 || $0.to_aya == 0) && !$0.type.isEmpty
          && (allowEmpty || !$0.text.isEmpty)
      })
    else { return false }
    var next = 1
    var previousStart = 0
    for row in rows where row.type == "المقطع" {
      if row.from_aya > next || row.from_aya < previousStart || row.from_aya < 1 { return false }
      next = max(next, row.to_aya + 1)
      previousStart = row.from_aya
    }
    return next == count + 1
  }
  private nonisolated static func index(_ e: Envelope, book: TafsirEdition, counts: [Int]) throws
    -> [String: TafsirPassage]
  {
    var result = [String: TafsirPassage]()
    let expectedSchema =
      book.dump != nil ? 3 : ((book.apiKind ?? "translation") == "tafsir" ? 2 : 1)
    guard e.schema == expectedSchema else {
      throw LibraryError.invalid("Saved tafsir schema does not match this edition.")
    }
    if e.schema == 1, let rows = e.records {
      guard rows.count == counts.reduce(0, +) else {
        throw LibraryError.invalid("Saved QuranEnc coverage mismatch.")
      }
      var offset = 0
      for surah in 1...114 {
        for verse in 1...counts[surah - 1] {
          let r = rows[offset]
          guard r.sura.int == surah, r.aya.int == verse, r.arabic_text?.isEmpty == false,
            !r.translation.isEmpty
              || book.allowedEmptyVerseKeys?.contains("\(surah):\(verse)") == true
          else { throw LibraryError.invalid("Saved QuranEnc record validation failed.") }
          offset += 1
        }
      }
      for r in rows where !r.translation.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
        result["\(r.sura.int):\(r.aya.int)"] = TafsirPassage(
          text: safeText(r.translation), footnotes: r.footnotes.map(safeText), start: nil, end: nil)
      }
      return result
    }
    if e.schema == 2, let chapters = e.chapters {
      guard chapters.count == 114 else {
        throw LibraryError.invalid("Saved tafsir passage coverage mismatch.")
      }
      for (index, rows) in chapters.enumerated() {
        guard
          validRange(
            rows, surah: index + 1, count: counts[index], allowEmpty: book.allowEmptyRows == true)
        else { throw LibraryError.invalid("Saved tafsir passage validation failed.") }
        let starts = rows.indices.filter { rows[$0].type == "المقطع" }
        for (b, i) in starts.enumerated() {
          let p = rows[i]
          let group = Array(
            rows[(b == 0 ? 0 : i)..<(b + 1 < starts.count ? starts[b + 1] : rows.count)])
          if book.allowEmptyRows == true
            && !group.contains(where: {
              $0.type != "المقطع" && !$0.text.trimmingCharacters(in: .whitespaces).isEmpty
            })
          {
            continue
          }
          let text = group.map { $0.text }.joined(separator: "\n\n")
          for v in p.from_aya...p.to_aya where v > 0 {
            let key = "\(p.sura):\(v)"
            let previous = result[key]
            result[key] = TafsirPassage(
              text: (previous?.text ?? "") + (previous == nil ? "" : "\n\n") + safeText(text),
              footnotes: nil, start: min(previous?.start ?? p.from_aya, p.from_aya),
              end: max(previous?.end ?? p.to_aya, p.to_aya))
          }
        }
      }
      return result
    }
    if e.schema == 3, let compressed = e.compressed, let d = book.dump {
      guard e.sha256 == d.sha256, let bytes = Data(base64Encoded: compressed),
        bytes.count == d.bytes
      else { throw LibraryError.invalid("Saved archive encoding or pinned size is invalid.") }
      guard SHA256.hash(data: bytes).map({ String(format: "%02x", $0) }).joined() == d.sha256 else {
        throw LibraryError.invalid("Saved checksum mismatch.")
      }
      let decoded = try gunzip(bytes, limit: d.decodedBytes)
      guard decoded.count == d.decodedBytes else {
        throw LibraryError.invalid("Saved archive decoded size mismatch.")
      }
      let dump = try JSONDecoder().decode(Dump.self, from: decoded)
      guard validDump(dump, book: book, counts: counts) else {
        throw LibraryError.invalid("Saved archive metadata or coverage mismatch.")
      }
      var grouped = [String: TafsirPassage]()
      for a in dump.ayahs {
        let ids = a.content.map { String($0.textIndex) }.joined(separator: ",")
        let passage =
          grouped[ids]
          ?? TafsirPassage(
            text: safeText(a.content.map { dump.texts[$0.textIndex] }.joined(separator: "\n\n")),
            footnotes: nil, start: nil, end: nil)
        grouped[ids] = passage
        if !passage.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
          result["\(a.surah):\(a.ayah)"] = passage
        }
      }
      return result
    }
    throw LibraryError.invalid("Saved tafsir format is unsupported.")
  }
  private nonisolated static func safeText(_ input: String) -> String {
    var text = input.replacingOccurrences(
      of: "<(script|style)\\b[^>]*>.*?</\\1\\s*>", with: "",
      options: [.regularExpression, .caseInsensitive])
    text = text.replacingOccurrences(
      of: "<br\\s*/?>", with: "\n", options: [.regularExpression, .caseInsensitive]
    ).replacingOccurrences(
      of: "</(p|div|li|tr|h[1-6])\\s*>", with: "\n",
      options: [.regularExpression, .caseInsensitive])
    text = text.replacingOccurrences(of: "<[^>]*>", with: "", options: .regularExpression)
    let entities: [String: String] = [
      "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'",
      "&apos;": "'",
    ]
    for (entity, value) in entities {
      text = text.replacingOccurrences(of: entity, with: value, options: .caseInsensitive)
    }
    if let regex = try? NSRegularExpression(pattern: "&#(?:x([0-9a-fA-F]+)|([0-9]+));") {
      let ns = text as NSString
      for match in regex.matches(in: text, range: NSRange(location: 0, length: ns.length))
        .reversed()
      {
        let hex = match.range(at: 1).location != NSNotFound
        let raw = ns.substring(with: match.range(at: hex ? 1 : 2))
        let value = hex ? UInt32(raw, radix: 16) : UInt32(raw)
        if let value, let scalar = UnicodeScalar(value) {
          text = (text as NSString).replacingCharacters(in: match.range, with: String(scalar))
        }
      }
    }
    return text
  }
  private nonisolated static func gunzip(_ data: Data, limit: Int) throws -> Data {
    #if canImport(zlib)
      var stream = z_stream()
      let initCode = inflateInit2_(
        &stream, 15 + 32, ZLIB_VERSION, Int32(MemoryLayout<z_stream>.size))
      guard initCode == Z_OK else { throw LibraryError.invalid("Cannot initialize gzip decoder.") }
      defer { inflateEnd(&stream) }
      var output = Data()
      let chunk = 64 * 1024
      let bytes = [UInt8](data)
      let status: Int32 = bytes.withUnsafeBytes { input in
        stream.next_in = UnsafeMutablePointer<Bytef>(
          mutating: input.bindMemory(to: Bytef.self).baseAddress!)
        stream.avail_in = uInt(bytes.count)
        var code: Int32 = Z_OK
        while code == Z_OK {
          var buffer = [UInt8](repeating: 0, count: chunk)
          let n = buffer.withUnsafeMutableBytes { out -> Int in
            stream.next_out = out.bindMemory(to: Bytef.self).baseAddress!
            stream.avail_out = uInt(chunk)
            code = inflate(&stream, Z_NO_FLUSH)
            return chunk - Int(stream.avail_out)
          }
          if n > 0 {
            output.append(contentsOf: buffer.prefix(n))
            if output.count > limit {
              code = Z_MEM_ERROR
              break
            }
          }
        }
        return code
      }
      guard status == Z_STREAM_END, output.count == limit else {
        throw LibraryError.invalid("Gzip archive is invalid or exceeds its pinned size.")
      }
      return output
    #else
      throw LibraryError.invalid("Gzip decoding is unavailable.")
    #endif
  }
}
