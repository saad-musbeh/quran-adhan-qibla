import Foundation

@main
struct PageSourceCacheChecks {
  static func main() async throws {
    let root = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    defer { try? FileManager.default.removeItem(at: root) }
    let urls = (1...4).map { root.appendingPathComponent(String($0)) }
    for url in urls { try Data([1]).write(to: url) }
    let cache = PageSourceCache(read: { try Data(contentsOf: $0) })
    for url in urls.prefix(3) { _ = try await cache.load(url) }
    for url in urls { try Data([2]).write(to: url) }
    let hit = try await cache.load(urls[0])
    precondition(hit == Data([1]), "A prefetched page must not be read twice")
    _ = try await cache.load(urls[3])
    let evicted = try await cache.load(urls[1])
    precondition(evicted == Data([2]), "The fourth leaf must evict the least recently used source")
    await cache.clear()
    let fresh = try await cache.load(urls[0])
    precondition(fresh == Data([2]), "Closing the reader releases cached sources")

    let bounded = PageSourceCache(byteLimit: 1, read: { try Data(contentsOf: $0) })
    _ = try await bounded.load(urls[0])
    _ = try await bounded.load(urls[1])
    try Data([3]).write(to: urls[0])
    let replaced = try await bounded.load(urls[0])
    precondition(replaced == Data([3]), "Byte limit must apply before three entries")
    try Data([4, 4]).write(to: urls[2])
    _ = try await bounded.load(urls[2])
    try Data([5]).write(to: urls[2])
    let oversized = try await bounded.load(urls[2])
    precondition(oversized == Data([5]), "Oversized sources cannot be retained")

    let missing = root.appendingPathComponent("retry")
    do {
      _ = try await cache.load(missing)
      fatalError("Expected a failed read")
    } catch { }
    try Data([6]).write(to: missing)
    let retried = try await cache.load(missing)
    precondition(retried == Data([6]), "A failed read must remain retryable")
    let cancelled = Task {
      try? await Task.sleep(nanoseconds: 20_000_000)
      return try await cache.load(missing)
    }
    cancelled.cancel()
    do {
      _ = try await cancelled.value
      fatalError("Cancelled page work must not run")
    } catch is CancellationError { }

    precondition(PageSourceCache.window(visible: [1], direction: 1) == [1, 2])
    precondition(PageSourceCache.window(visible: [50], direction: 1) == [50, 51, 49])
    precondition(PageSourceCache.window(visible: [51, 52], direction: -1) == [51, 52, 50])
    precondition(PageSourceCache.window(visible: [603, 604], direction: 1) == [603, 604, 605])
    precondition(PageSourceCache.window(visible: [606], direction: 1) == [606, 605])
    print("Three-slot source cache checks passed: reuse, eviction, byte limits, release, retry, cancellation and page boundaries.")
  }
}
