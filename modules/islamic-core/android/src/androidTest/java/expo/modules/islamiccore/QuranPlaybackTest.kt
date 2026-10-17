package expo.modules.islamiccore

import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.PlaybackException
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.analytics.AnalyticsListener
import androidx.media3.session.MediaSession
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.net.URL
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.math.sin

@UnstableApi
@RunWith(AndroidJUnit4::class)
class QuranPlaybackTest {
  @Test fun downloadedQueueAdvancesWithoutBoundaryBufferingAndStops() {
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val files = (0..2).map { index -> File(context.cacheDir, "quran-playback-test-$index.wav").also { it.writeBytes(tone(440 + index * 110)) } }
    try {
      assertQueue(files.map { MediaItem.fromUri(it.toURI().toString()) })
    } finally {
      files.forEach { it.delete() }
    }
  }

  @Test fun ghamdiAyahsPlayFromPrivateDownloadsAndStreams() {
    assertRecordings((1..3).map { "001${it.toString().padStart(3, '0')}" })
  }

  @Test fun finalSurahsAdvanceThroughAnNasAndStopWithMediaSession() {
    // Source-audio timing in the report matches 1.25x playback through these
    // surahs. Exercise pitch-preserving speed changes as well as the queue.
    assertRecordings((112..114).flatMap { surah ->
      (1..when (surah) { 112 -> 4; 113 -> 5; else -> 6 }).map { verse ->
        "$surah${verse.toString().padStart(3, '0')}"
      }
    }, playbackRate = 1.25f)
  }

  private fun assertRecordings(keys: List<String>, playbackRate: Float = 1f) {
    val context = InstrumentationRegistry.getInstrumentation().targetContext
    val urls = keys.map { "https://everyayah.com/data/Ghamadi_40kbps/$it.mp3" }
    val files = keys.map { File(context.cacheDir, "ghamdi-test-$it.mp3") }
    try {
      urls.zip(files).forEach { (url, file) ->
        val connection = URL(url).openConnection().apply { connectTimeout = 15000; readTimeout = 20000 }
        connection.getInputStream().use { input -> file.outputStream().use { output -> input.copyTo(output) } }
        assertTrue("Empty source recording", file.length() > 1000)
      }
      assertQueue(files.map { MediaItem.fromUri(it.toURI().toString()) }, playbackRate)
      assertQueue(urls.map { MediaItem.fromUri(it) }, playbackRate)
    } finally {
      // Test recitations stay in private cache; no audio is bundled or uploaded.
      files.forEach { it.delete() }
    }
  }

  private fun assertQueue(items: List<MediaItem>, playbackRate: Float = 1f) {
    val instrumentation = InstrumentationRegistry.getInstrumentation()
    val finished = CountDownLatch(1)
    val transitions = mutableListOf<Int>()
    val buffering = mutableListOf<Int>()
    val errors = mutableListOf<String>()
    val underruns = mutableListOf<Int>()
    var player: ExoPlayer? = null
    var session: MediaSession? = null
    try {
      instrumentation.runOnMainSync {
        val queue = ExoPlayer.Builder(instrumentation.targetContext).build()
        player = queue
        configureQuranPlayback(queue)
        queue.setPlaybackSpeed(playbackRate)
        session = MediaSession.Builder(instrumentation.targetContext,
          QuranMetadataPlayer(queue, items.indices.map { "Ayah $it" }, "Test reciter") {}).build()
        queue.addAnalyticsListener(object : AnalyticsListener {
          override fun onAudioUnderrun(eventTime: AnalyticsListener.EventTime, bufferSize: Int, bufferSizeMs: Long, elapsedSinceLastFeedMs: Long) {
            underruns.add(eventTime.windowIndex)
          }
        })
        queue.addListener(object : Player.Listener {
          override fun onMediaItemTransition(item: MediaItem?, reason: Int) { transitions.add(queue.currentMediaItemIndex) }
          override fun onPlaybackStateChanged(state: Int) {
            if (state == Player.STATE_BUFFERING) buffering.add(queue.currentMediaItemIndex)
            if (state == Player.STATE_ENDED) finished.countDown()
          }
          override fun onPlayerError(error: PlaybackException) {
            errors.add(error.toString())
            finished.countDown()
          }
        })
        queue.setMediaItems(items)
        queue.prepare()
        queue.play()
      }
      assertTrue("Native queue did not finish", finished.await(180, TimeUnit.SECONDS))
      instrumentation.runOnMainSync {
        assertTrue("Playback failed: $errors", errors.isEmpty())
        assertEquals(items.indices.toList(), transitions)
        assertTrue("Unexpected buffering at file boundaries: $buffering", buffering.all { it == 0 })
        assertTrue("Audio ran dry at file boundaries: $underruns", underruns.isEmpty())
        assertEquals(Player.STATE_ENDED, player!!.playbackState)
        assertEquals(false, player!!.isPlaying)
      }
    } finally {
      instrumentation.runOnMainSync { session?.release(); player?.release() }
    }
  }

  /** Generated tones exercise native file boundaries without bundling recitations. */
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
