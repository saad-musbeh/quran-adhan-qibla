import Foundation

@main
struct ResourceLocatorChecks {
  static func main() throws {
    let manager = FileManager.default
    let temporary = manager.temporaryDirectory.appendingPathComponent("resource-locator-check-\(UUID().uuidString)", isDirectory: true)
    try manager.createDirectory(at: temporary, withIntermediateDirectories: true)
    defer { try? manager.removeItem(at: temporary) }

    let direct = temporary.appendingPathComponent("direct", isDirectory: true)
    try writeFixture(at: direct.appendingPathComponent("Resources", isDirectory: true))
    try expect(ResourceLocator.resolve(in: [direct]) == direct.appendingPathComponent("Resources", isDirectory: true), "direct Resources folder")

    let nested = temporary.appendingPathComponent("nested", isDirectory: true)
    let bundle = nested.appendingPathComponent("Payload.bundle", isDirectory: true)
    try writeFixture(at: bundle.appendingPathComponent("Resources", isDirectory: true))
    try Data("<?xml version=\"1.0\"?><plist version=\"1.0\"><dict/></plist>".utf8).write(to: bundle.appendingPathComponent("Info.plist"))
    try expect(ResourceLocator.resolve(in: [nested]) == bundle.appendingPathComponent("Resources", isDirectory: true), "nested .bundle/Resources")

    let flattened = temporary.appendingPathComponent("flattened", isDirectory: true)
    try writeFixture(at: flattened)
    try expect(ResourceLocator.resolve(in: [flattened]) == flattened, "flattened resource root")

    let incomplete = temporary.appendingPathComponent("incomplete", isDirectory: true)
    try manager.createDirectory(at: incomplete.appendingPathComponent("Resources", isDirectory: true), withIntermediateDirectories: true)
    try write("fixture", to: incomplete.appendingPathComponent("Resources/quran.json"))
    try expectMissing { try ResourceLocator.resolve(in: [incomplete]) }

    let first = temporary.appendingPathComponent("ambiguous-first", isDirectory: true)
    let second = temporary.appendingPathComponent("ambiguous-second", isDirectory: true)
    let firstResources = first.appendingPathComponent("Resources", isDirectory: true)
    try writeFixture(at: firstResources)
    try writeFixture(at: first)
    try writeFixture(at: second)
    for _ in 0..<5 {
      try expect(ResourceLocator.resolve(in: [first, second]) == firstResources, "ambiguous roots resolve by input and candidate order")
    }

    try expectMissing { try ResourceLocator.resolve(in: [temporary.appendingPathComponent("missing", isDirectory: true)]) }
    print("ResourceLocator checks passed: direct, bundle, flattened, incomplete, ambiguous, and missing layouts.")
  }

  private static func writeFixture(at root: URL) throws {
    let manager = FileManager.default
    try manager.createDirectory(at: root.appendingPathComponent("Pages", isDirectory: true), withIntermediateDirectories: true)
    for name in ["quran.json", "reciters.json", "tafsir-catalogue.json", "Pages/001.svgz"] {
      try write("fixture", to: root.appendingPathComponent(name))
    }
  }

  private static func write(_ value: String, to url: URL) throws {
    try Data(value.utf8).write(to: url)
  }

  private static func expect(_ condition: @autoclosure () throws -> Bool, _ label: String) throws {
    guard try condition() else { throw CheckFailure(message: "Failed: \(label)") }
  }

  private static func expectMissing(_ operation: () throws -> URL) throws {
    do { _ = try operation(); throw CheckFailure(message: "Expected missing resources to throw") }
    catch is ResourceLocator.MissingResources { return }
  }

  private struct CheckFailure: Error { let message: String }
}
