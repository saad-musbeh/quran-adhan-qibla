package expo.modules.islamiccore

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class IslamicCoreModule : Module() {
  companion object {
    init {
      System.loadLibrary("islamic_core")
    }
  }

  private external fun nativeQiblaBearing(latitude: Double, longitude: Double): Double

  override fun definition() = ModuleDefinition {
    Name("IslamicCore")

    Function("qiblaBearing") { latitude: Double, longitude: Double ->
      val bearing = nativeQiblaBearing(latitude, longitude)
      require(bearing.isFinite()) { "No valid Qibla bearing at these coordinates." }
      bearing
    }
  }
}
