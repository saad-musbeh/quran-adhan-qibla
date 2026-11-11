import Foundation

/// Only source data is prefetched. WebKit views exist only for visible leaves.
/// Actor isolation serializes decoding off the main actor.
actor PageSourceCache {
  private var pages: [URL: Data] = [:]
  private var order: [URL] = []
  private let read: @Sendable (URL) throws -> Data
  private let byteLimit: Int

  init(byteLimit: Int = 5 * 1024 * 1024, read: @escaping @Sendable (URL) throws -> Data) {
    self.byteLimit = byteLimit
    self.read = read
  }

  func load(_ url: URL) throws -> Data {
    try Task.checkCancellation()
    if let data = pages[url] {
      order.removeAll { $0 == url }
      order.append(url)
      return data
    }
    while order.count >= 3 { evictFirst() }
    let data = try read(url)
    try Task.checkCancellation()
    guard data.count <= byteLimit else { return data }
    while pages.values.reduce(0, { $0 + $1.count }) + data.count > byteLimit { evictFirst() }
    pages[url] = data
    order.append(url)
    return data
  }

  func clear() { pages.removeAll(); order.removeAll() }

  private func evictFirst() {
    guard !order.isEmpty else { return }
    pages.removeValue(forKey: order.removeFirst())
  }

  /// A spread uses two slots, leaving one adjacent leaf to preload.
  nonisolated static func window(visible: [Int], direction: Int) -> [Int] {
    guard let first = visible.first, let last = visible.last else { return [] }
    let neighbors = direction < 0 ? [first - 1, last + 1] : [last + 1, first - 1]
    return Array((visible + neighbors.filter { (1...606).contains($0) }).prefix(3))
  }
}
