package expo.modules.islamiccore

import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@UnstableApi
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class QuranTrackEndTest {
  @Test fun queueBoundsMatchURIAndSurviveRepeatAndSeek() {
    val source = "https://cdn.mp3quran.net/audio/saad-ghamdi/r1/001.mp3"
    val player = ExoPlayer.Builder(RuntimeEnvironment.getApplication()).build()
    try {
      player.setMediaItems(listOf(MediaItem.fromUri(source), MediaItem.fromUri("https://source/002.mp3")))
      applyQuranTrackEnds(player, mapOf(source to 42.0, "https://unrelated/001.mp3" to 10.0))
      player.repeatMode = Player.REPEAT_MODE_ALL
      player.seekToDefaultPosition(0)
      assertEquals(42000L, player.getMediaItemAt(0).clippingConfiguration.endPositionMs)
      assertEquals(C.TIME_END_OF_SOURCE, player.getMediaItemAt(1).clippingConfiguration.endPositionMs)
    } finally { player.release() }
  }

  @Test fun auditedEndKeepsTheOriginalSourceAndCutsOnlyItsTail() {
    for (uri in listOf("https://cdn.mp3quran.net/audio/saad-ghamdi/r1/001.mp3", "file:///private/quran-audio/ghamdi/001/surah.mp3")) {
      val item = MediaItem.fromUri(uri)
      val clipped = quranMediaItemWithEnd(item, 42.0)
      assertEquals(item.localConfiguration?.uri, clipped.localConfiguration?.uri)
      assertEquals(0L, clipped.clippingConfiguration.startPositionMs)
      assertEquals(42000L, clipped.clippingConfiguration.endPositionMs)
    }
  }

  @Test fun absentOrInvalidEndNeverTruncatesARecording() {
    val item = MediaItem.fromUri("https://source/002.mp3")
    for (end in listOf(null, 0.0, -1.0, Double.NaN, Double.POSITIVE_INFINITY, Double.MAX_VALUE)) {
      assertSame(item, quranMediaItemWithEnd(item, end))
      assertEquals(C.TIME_END_OF_SOURCE, item.clippingConfiguration.endPositionMs)
    }
  }
}
