import Foundation

@main struct LocationRequestChecks {
  @MainActor static func main() {
    final class Provider {}
    let requests = LocationRequestGate<Provider>()
    var selected = "device-old"
    let old = Provider()
    requests.begin(old)
    // The same cancellation used by AppStore's explicit alternative selection.
    requests.cancel()
    selected = "manual"
    if requests.finish(old) { selected = "late-device" }
    precondition(selected == "manual", "A delayed device result replaced an explicit selection")

    let next = Provider()
    requests.begin(next)
    precondition(!requests.finish(old), "An old provider's failure/timeout consumed the new request")
    precondition(requests.current === next)
    if requests.finish(next) { selected = "new-device" }
    precondition(selected == "new-device")
    precondition(!requests.finish(next), "A duplicate result was accepted")
    precondition(requests.current == nil)
    print("Location request checks passed: alternative selection, late callbacks, replacement and duplicate results.")
  }
}
