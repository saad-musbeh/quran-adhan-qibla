package expo.modules.islamiccore

import android.app.AlarmManager
import android.content.Context
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Read the special alarm access without requesting it or changing system settings. */
class PrayerNotificationPermissionsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PrayerNotificationPermissions")
    Function("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) true
      else {
        val context = appContext.reactContext ?: return@Function false
        (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).canScheduleExactAlarms()
      }
    }
  }
}
