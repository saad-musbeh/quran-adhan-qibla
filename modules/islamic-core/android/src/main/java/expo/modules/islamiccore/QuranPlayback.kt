package expo.modules.islamiccore

import androidx.media3.common.util.UnstableApi
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer

@UnstableApi
internal fun configureQuranPlayback(player: ExoPlayer) {
  // Prepare the next file while the current ayah plays, for streams and downloads.
  player.preloadConfiguration = ExoPlayer.PreloadConfiguration(10_000_000L)
}

/** Ends audited recordings in the native queue, including background/repeat playback. */
@UnstableApi
internal fun quranMediaItemWithEnd(item: MediaItem, endSeconds: Double?): MediaItem {
  if (endSeconds == null || !endSeconds.isFinite() || endSeconds <= 0 || endSeconds > Long.MAX_VALUE / 1000.0) return item
  return item.buildUpon().setClippingConfiguration(
    MediaItem.ClippingConfiguration.Builder().setEndPositionMs((endSeconds * 1000).toLong()).build()
  ).build()
}

@UnstableApi
internal fun applyQuranTrackEnds(player: Player, trackEnds: Map<String, Double>) {
  for (index in 0 until player.mediaItemCount) {
    val item = player.getMediaItemAt(index)
    val uri = item.localConfiguration?.uri?.toString() ?: continue
    val bounded = quranMediaItemWithEnd(item, trackEnds[uri])
    if (bounded !== item) player.replaceMediaItem(index, bounded)
  }
}
