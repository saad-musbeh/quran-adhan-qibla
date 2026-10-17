package expo.modules.islamiccore

import android.os.Handler
import android.os.Looper
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf
import org.robolectric.annotation.Config
import org.robolectric.annotation.LooperMode

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
@LooperMode(LooperMode.Mode.PAUSED)
class QuranAudioCommandTest {
  @Test fun mainThreadFailureReachesPlaybackRecovery() {
    val failure = IllegalStateException("Media session is unavailable")
    val errors = mutableListOf<RuntimeException>()
    dispatchQuranAudioCommand(Handler(Looper.getMainLooper()), { throw failure }, errors::add)
    assertEquals(1, errors.size)
    assertSame(failure, errors.single())
  }

  @Test fun postedFailureIsReportedOnMainInsteadOfEscapingTheHandler() {
    val main = Looper.getMainLooper()
    val errors = mutableListOf<RuntimeException>()
    val failure = IllegalArgumentException("Invalid native queue metadata")
    Thread {
      dispatchQuranAudioCommand(Handler(main), { throw failure }) {
        assertSame(main, Looper.myLooper())
        errors.add(it)
      }
    }.apply { start(); join() }
    assertEquals(0, errors.size)
    shadowOf(main).idle()
    assertEquals(listOf(failure), errors)
  }

  @Test fun successfulPostedCommandRunsOnceWithoutReportingAnError() {
    var calls = 0
    val errors = mutableListOf<RuntimeException>()
    Thread {
      dispatchQuranAudioCommand(Handler(Looper.getMainLooper()), { calls++ }, errors::add)
    }.apply { start(); join() }
    shadowOf(Looper.getMainLooper()).idle()
    assertEquals(1, calls)
    assertEquals(emptyList<RuntimeException>(), errors)
  }
}
