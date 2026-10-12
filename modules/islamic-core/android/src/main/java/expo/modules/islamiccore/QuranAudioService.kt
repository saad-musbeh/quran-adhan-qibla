package expo.modules.islamiccore

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Looper
import androidx.media3.common.FlagSet
import androidx.media3.common.ForwardingPlayer
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import java.util.IdentityHashMap

/** Hosts a MediaSession backed by expo-audio's exact ExoPlayer instance. */
@UnstableApi
class QuranAudioService : MediaSessionService() {
  private var session: MediaSession? = null
  private var metadataPlayer: QuranMetadataPlayer? = null
  private var playbackObservation: Pair<Player, Player.Listener>? = null

  override fun onCreate() {
    super.onCreate()
    synchronized(lock) {
      service = this
      activePlayer?.let { createSession(it, activeTitles, activeArtist) }
    }
  }

  override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? = session

  override fun onUpdateNotification(session: MediaSession, startInForegroundRequired: Boolean) {
    // Playback is driven by Expo's native queue, independently of a connected
    // MediaController. Use that same player's state for foreground protection.
    val player = session.player
    val playbackOngoing = player.playWhenReady &&
      (player.playbackState == Player.STATE_READY || player.playbackState == Player.STATE_BUFFERING)
    super.onUpdateNotification(session, startInForegroundRequired || playbackOngoing)
  }

  override fun onDestroy() {
    releaseSession()
    synchronized(lock) {
      if (service === this) service = null
    }
    super.onDestroy()
  }

  private fun createSession(player: Player, titles: List<String>, artist: String) {
    check(Looper.myLooper() == Looper.getMainLooper())
    releaseSession()
    val wrapper = QuranMetadataPlayer(player, titles, artist)
    val builder = MediaSession.Builder(this, wrapper).setId("QuranAudioMediaSession")
    packageManager.getLaunchIntentForPackage(packageName)?.let { launch ->
      builder.setSessionActivity(PendingIntent.getActivity(this, 0, launch,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
    }
    session = builder.build()
    addSession(session!!)
    metadataPlayer = wrapper
    // Observe the underlying queue directly: its first play-state change may
    // precede the notification controller's snapshot or the next ayah.
    val listener = object : Player.Listener {
      override fun onEvents(player: Player, events: Player.Events) {
        if (events.containsAny(Player.EVENT_PLAY_WHEN_READY_CHANGED, Player.EVENT_PLAYBACK_STATE_CHANGED)) {
          session?.let { onUpdateNotification(it, false) }
        }
      }
    }
    player.addListener(listener)
    playbackObservation = player to listener
    onUpdateNotification(session!!, false)
  }

  private fun releaseSession() {
    playbackObservation?.let { (player, listener) -> player.removeListener(listener) }
    playbackObservation = null
    session?.let { removeSession(it); it.release() }
    session = null
    metadataPlayer = null
  }

  companion object {
    private val lock = Any()
    private var service: QuranAudioService? = null
    private var activePlayer: Player? = null
    private var activeTitles: List<String> = emptyList()
    private var activeArtist: String = ""

    fun attach(context: Context, player: Player, titles: List<String>, artist: String) {
      check(Looper.myLooper() == Looper.getMainLooper())
      synchronized(lock) {
        activePlayer = player
        activeTitles = titles.toList()
        activeArtist = artist
        val runningService = service
        if (runningService != null) {
          runningService.createSession(player, activeTitles, activeArtist)
        } else {
          context.startService(Intent(context, QuranAudioService::class.java))
        }
      }
    }

    fun updateTitles(titles: List<String>, artist: String, currentIndex: Int) {
      check(Looper.myLooper() == Looper.getMainLooper())
      activeTitles = titles.toList()
      activeArtist = artist
      service?.metadataPlayer?.setTitles(activeTitles, activeArtist)
    }

    fun updateCurrentMetadata(title: String, artist: String) {
      check(Looper.myLooper() == Looper.getMainLooper())
      val currentIndex = activePlayer?.currentMediaItemIndex ?: return
      val updatedTitles = activeTitles.toMutableList()
      if (currentIndex >= 0) {
        while (updatedTitles.size <= currentIndex) updatedTitles.add("")
        updatedTitles[currentIndex] = title
      }
      updateTitles(updatedTitles, artist, currentIndex)
    }

    fun updatePlaybackRate(rate: Float) {
      check(Looper.myLooper() == Looper.getMainLooper())
      if (rate !in listOf(0.75f, 1f, 1.25f, 1.5f, 2f)) return
      (activePlayer as? ExoPlayer)?.setPlaybackSpeed(rate)
    }

    fun detach() {
      check(Looper.myLooper() == Looper.getMainLooper())
      synchronized(lock) {
        activePlayer = null
        activeTitles = emptyList()
        activeArtist = ""
        service?.let { current ->
          current.releaseSession()
          current.stopSelf()
        }
      }
    }
  }
}

/** Adds native current-track metadata while forwarding all playback to the same player. */
@UnstableApi
private class QuranMetadataPlayer(
  player: Player,
  titles: List<String>,
  artist: String
) : ForwardingPlayer(player) {
  private val listeners = IdentityHashMap<Player.Listener, Player.Listener>()
  private var trackTitles = titles.toList()
  private var trackArtist = artist

  override fun getMediaMetadata(): MediaMetadata {
    val title = trackTitles.getOrNull(currentMediaItemIndex)
    return super.getMediaMetadata().buildUpon()
      .setTitle(title?.takeIf { it.isNotBlank() })
      .setArtist(trackArtist.takeIf { it.isNotBlank() })
      .build()
  }

  override fun addListener(listener: Player.Listener) {
    val forwarding = synchronized(listeners) {
      listeners.getOrPut(listener) { ForwardingListener(listener) }
    }
    super.addListener(forwarding)
  }

  override fun removeListener(listener: Player.Listener) {
    val forwarding = synchronized(listeners) { listeners.remove(listener) }
    super.removeListener(forwarding ?: listener)
  }

  fun setTitles(titles: List<String>, artist: String) {
    trackTitles = titles.toList()
    trackArtist = artist
    val metadata = mediaMetadata
    val events = Player.Events(FlagSet.Builder().add(Player.EVENT_MEDIA_METADATA_CHANGED).build())
    val currentListeners = synchronized(listeners) { listeners.keys.toList() }
    currentListeners.forEach { it.onMediaMetadataChanged(metadata) }
    currentListeners.forEach { it.onEvents(this, events) }
  }

  private inner class ForwardingListener(private val listener: Player.Listener) : Player.Listener by listener {
    override fun onMediaItemTransition(mediaItem: androidx.media3.common.MediaItem?, reason: Int) {
      listener.onMediaItemTransition(mediaItem, reason)
      listener.onMediaMetadataChanged(this@QuranMetadataPlayer.mediaMetadata)
    }

    override fun onMediaMetadataChanged(mediaMetadata: MediaMetadata) {
      listener.onMediaMetadataChanged(this@QuranMetadataPlayer.mediaMetadata)
    }

    override fun onEvents(player: Player, events: Player.Events) {
      listener.onEvents(this@QuranMetadataPlayer, events)
    }
  }
}
