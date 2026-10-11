import ExpoModulesCore
import IslamicCoreFFI

public class IslamicCoreModule: Module {
  public func definition() -> ModuleDefinition {
    Name("IslamicCore")

    Function("qiblaBearing") { (latitude: Double, longitude: Double) -> Double in
      let bearing = islamic_core_qibla_bearing(latitude, longitude)
      guard bearing.isFinite else {
        throw NSError(
          domain: "IslamicCore", code: 1,
          userInfo: [NSLocalizedDescriptionKey: "No valid Qibla bearing at these coordinates."]
        )
      }
      return bearing
    }

    Function("prayerTimes") { (latitude: Double, longitude: Double, year: Int32, month: Int32, day: Int32, flags: Int32) -> [Double] in
      try (0..<6).map { prayer in
        let time = islamic_core_prayer_time(latitude, longitude, year, month, day, flags, Int32(prayer))
        guard time.isFinite else {
          throw NSError(domain: "IslamicCore", code: 2,
            userInfo: [NSLocalizedDescriptionKey: "Prayer times are unavailable for this location or date."])
        }
        return time
      }
    }
  }
}
