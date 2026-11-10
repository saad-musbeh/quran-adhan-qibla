import Foundation

/// Session IPC may block on supported older OS versions. Keep it off the UI
/// actor, serialize it with deactivation, and discard cancelled completions.
@MainActor final class AudioSessionActivation {
  private let queue = DispatchQueue(label: "org.saadmusbeh.quran.audio-session", qos: .userInitiated)
  private var pending: UUID?
  private var intent = UUID()
  var isPending: Bool { pending != nil }

  func activate(
    operation: @escaping @Sendable () throws -> Void,
    completion: @escaping @MainActor @Sendable (Result<Void, Error>) -> Void
  ) {
    let token = UUID()
    intent = token
    pending = token
    queue.async {
      let result = Result { try operation() }
      Task { @MainActor [weak self] in
        guard let self, self.pending == token else { return }
        self.pending = nil
        completion(result)
      }
    }
  }

  func cancel() { pending = nil; intent = UUID() }

  func guardCurrentIntent(
    _ completion: @escaping @MainActor @Sendable () -> Void
  ) -> @MainActor @Sendable () -> Void {
    let token = intent
    return { [weak self] in
      guard self?.intent == token else { return }
      completion()
    }
  }

  func deactivate(operation: @escaping @Sendable () -> Void) {
    cancel()
    queue.async(execute: operation)
  }
}
