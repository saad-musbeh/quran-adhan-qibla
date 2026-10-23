import Combine
import Foundation

@MainActor final class AppDiagnostics: ObservableObject {
  static let shared = AppDiagnostics()
  @Published private(set) var lines: [String] = []
  var report: String {
    ([
      "Quran · Adhan · Qibla — Swift 1.0.2 (build 3)",
      "System: \(ProcessInfo.processInfo.operatingSystemVersionString)",
    ] + lines).joined(separator: "\n")
  }

  func record(_ message: String) {
    let line = "\(Date().formatted(.iso8601)) \(message)"
    lines.append(line)
    if lines.count > 50 { lines.removeFirst(lines.count - 50) }
    print("[Quran build 3] \(message)")
  }
}

struct BuildIdentity {
  static let version = "1.0.2"
  static let number = "3"
}
