import Foundation

@MainActor private final class Gate {
  private var continuation: CheckedContinuation<Void, Never>?
  private var entered: CheckedContinuation<Void, Never>?
  private var waiting = false
  func wait() async {
    await withCheckedContinuation { continuation in
      self.continuation = continuation
      waiting = true
      entered?.resume(); entered = nil
    }
  }
  func waitUntilEntered() async {
    if waiting { return }
    await withCheckedContinuation { entered = $0 }
  }
  func open() { continuation?.resume(); continuation = nil }
}

@main struct AdhanTestChecks {
  @MainActor static func main() async {
    let requests = AdhanTestRequests()
    var pending = false, adds = 0, errors = 0
    let permission = Gate()
    let first = Task { @MainActor in
      await requests.schedule(permission: { await permission.wait(); return true }, add: {
        pending = true; adds += 1
      }, remove: { pending = false }, onError: { _ in errors += 1 })
    }
    await permission.waitUntilEntered()
    requests.cancel { pending = false }
    permission.open()
    await first.value
    precondition(!pending && adds == 0 && !requests.hasRequest,
      "Disabling during permission must prevent registration")

    let registration = Gate()
    var events: [String] = []
    let old = Task { @MainActor in
      await requests.schedule(permission: { true }, add: {
        events.append("old add started")
        await registration.wait()
        pending = true
      }, remove: { pending = false; events.append("old cleanup") }, onError: { _ in errors += 1 })
    }
    await registration.waitUntilEntered()
    requests.cancel { pending = false }
    // An explicit new test is allowed even while the master switch stays off.
    let newest = Task { @MainActor in
      await requests.schedule(permission: { true }, add: {
        pending = true; adds += 1; events.append("new add")
      }, remove: { pending = false }, onError: { _ in errors += 1 })
    }
    let deadline = Date().addingTimeInterval(2)
    while !requests.hasRequest && Date() < deadline { await Task.yield() }
    precondition(requests.hasRequest, "New test must enter the queue")
    precondition(events == ["old add started"], "Registration must wait for stale cleanup")
    registration.open()
    await old.value
    await newest.value
    precondition(events == ["old add started", "old cleanup", "new add"])
    precondition(pending && adds == 1 && requests.hasRequest && errors == 0,
      "Stale cleanup must not remove a newer explicit test")
    requests.cancel { pending = false }
    precondition(!pending && !requests.hasRequest, "Disable must remove an already scheduled test")

    enum Failure: Error { case expected }
    await requests.schedule(permission: { true }, add: { throw Failure.expected },
      remove: { pending = false }, onError: { _ in errors += 1 })
    precondition(errors == 1 && !requests.hasRequest, "Current registration errors must be reported")
    print("Adhan test checks passed: disable during permission/add, serialized replacement, explicit off-state tests, and error delivery.")
  }
}
