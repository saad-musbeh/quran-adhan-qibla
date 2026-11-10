import Foundation

/// A cancelled add may still finish in the notification service. Serialize
/// replacements so its cleanup cannot remove a newer test using the same ID.
@MainActor final class AdhanTestRequests {
  private var revision = UUID()
  private var tail: Task<Void, Never>?
  private(set) var hasRequest = false

  func cancel(remove: () -> Void) {
    revision = UUID()
    hasRequest = false
    tail?.cancel()
    remove()
  }

  func schedule(
    permission: @escaping @MainActor @Sendable () async throws -> Bool,
    add: @escaping @MainActor @Sendable () async throws -> Void,
    remove: @escaping @MainActor @Sendable () -> Void,
    onError: @escaping @MainActor @Sendable (Error) -> Void
  ) async {
    guard !Task.isCancelled else { return }
    let token = UUID()
    revision = token
    hasRequest = true
    let previous = tail
    previous?.cancel()
    let task = Task { @MainActor in
      await previous?.value
      guard self.revision == token, !Task.isCancelled else { return }
      var attemptedAdd = false, scheduled = false
      defer { if self.revision == token { self.hasRequest = scheduled } }
      do {
        guard try await permission(), self.revision == token, !Task.isCancelled else { return }
        attemptedAdd = true
        try await add()
        guard self.revision == token, !Task.isCancelled else { remove(); return }
        scheduled = true
      } catch {
        if self.revision == token, !Task.isCancelled { onError(error) }
        else if attemptedAdd { remove() }
      }
    }
    tail = task
    await task.value
  }
}
