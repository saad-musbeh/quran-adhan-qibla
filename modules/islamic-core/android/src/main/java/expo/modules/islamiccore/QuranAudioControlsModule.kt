package expo.modules.islamiccore

import android.os.Handler
import android.os.Looper
import androidx.media3.common.util.UnstableApi
import expo.modules.audio.AudioPlaylist
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

@UnstableApi
class QuranAudioControlsModule : Module() {
  private val mainHandler = Handler(Looper.getMainLooper())

  private fun runOnMain(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) block() else mainHandler.post(block)
  }

  override fun definition() = ModuleDefinition {
    Name("QuranAudioControls")

    Function("attach") { playlist: AudioPlaylist, titles: List<String>, artist: String ->
      runOnMain {
        val context = appContext.reactContext
          ?: throw IllegalStateException("React context is unavailable.")
        QuranAudioService.attach(context, playlist.ref, titles, artist)
      }
    }

    Function("updateTitles") { titles: List<String>, artist: String, currentIndex: Int ->
      runOnMain {
        QuranAudioService.updateTitles(titles, artist, currentIndex)
      }
    }

    Function("updateMetadata") { title: String, artist: String ->
      runOnMain {
        QuranAudioService.updateCurrentMetadata(title, artist)
      }
    }

    Function("updatePlaybackRate") { rate: Double ->
      runOnMain {
        QuranAudioService.updatePlaybackRate(rate.toFloat())
      }
    }

    Function("detach") {
      runOnMain {
        QuranAudioService.detach()
      }
    }

    OnDestroy {
      runOnMain { QuranAudioService.detach() }
    }
  }
}
