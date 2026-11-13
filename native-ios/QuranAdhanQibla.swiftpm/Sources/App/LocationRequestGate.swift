import Foundation

/// Each one-shot provider owns its callbacks; a replaced provider cannot finish a new request.
@MainActor final class LocationRequestGate<Owner: AnyObject> {
  private(set) var current: Owner?

  func begin(_ owner: Owner) { current = owner }

  func finish(_ owner: Owner) -> Bool {
    guard current === owner else { return false }
    current = nil
    return true
  }

  @discardableResult func cancel() -> Owner? {
    let previous = current
    current = nil
    return previous
  }
}
