package expo.modules.islamiccore

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** One bounded foreground fix using Android providers, without a GMS client. */
class SystemDeviceLocationModule : Module() {
  private val handler = Handler(Looper.getMainLooper())
  private var pending: FixRequest? = null
  private fun servicesEnabled(manager: LocationManager): Boolean =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) manager.isLocationEnabled
    else manager.isProviderEnabled(LocationManager.GPS_PROVIDER) || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

  override fun definition() = ModuleDefinition {
    Name("SystemDeviceLocation")
    AsyncFunction("getCurrentPositionAsync") { timeoutMs: Int, promise: Promise ->
      val context = appContext.reactContext
      if (context == null || appContext.currentActivity == null) {
        promise.reject("ERR_LOCATION_CANCELLED", "No foreground activity.", null)
      } else if (pending != null) {
        promise.reject("ERR_LOCATION_BUSY", "A location request is already running.", null)
      } else {
        val fine = context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!fine && !coarse) {
          promise.reject("ERR_LOCATION_DENIED", "Foreground location permission is required.", null)
        } else {
          val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
          if (!servicesEnabled(manager)) {
            promise.reject("ERR_LOCATION_SERVICES_DISABLED", "Location services are off.", null)
          } else {
            val providers = manager.getProviders(true).filter {
              it in listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, "fused") &&
                (fine || it != LocationManager.GPS_PROVIDER)
            }
            val request = FixRequest(manager, promise)
            pending = request
            request.start(providers, timeoutMs.coerceIn(1_000, 28_000))
          }
        }
      }
    }.runOnQueue(Queues.MAIN)
    OnActivityEntersBackground { handler.post { pending?.fail("ERR_LOCATION_CANCELLED", "Location request stopped in the background.") } }
    OnDestroy { handler.post { pending?.fail("ERR_LOCATION_CANCELLED", "Location module was closed.") } }
  }

  private inner class FixRequest(private val manager: LocationManager, private val promise: Promise) : LocationListener {
    private var finished = false
    private var registered = false
    private val deadline = Runnable { fail("ERR_LOCATION_TIMEOUT", "No device location arrived before the deadline.") }

    fun start(providers: List<String>, timeoutMs: Int) {
      try {
        // Only a recent, bounded-accuracy fix can shortcut a fresh request.
        val recent = providers.mapNotNull { provider ->
          try { manager.getLastKnownLocation(provider) } catch (_: IllegalArgumentException) { null }
        }.filter { valid(it) && ageMs(it) in 0..300_000 && it.hasAccuracy() && it.accuracy <= 10_000 }
          .minByOrNull { it.accuracy }
        if (recent != null) { succeed(recent); return }
        for (provider in providers) {
          try {
            manager.requestLocationUpdates(provider, 0L, 0f, this, Looper.getMainLooper())
            registered = true
          } catch (_: IllegalArgumentException) { /* Another provider may remain usable. */ }
        }
        if (!registered) fail("ERR_LOCATION_PROVIDER", "No usable GPS or network provider is available.")
        else handler.postDelayed(deadline, timeoutMs.toLong())
      } catch (_: SecurityException) {
        fail("ERR_LOCATION_DENIED", "Location permission was revoked.")
      } catch (_: Exception) {
        fail("ERR_LOCATION_PROVIDER", "Device location is unavailable.")
      }
    }

    private fun ageMs(location: Location): Long =
      (SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos) / 1_000_000

    private fun valid(location: Location): Boolean =
      location.latitude.isFinite() && location.latitude in -90.0..90.0 &&
        location.longitude.isFinite() && location.longitude in -180.0..180.0 && location.time > 0

    override fun onLocationChanged(location: Location) {
      if (valid(location) && ageMs(location) in 0..300_000) succeed(location)
    }
    @Deprecated("Required for older Android location providers")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) { }
    override fun onProviderEnabled(provider: String) { }
    override fun onProviderDisabled(provider: String) {
      if (!servicesEnabled(manager)) fail("ERR_LOCATION_SERVICES_DISABLED", "Location services are off.")
    }

    private fun cleanup(): Boolean {
      if (finished) return false
      finished = true
      handler.removeCallbacks(deadline)
      if (registered) try { manager.removeUpdates(this) } catch (_: Exception) { }
      if (pending === this) pending = null
      return true
    }
    private fun succeed(location: Location) {
      if (!cleanup()) return
      promise.resolve(mapOf(
        "coords" to mapOf("latitude" to location.latitude, "longitude" to location.longitude,
          "accuracy" to if (location.hasAccuracy()) location.accuracy.toDouble() else null),
        "timestamp" to minOf(location.time, System.currentTimeMillis()).toDouble()
      ))
    }
    fun fail(code: String, message: String) {
      if (cleanup()) promise.reject(code, message, null)
    }
  }
}
