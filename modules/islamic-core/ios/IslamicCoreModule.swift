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
  }
}
