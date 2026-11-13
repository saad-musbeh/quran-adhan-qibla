import Combine
import CoreLocation
import Foundation
import IslamicCore

@MainActor final class DeviceLocation: NSObject, ObservableObject, CLLocationManagerDelegate {
  @Published var locating = false
  @Published var heading: Double?
  @Published var headingAccuracy: Double?
  @Published var error: String?
  @Published var authorization: CLAuthorizationStatus
  var onFix: ((SavedLocation) -> Void)?
  private let manager = CLLocationManager()
  private let requests = LocationRequestGate<CLLocationManager>()
  private var timeout: Task<Void, Never>?
  private var wantsFix = false
  private var authorizationReady = false
  private var mayPrompt = true
  private var compassActive = false

  override init() {
    authorization = .notDetermined
    super.init()
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    manager.headingFilter = 1
  }

  func request(prompt: Bool = true) {
    error = nil
    wantsFix = true
    mayPrompt = prompt
    continueRequest()
  }

  private func continueRequest() {
    // CLLocationManager delivers initial and changed authorization via its
    // delegate. Avoid a synchronous location-services IPC query on the UI actor.
    guard authorizationReady, wantsFix else { return }
    switch authorization {
    case .notDetermined:
      guard mayPrompt else { wantsFix = false; return }
      manager.requestWhenInUseAuthorization()
    case .authorizedAlways, .authorizedWhenInUse:
      guard !locating else { return }
      // A distinct provider lets delegate callbacks identify the request they belong to.
      let provider = CLLocationManager()
      provider.delegate = self
      provider.desiredAccuracy = kCLLocationAccuracyHundredMeters
      requests.begin(provider)
      locating = true
      timeout?.cancel()
      timeout = Task { [weak self] in
        try? await Task.sleep(for: .seconds(30))
        guard !Task.isCancelled, let self, self.requests.current === provider else { return }
        self.cancelRequest()
        self.error = "timeout"
      }
      provider.requestLocation()
    case .denied, .restricted: denyRequest()
    @unknown default: denyRequest()
    }
  }

  func cancelRequest() {
    wantsFix = false
    locating = false
    timeout?.cancel()
    timeout = nil
    if let provider = requests.cancel() {
      provider.stopUpdatingLocation()
      provider.delegate = nil
    }
  }

  private func denyRequest() {
    cancelRequest()
    error = "permission"
  }

  func setCompass(active: Bool) {
    compassActive = active
    if active && CLLocationManager.headingAvailable() {
      manager.startUpdatingHeading()
    } else {
      manager.stopUpdatingHeading()
      heading = nil
      headingAccuracy = nil
    }
  }

  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    guard manager === self.manager else { return }
    authorization = manager.authorizationStatus
    authorizationReady = true
    continueRequest()
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard wantsFix, requests.current === manager, let fix = locations.last, fix.horizontalAccuracy >= 0,
      abs(fix.timestamp.timeIntervalSinceNow) < 120
    else { return }
    let point = GeoPoint(latitude: fix.coordinate.latitude, longitude: fix.coordinate.longitude)
    guard point.isValid else { return }
    guard requests.finish(manager) else { return }
    manager.delegate = nil
    manager.stopUpdatingLocation()
    cancelRequest()
    onFix?(
      SavedLocation(
        point: point, source: "device",
        label: String(format: "%.4f, %.4f", point.latitude, point.longitude),
        accuracy: fix.horizontalAccuracy, updatedAt: fix.timestamp))
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError failure: Error) {
    guard wantsFix, requests.finish(manager) else { return }
    manager.delegate = nil
    manager.stopUpdatingLocation()
    cancelRequest()
    error = (failure as? CLError)?.code == .denied ? "permission" : "unavailable"
  }

  func locationManager(_ manager: CLLocationManager, didUpdateHeading value: CLHeading) {
    guard compassActive else { return }
    headingAccuracy = value.headingAccuracy
    heading = HeadingMath.usableTrueHeading(
      heading: value.trueHeading, accuracy: value.headingAccuracy)
  }

  func locationManagerShouldDisplayHeadingCalibration(_ manager: CLLocationManager) -> Bool {
    compassActive
  }
}
