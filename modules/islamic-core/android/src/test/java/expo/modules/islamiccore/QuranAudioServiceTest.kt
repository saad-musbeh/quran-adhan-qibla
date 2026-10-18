package expo.modules.islamiccore

import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.LooperMode

@UnstableApi
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
@LooperMode(LooperMode.Mode.PAUSED)
class QuranAudioServiceTest {
  @Test fun removingTheTaskStopsTheExpoPlayerWithoutReleasingIt() {
    val context = RuntimeEnvironment.getApplication()
    val controller = Robolectric.buildService(QuranAudioService::class.java).create()
    val player = ExoPlayer.Builder(context).build()
    try {
      player.setMediaItem(MediaItem.fromUri("https://source/112.mp3"))
      player.prepare()
      player.play()
      QuranAudioService.attach(context, player, listOf("Al-Ikhlas"), "Reciter") {}
      assertEquals(Player.STATE_BUFFERING, player.playbackState)

      controller.get().onTaskRemoved(null)

      assertEquals(Player.STATE_IDLE, player.playbackState)
      assertFalse(player.isReleased)
      // Expo still owns the player and can replace the stopped queue.
      player.setMediaItem(MediaItem.fromUri("https://source/113.mp3"))
      assertEquals(1, player.mediaItemCount)
    } finally {
      QuranAudioService.detach()
      controller.destroy()
      player.release()
    }
  }

  @Test fun detachingOnlyRemovesControlsAndPreservesTheExpoPlayer() {
    val context = RuntimeEnvironment.getApplication()
    val controller = Robolectric.buildService(QuranAudioService::class.java).create()
    val player = ExoPlayer.Builder(context).build()
    try {
      player.setMediaItem(MediaItem.fromUri("https://source/112.mp3"))
      player.prepare()
      player.play()
      QuranAudioService.attach(context, player, listOf("Al-Ikhlas"), "Reciter") {}

      QuranAudioService.detach()

      assertEquals(Player.STATE_BUFFERING, player.playbackState)
      assertFalse(player.isReleased)
    } finally {
      QuranAudioService.detach()
      controller.destroy()
      player.release()
    }
  }
}
