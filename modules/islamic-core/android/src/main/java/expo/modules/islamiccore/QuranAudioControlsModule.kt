package expo.modules.islamiccore

import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.common.Player
import androidx.media3.common.PlaybackException
import expo.modules.audio.AudioPlaylist
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

@UnstableApi
class QuranAudioControlsModule : Module() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var observedPlayer: Player? = null
  private val errorListener = object : Player.Listener {
    override fun onPlaybackStateChanged(playbackState: Int) {
      Log.d("QuranPlayback", "state=$playbackState index=${observedPlayer?.currentMediaItemIndex}")
    }

    override fun onMediaItemTransition(mediaItem: MediaItem?, reason: Int) {
      Log.d("QuranPlayback", "transition=$reason index=${observedPlayer?.currentMediaItemIndex}")
    }

    override fun onPlayerError(error: PlaybackException) {
      sendEvent("playbackError", mapOf(
        "message" to (error.message ?: "Audio playback failed."),
        "uri" to observedPlayer?.currentMediaItem?.localConfiguration?.uri?.toString(),
        "time" to ((observedPlayer?.currentPosition ?: 0L).coerceAtLeast(0L) / 1000.0)
      ))
    }
  }

  private fun detach() {
    observedPlayer?.removeListener(errorListener)
    observedPlayer = null
    QuranAudioService.detach()
  }

  private fun runOnMain(block: () -> Unit) {
    if (Looper.myLooper() == Looper.getMainLooper()) block() else mainHandler.post(block)
  }

  override fun definition() = ModuleDefinition {
    Name("QuranAudioControls")
    Events("remoteCommand", "playbackError")

    Function("attach") { playlist: AudioPlaylist, titles: List<String>, artist: String ->
      runOnMain {
        observedPlayer?.removeListener(errorListener)
        observedPlayer = playlist.ref
        // Expo leaves playlist preloading disabled. Preparing the next ayah's
        // media source ahead of the boundary avoids per-file preparation stalls.
        // Media3 owns the buffer for local files and streams; no recitation is edited.
        configureQuranPlayback(playlist.ref)
        playlist.ref.addListener(errorListener)
        val context = appContext.reactContext
          ?: throw IllegalStateException("React context is unavailable.")
        QuranAudioService.attach(context, playlist.ref, titles, artist) { command ->
          sendEvent("remoteCommand", mapOf("command" to command, "nativeHandled" to true))
        }
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
        detach()
      }
    }

    OnDestroy {
      runOnMain { detach() }
    }
  }
}
