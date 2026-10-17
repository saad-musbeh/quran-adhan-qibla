package expo.modules.islamiccore

import android.app.PendingIntent
import android.app.Service
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

  override fun onTaskRemoved(rootIntent: Intent?) {
    // Swiping the app task away is a user-visible stop: without this override
    // the foreground media notification would outlive the task with no JS host
    // left to call detach(). Tear down like detach(), then drop foreground state.
    synchronized(lock) {
      releaseSession()
      activePlayer = null
      activeTitles = emptyList()
      activeQueueUris = emptyList()
      activeArtist = ""
      remoteCommandHandler = null
      if (service === this) service = null
    }
    stopForeground(Service.STOP_FOREGROUND_REMOVE)
    stopSelf()
    super.onTaskRemoved(rootIntent)
  }

  private fun createSession(player: Player, titles: List<String>, artist: String) {
    check(Looper.myLooper() == Looper.getMainLooper())
    releaseSession()
    val wrapper = QuranMetadataPlayer(player, titles, artist) { command -> remoteCommandHandler?.invoke(command) }
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
    private var activeQueueUris: List<String> = emptyList()
    private var activeArtist: String = ""
    private var remoteCommandHandler: ((String) -> Unit)? = null

    fun attach(context: Context, player: Player, titles: List<String>, artist: String, onRemoteCommand: (String) -> Unit) {
      check(Looper.myLooper() == Looper.getMainLooper())
      synchronized(lock) {
        activePlayer = player
        activeTitles = titles.toList()
        activeQueueUris = queueUrisOf(player)
        activeArtist = artist
        remoteCommandHandler = onRemoteCommand
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
      // Titles are published positionally; remember the queue URIs they were
      // built against so current-item metadata can be matched by identity.
      activeQueueUris = activePlayer?.let(::queueUrisOf).orEmpty()
      service?.metadataPlayer?.setTitles(activeTitles, activeArtist)
    }

    fun updateCurrentMetadata(title: String, artist: String) {
      check(Looper.myLooper() == Looper.getMainLooper())
      val player = activePlayer ?: return
      val currentUri = player.currentMediaItem?.localConfiguration?.uri?.toString()
      // The native queue can be rebuilt (new URIs) after JS last published
      // titles. Match the current item by URI, as iOS keys titles by URL, and
      // drop the update when the title table no longer describes the live
      // queue instead of writing at a stale index or padding empty entries.
      val updatedTitles = QuranTitleIndex.updatingAtCurrentUri(
        activeTitles,
        activeQueueUris,
        currentUri,
        title,
      ) ?: return
      updateTitles(updatedTitles, artist, activeQueueUris.indexOf(currentUri))
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
        activeQueueUris = emptyList()
        activeArtist = ""
        remoteCommandHandler = null
        service?.let { current ->
          current.releaseSession()
          current.stopSelf()
        }
      }
    }

    private fun queueUrisOf(player: Player): List<String> =
      (0 until player.mediaItemCount).map { index ->
        player.getMediaItemAt(index).localConfiguration?.uri?.toString() ?: ""
      }
  }
}

/**
 * Index-safe title bookkeeping for the native media queue. iOS keys titles by
 * media URL (see QuranAudioControlsModule.swift); Android keeps a positional
 * title list but only writes an update when the recorded queue URIs still
 * describe the live queue, so a rebuild cannot land a title at a wrong index.
 */
internal object QuranTitleIndex {
  /**
   * Returns [titles] with [title] applied at the index currently occupied by
   * [currentUri] in [queueUris], or null when the update must be ignored:
   * no current item, a missing URI, or a titles/queue size mismatch after a
   * queue rebuild.
   */
  fun updatingAtCurrentUri(
    titles: List<String>,
    queueUris: List<String>,
    currentUri: String?,
    title: String,
  ): List<String>? {
    if (currentUri == null || queueUris.size != titles.size) return null
    val index = queueUris.indexOf(currentUri)
    if (index < 0) return null
    return titles.toMutableList().also { it[index] = title }
  }
}

/** Adds native current-track metadata while forwarding all playback to the same player. */
@UnstableApi
internal class QuranMetadataPlayer(
  player: Player,
  titles: List<String>,
  artist: String,
  private val onRemoteCommand: (String) -> Unit
) : ForwardingPlayer(player) {
  private val listeners = IdentityHashMap<Player.Listener, Player.Listener>()
  private var trackTitles = titles.toList()
  private var trackArtist = artist

  // Only MediaSession controllers operate this wrapper; JavaScript operates
  // the underlying Expo playlist. Keep explicit system pause/stop separate
  // from pauses performed during buffering recovery.
  override fun play() { super.play(); onRemoteCommand("play") }
  override fun pause() { super.pause(); onRemoteCommand("pause") }
  override fun stop() { super.stop(); onRemoteCommand("stop") }
  override fun setPlayWhenReady(playWhenReady: Boolean) {
    super.setPlayWhenReady(playWhenReady)
    onRemoteCommand(if (playWhenReady) "play" else "pause")
  }

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
