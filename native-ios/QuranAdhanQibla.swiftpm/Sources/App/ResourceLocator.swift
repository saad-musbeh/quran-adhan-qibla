import Foundation

/// Resolve copied resources without invoking SwiftPM's fatal resource accessor.
/// App previews and standalone apps may place the resource bundle differently.
enum ResourceLocator {
  static func locate() throws -> URL {
    let roots = [
      Bundle.main.resourceURL, Bundle.main.bundleURL,
      Bundle.main.bundleURL.deletingLastPathComponent(),
      URL(fileURLWithPath: #filePath).deletingLastPathComponent(),
    ].compactMap { $0 }
    return try resolve(in: roots)
  }

  static func resolve(in roots: [URL], fileManager: FileManager = .default) throws -> URL {
    var candidates: [URL] = []
    var seen = Set<String>()
    func add(_ base: URL) {
      for candidate in [base.appendingPathComponent("OfflineContent", isDirectory: true), base] {
        if seen.insert(candidate.standardizedFileURL.path).inserted { candidates.append(candidate) }
      }
    }
    for root in roots {
      add(root)
      // SwiftPM embeds executable-target resources in a .bundle beside the app.
      for bundle
        in (try? fileManager.contentsOfDirectory(at: root, includingPropertiesForKeys: nil)) ?? []
      where bundle.pathExtension == "bundle" {
        add(bundle)
        if let resourceURL = Bundle(url: bundle)?.resourceURL { add(resourceURL) }
      }
    }
    let required = ["quran.json", "reciters.json", "tafsir-catalogue.json", "Pages/001.svgz"]
    if let found = candidates.first(where: { root in
      required.allSatisfy { fileManager.fileExists(atPath: root.appendingPathComponent($0).path) }
    }) {
      return found
    }
    throw MissingOfflineContent(searched: candidates.map(\.path))
  }

  struct MissingOfflineContent: LocalizedError {
    let searched: [String]
    var errorDescription: String? {
      "موارد التطبيق غير موجودة. افتح المشروع الكامل بعد فك الضغط. / App resources were not found. Open the complete extracted project.\n"
        + searched.joined(separator: "\n")
    }
  }
}
