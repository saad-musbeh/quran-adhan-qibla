import Foundation

private enum ProbeError: Error { case failed }
private final class Events: @unchecked Sendable {
  private let lock = NSLock()
  private var entries: [String] = []
  func append(_ event: String) { lock.lock(); defer { lock.unlock() }; entries.append(event) }
  var values: [String] { lock.lock(); defer { lock.unlock() }; return entries }
}

@main struct AudioSessionChecks {
  @MainActor static func main() async {
    let activation = AudioSessionActivation()
    let entered = DispatchSemaphore(value: 0), release = DispatchSemaphore(value: 0)
    let events = Events()
    var staleCompletion = false
    activation.activate(operation: {
      precondition(!Thread.isMainThread, "Audio session IPC must not run on the main thread")
      events.append("first activation")
      entered.signal()
      precondition(release.wait(timeout: .now() + 10) == .success)
      throw ProbeError.failed
    }, completion: { _ in staleCompletion = true })
    // The UI actor remains available while a simulated session call is blocked.
    let didEnter = await Task.detached { entered.wait(timeout: .now() + 10) == .success }.value
    precondition(didEnter && activation.isPending)
    activation.deactivate {
      precondition(!Thread.isMainThread)
      events.append("deactivation")
    }
    precondition(!activation.isPending)
    let result: Result<Void, Error> = await withCheckedContinuation { continuation in
      activation.activate(operation: {
        precondition(!Thread.isMainThread)
        events.append("latest activation")
      }, completion: { result in
        MainActor.assumeIsolated { continuation.resume(returning: result) }
      })
      release.signal()
    }
    guard case .success = result else { fatalError("Latest playback request failed") }
    precondition(!staleCompletion, "Stop must discard an old activation error/completion")
    precondition(events.values == ["first activation", "deactivation", "latest activation"])
    precondition(!activation.isPending)

    let failure: Result<Void, Error> = await withCheckedContinuation { continuation in
      activation.activate(operation: { throw ProbeError.failed }, completion: { result in
        continuation.resume(returning: result)
      })
    }
    guard case .failure(ProbeError.failed) = failure else { fatalError("Activation errors must reach the UI") }
    precondition(!activation.isPending)
    print("Audio session checks passed: nonblocking UI, serialized stop/restart, stale completion cancellation, error delivery.")
  }
}
