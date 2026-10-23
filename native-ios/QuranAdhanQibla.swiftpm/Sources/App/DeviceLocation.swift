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
  private var timeout: Task<Void, Never>?
  private var wantsFix = false
  private var compassActive = false

  override init() {
    authorization = manager.authorizationStatus
    super.init()
    manager.delegate = self
    manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    manager.headingFilter = 1
  }

  func request(prompt: Bool = true) {
    error = nil
    guard CLLocationManager.locationServicesEnabled() else {
      error = "services"
      return
    }
    switch manager.authorizationStatus {
    case .notDetermined:
      guard prompt else { return }
      wantsFix = true
      manager.requestWhenInUseAuthorization()
    case .authorizedAlways, .authorizedWhenInUse:
      wantsFix = true
      locating = true
      timeout?.cancel()
      timeout = Task { [weak self] in
        try? await Task.sleep(for: .seconds(30))
        guard !Task.isCancelled, let self, self.locating else { return }
        self.manager.stopUpdatingLocation()
        self.locating = false
        self.wantsFix = false
        self.error = "timeout"
      }
      manager.requestLocation()
    case .denied, .restricted: error = "permission"
    @unknown default: error = "permission"
    }
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
    authorization = manager.authorizationStatus
    if wantsFix {
      if authorization == .authorizedWhenInUse || authorization == .authorizedAlways {
        request(prompt: false)
      } else if authorization == .denied || authorization == .restricted {
        wantsFix = false
        locating = false
        error = "permission"
      }
    }
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard wantsFix, let fix = locations.last, fix.horizontalAccuracy >= 0,
      abs(fix.timestamp.timeIntervalSinceNow) < 120
    else { return }
    let point = GeoPoint(latitude: fix.coordinate.latitude, longitude: fix.coordinate.longitude)
    guard point.isValid else { return }
    wantsFix = false
    locating = false
    timeout?.cancel()
    onFix?(
      SavedLocation(
        point: point, source: "device",
        label: String(format: "%.4f, %.4f", point.latitude, point.longitude),
        accuracy: fix.horizontalAccuracy, updatedAt: fix.timestamp))
  }

  func locationManager(_ manager: CLLocationManager, didFailWithError failure: Error) {
    guard wantsFix else { return }
    wantsFix = false
    locating = false
    timeout?.cancel()
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
