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
  private external fun nativePrayerTime(latitude: Double, longitude: Double,
    year: Int, month: Int, day: Int, flags: Int, prayer: Int): Double

  override fun definition() = ModuleDefinition {
    Name("IslamicCore")

    Function("qiblaBearing") { latitude: Double, longitude: Double ->
      val bearing = nativeQiblaBearing(latitude, longitude)
      require(bearing.isFinite()) { "No valid Qibla bearing at these coordinates." }
      bearing
    }

    Function("prayerTimes") { latitude: Double, longitude: Double, year: Int, month: Int, day: Int, flags: Int ->
      (0..5).map { prayer ->
        val time = nativePrayerTime(latitude, longitude, year, month, day, flags, prayer)
        require(time.isFinite()) { "Prayer times are unavailable for this location or date." }
        time
      }
    }
  }
}
