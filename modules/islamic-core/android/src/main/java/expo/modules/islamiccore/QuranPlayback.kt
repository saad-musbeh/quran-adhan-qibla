package expo.modules.islamiccore

import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer

@UnstableApi
internal fun configureQuranPlayback(player: ExoPlayer) {
  // Prepare the next file while the current ayah plays, for streams and downloads.
  player.preloadConfiguration = ExoPlayer.PreloadConfiguration(10_000_000L)
}
