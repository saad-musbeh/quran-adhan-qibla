import Foundation

@main
struct CompactPageChecks {
  static func main() throws {
    let pages = URL(fileURLWithPath: CommandLine.arguments[1])
    let fixtures = URL(fileURLWithPath: CommandLine.arguments[2])
    for number in 1...606 {
      let name = String(format: "%03d", number)
      let decoded = try CompactPageData.decode(contentsOf: pages.appendingPathComponent(name + ".svgz"))
      guard let svg = String(data: decoded, encoding: .utf8), svg.contains("<svg "), svg.contains("</svg>") else {
        fatalError("Invalid decoded page \(number)")
      }
      if [1, 3, 604, 606].contains(number) {
        let expected = try Data(contentsOf: fixtures.appendingPathComponent(name + ".svg"))
        precondition(decoded == expected, "Swift decoder must reproduce the exact page bytes")
      }
    }
    let valid = try Data(contentsOf: pages.appendingPathComponent("003.svgz"))
    try reject(Data(), "empty input")
    try reject(Data(valid.dropLast(4)), "truncated gzip")
    var corrupt = valid
    corrupt[corrupt.count - 8] ^= 0xff
    try reject(corrupt, "CRC mismatch")
    try reject(valid + valid, "concatenated pages")
    try reject(valid + Data([0]), "trailing garbage")
    try reject(valid, "decompressed size limit", limit: 100)
    print("Compact page checks passed: 606 SVG pages decoded, exact-byte fixtures, and invalid/oversized gzip rejection.")
  }

  static func reject(_ bytes: Data, _ label: String, limit: Int = 8 * 1024 * 1024) throws {
    do {
      _ = try CompactPageData.decode(bytes, limit: limit)
    } catch CompactPageData.PageError.invalid { return }
    fatalError("Expected decoder to reject \(label)")
  }
}
