package expo.modules.islamiccore

import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.math.sin

/** Generated tones exercise real native file boundaries without bundling recitations. */
@UnstableApi
@RunWith(AndroidJUnit4::class)
class QuranPlaybackTest {
  @Test fun downloadedQueueAdvancesWithoutBoundaryBufferingAndStops() {
    val instrumentation = InstrumentationRegistry.getInstrumentation()
    val context = instrumentation.targetContext
    val files = (0..2).map { index -> File(context.cacheDir, "quran-playback-test-$index.wav").also { it.writeBytes(tone(440 + index * 110)) } }
    val finished = CountDownLatch(1)
    val transitions = mutableListOf<Int>()
    val buffering = mutableListOf<Int>()
    var player: ExoPlayer? = null
    try {
      instrumentation.runOnMainSync {
        val queue = ExoPlayer.Builder(context).build()
        player = queue
        configureQuranPlayback(queue)
        queue.addListener(object : Player.Listener {
          override fun onMediaItemTransition(item: MediaItem?, reason: Int) { transitions.add(queue.currentMediaItemIndex) }
          override fun onPlaybackStateChanged(state: Int) {
            if (state == Player.STATE_BUFFERING) buffering.add(queue.currentMediaItemIndex)
            if (state == Player.STATE_ENDED) finished.countDown()
          }
        })
        queue.setMediaItems(files.map { MediaItem.fromUri(it.toURI().toString()) })
        queue.prepare()
        queue.play()
      }
      assertTrue("Native queue did not finish", finished.await(45, TimeUnit.SECONDS))
      instrumentation.runOnMainSync {
        assertEquals(listOf(0,1,2), transitions)
        assertTrue("Unexpected buffering at file boundaries: $buffering", buffering.all { it == 0 })
        assertEquals(Player.STATE_ENDED, player!!.playbackState)
        assertEquals(false, player!!.isPlaying)
      }
    } finally {
      instrumentation.runOnMainSync { player?.release() }
      files.forEach { it.delete() }
    }
  }

  private fun tone(frequency: Int): ByteArray {
    val rate = 44100
    val samples = rate * 2
    val pcmBytes = samples * 2
    val bytes = ByteBuffer.allocate(44 + pcmBytes).order(ByteOrder.LITTLE_ENDIAN)
    bytes.put("RIFF".toByteArray()).putInt(36 + pcmBytes).put("WAVEfmt ".toByteArray())
      .putInt(16).putShort(1).putShort(1).putInt(rate).putInt(rate * 2).putShort(2).putShort(16)
      .put("data".toByteArray()).putInt(pcmBytes)
    repeat(samples) { index -> bytes.putShort((sin(2 * Math.PI * frequency * index / rate) * 1000).toInt().toShort()) }
    return bytes.array()
  }
}
