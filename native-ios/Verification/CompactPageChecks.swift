import Foundation
import CryptoKit

@main
struct CompactPageChecks {
  static func main() throws {
    let pages = URL(fileURLWithPath: CommandLine.arguments[1])
    struct Manifest: Decodable { let renderedSvgSha256: [String: String] }
    let manifest = try JSONDecoder().decode(Manifest.self,
      from: Data(contentsOf: pages.deletingLastPathComponent().appendingPathComponent("swift-port-assets.json")))
    let start = Date()
    for number in 1...606 {
      let name = String(format: "%03d", number)
      let decoded = try CompactPageData.decode(contentsOf: pages.appendingPathComponent(name + ".svg.xz"))
      guard let svg = String(data: decoded, encoding: .utf8), svg.contains("<svg "), svg.contains("</svg>") else {
        fatalError("Invalid decoded page \(number)")
      }
      let hash = SHA256.hash(data: decoded).map { String(format: "%02x", $0) }.joined()
      precondition(hash == manifest.renderedSvgSha256[name + ".svg"], "Page \(number) differs from its verified source bytes")
    }
    let valid = try Data(contentsOf: pages.appendingPathComponent("003.svg.xz"))
    try reject(Data(), "empty input")
    for length in [1, 6, 12, valid.count / 2, valid.count - 4, valid.count - 1] {
      try reject(Data(valid.prefix(length)), "truncated XZ at \(length)")
    }
    var corrupt = valid
    corrupt[corrupt.count / 2] ^= 0xff
    try reject(corrupt, "CRC mismatch")
    var footer = valid
    footer[footer.count - 8] ^= 0xff
    try reject(footer, "corrupt footer")
    try reject(valid + valid, "concatenated pages")
    try reject(valid + Data([0]), "trailing garbage")
    try reject(valid, "decompressed size limit", limit: 100)
    try reject(valid, "zero size limit", limit: 0)
    try reject(Data(repeating: 0, count: 2 * 1024 * 1024 + 1), "compressed size limit")
    print("Apple Compression checks passed: all 606 SVG SHA-256 hashes match; damaged, truncated, concatenated and oversized XZ rejected. Total: \(Date().timeIntervalSince(start)) seconds.")
  }

  static func reject(_ bytes: Data, _ label: String, limit: Int = 8 * 1024 * 1024) throws {
    do {
      _ = try CompactPageData.decode(bytes, limit: limit)
    } catch CompactPageData.PageError.invalid { return }
    fatalError("Expected decoder to reject \(label)")
  }
}
