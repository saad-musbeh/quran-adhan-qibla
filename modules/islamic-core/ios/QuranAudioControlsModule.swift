import AVFoundation
import ExpoAudio
import ExpoModulesCore
import MediaPlayer

/// Publishes Quran playlist playback to iOS Now Playing and handles system
/// transport commands alongside the JavaScript-owned ExpoAudio playlist.
public final class QuranAudioControlsModule: Module {
  private struct RemoteCommandRegistration {
    let command: MPRemoteCommand
    let target: Any
    let wasEnabled: Bool
    let priorIntervals: [NSNumber]?
  }

  private var playlist: AudioPlaylist?
  private var player: AVQueuePlayer?
  private var titlesByURL: [String: String] = [:]
  private var fallbackTitle = ""
  private var artist = ""
  private var playbackRate: Float = 1
  private var itemObservation: NSKeyValueObservation?
  private var statusObservation: NSKeyValueObservation?
  private var failureObserver: NSObjectProtocol?
  private var rateObservation: NSKeyValueObservation?
  private var timeObserver: Any?
  private var commandTargets: [RemoteCommandRegistration] = []

  public func definition() -> ModuleDefinition {
    Name("QuranAudioControls")
    Events("remoteCommand", "playbackError")

    Function("attach") { (playlist: AudioPlaylist, titles: [String], artist: String) in
      self.scheduleOnMain {
        self.attach(playlist, titles: titles, artist: artist)
      }
    }

    Function("updateMetadata") { (title: String, artist: String) in
      self.scheduleOnMain {
        self.fallbackTitle = title
        self.artist = artist
        if let item = self.player?.currentItem,
           let asset = item.asset as? AVURLAsset {
          self.titlesByURL[asset.url.standardizedFileURL.absoluteString] = title
        }
        self.publishNowPlaying()
      }
    }

    Function("updateTitles") { (titles: [String], artist: String, currentIndex: Int) in
      self.scheduleOnMain {
        self.artist = artist
        self.rebuildTitlesMap(titles, startingAt: currentIndex)
        self.publishNowPlaying()
      }
    }

    Function("updatePlaybackRate") { (rate: Double) in
      self.scheduleOnMain {
        guard rate.isFinite else { return }
        self.playbackRate = Float(min(2, max(0.1, rate)))
        self.publishNowPlaying()
      }
    }

    Function("detach") {
      self.scheduleOnMain { self.detach() }
    }

    OnDestroy {
      self.scheduleOnMain { self.detach() }
    }
  }

  private func attach(_ playlist: AudioPlaylist, titles: [String], artist: String) {
    detach(clearNowPlaying: false)
    self.playlist = playlist
    self.player = playlist.ref
    self.artist = artist
    playbackRate = playlist.ref.rate > 0 ? playlist.ref.rate : 1
    fallbackTitle = titles.first ?? ""
    rebuildTitlesMap(titles, startingAt: 0)

    itemObservation = playlist.ref.observe(\.currentItem, options: [.initial, .new]) { [weak self] _, _ in
      DispatchQueue.main.async {
        self?.observePlaybackFailure()
        self?.publishNowPlaying()
      }
    }
    rateObservation = playlist.ref.observe(\.rate, options: [.new]) { [weak self] _, _ in
      DispatchQueue.main.async {
        self?.publishNowPlaying()
      }
    }
    let interval = CMTime(seconds: 1, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
    timeObserver = playlist.ref.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] _ in
      self?.publishNowPlaying()
    }

    installRemoteCommands()
    observePlaybackFailure()
    failureObserver = NotificationCenter.default.addObserver(
      forName: .AVPlayerItemFailedToPlayToEndTime, object: nil, queue: .main
    ) { [weak self] notification in
      guard let self, let failed = notification.object as? AVPlayerItem,
            failed === self.player?.currentItem else { return }
      self.reportFailure(failed)
    }
    publishNowPlaying()
  }

  private func observePlaybackFailure() {
    statusObservation?.invalidate()
    statusObservation = player?.currentItem?.observe(\.status, options: [.initial, .new]) { [weak self] item, _ in
      guard item.status == .failed else { return }
      DispatchQueue.main.async {
        guard let self, item === self.player?.currentItem else { return }
        self.reportFailure(item)
      }
    }
  }

  private func reportFailure(_ item: AVPlayerItem) {
    let time = item.currentTime().seconds
    sendEvent("playbackError", [
      "message": item.error?.localizedDescription ?? "Audio playback failed.",
      "uri": (item.asset as? AVURLAsset)?.url.absoluteString ?? "",
      "time": time.isFinite ? max(0, time) : 0,
    ])
  }

  private func installRemoteCommands() {
    let center = MPRemoteCommandCenter.shared()
    addTarget(center.playCommand) { [weak self] _ in
      guard let self else { return .commandFailed }
      return self.onMainSync {
        guard let player = self.player else { return .commandFailed }
        player.playImmediately(atRate: self.playbackRate)
        return self.sendRemoteCommand("play", nativeHandled: true)
      }
    }
    addTarget(center.pauseCommand) { [weak self] _ in
      guard let self else { return .commandFailed }
      return self.onMainSync {
        guard let player = self.player else { return .commandFailed }
        player.pause()
        return self.sendRemoteCommand("pause", nativeHandled: true)
      }
    }
    addTarget(center.nextTrackCommand) { [weak self] _ in
      guard let self else { return .commandFailed }
      return self.onMainSync { self.sendRemoteCommand("next") }
    }
    addTarget(center.previousTrackCommand) { [weak self] _ in
      guard let self else { return .commandFailed }
      return self.onMainSync { self.sendRemoteCommand("previous") }
    }
    addTarget(center.skipForwardCommand) { [weak self] _ in
      guard let self else { return .commandFailed }
      return self.onMainSync { self.skip(by: 15) }
    }
    addTarget(center.skipBackwardCommand) { [weak self] _ in
      guard let self else { return .commandFailed }
      return self.onMainSync { self.skip(by: -15) }
    }
    addTarget(center.changePlaybackPositionCommand) { [weak self] event in
      guard let self,
            let positionEvent = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
      return self.onMainSync {
        guard let item = self.player?.currentItem else { return .commandFailed }
        item.seek(to: CMTime(seconds: max(0, positionEvent.positionTime), preferredTimescale: CMTimeScale(NSEC_PER_SEC))) { [weak self] _ in
          DispatchQueue.main.async { self?.publishNowPlaying() }
        }
        return .success
      }
    }
    center.skipForwardCommand.preferredIntervals = [15]
    center.skipBackwardCommand.preferredIntervals = [15]
  }

  private func addTarget(_ command: MPRemoteCommand, handler: @escaping (MPRemoteCommandEvent) -> MPRemoteCommandHandlerStatus) {
    let wasEnabled = command.isEnabled
    let priorIntervals = (command as? MPSkipIntervalCommand)?.preferredIntervals
    command.isEnabled = true
    let target = command.addTarget(handler: handler)
    commandTargets.append(RemoteCommandRegistration(
      command: command,
      target: target,
      wasEnabled: wasEnabled,
      priorIntervals: priorIntervals
    ))
  }

  private func sendRemoteCommand(_ command: String, nativeHandled: Bool = false) -> MPRemoteCommandHandlerStatus {
    guard player != nil else { return .commandFailed }
    sendEvent("remoteCommand", ["command": command, "nativeHandled": nativeHandled])
    return .success
  }

  private func skip(by offset: Double) -> MPRemoteCommandHandlerStatus {
    guard let item = player?.currentItem else { return .commandFailed }
    let current = item.currentTime().seconds
    guard current.isFinite else { return .commandFailed }
    let duration = item.duration.seconds
    let upperBound = duration.isFinite ? duration : Double.greatestFiniteMagnitude
    let destination = min(max(0, current + offset), upperBound)
    item.seek(to: CMTime(seconds: destination, preferredTimescale: CMTimeScale(NSEC_PER_SEC))) { [weak self] _ in
      DispatchQueue.main.async { self?.publishNowPlaying() }
    }
    return .success
  }

  private func publishNowPlaying() {
    guard let player, let item = player.currentItem else { return }
    if let asset = item.asset as? AVURLAsset,
       let title = titlesByURL[asset.url.standardizedFileURL.absoluteString] {
      fallbackTitle = title
    }

    var info: [String: Any] = [
      MPMediaItemPropertyTitle: fallbackTitle,
      MPMediaItemPropertyArtist: artist,
      MPNowPlayingInfoPropertyElapsedPlaybackTime: max(0, item.currentTime().seconds.isFinite ? item.currentTime().seconds : 0),
      MPNowPlayingInfoPropertyPlaybackRate: player.rate,
      MPNowPlayingInfoPropertyDefaultPlaybackRate: playbackRate,
    ]
    let duration = item.duration.seconds
    if duration.isFinite && duration > 0 {
      info[MPMediaItemPropertyPlaybackDuration] = duration
    }
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
  }

  private func rebuildTitlesMap(_ titles: [String], startingAt currentIndex: Int) {
    titlesByURL = [:]
    guard let player else { return }
    // AVPlayerItems are recreated by ExpoAudio when the queue is rebuilt, so
    // key titles by URL and align the remaining queue with its current index.
    let index = max(0, min(currentIndex, titles.count))
    for (item, title) in zip(player.items(), titles.dropFirst(index)) {
      guard let asset = item.asset as? AVURLAsset else { continue }
      titlesByURL[asset.url.standardizedFileURL.absoluteString] = title
    }
    if let currentItem = player.currentItem,
       let asset = currentItem.asset as? AVURLAsset,
       let title = titlesByURL[asset.url.standardizedFileURL.absoluteString] {
      fallbackTitle = title
    }
  }

  private func detach(clearNowPlaying: Bool = true) {
    statusObservation?.invalidate()
    statusObservation = nil
    if let failureObserver { NotificationCenter.default.removeObserver(failureObserver) }
    failureObserver = nil
    itemObservation?.invalidate()
    itemObservation = nil
    rateObservation?.invalidate()
    rateObservation = nil
    if let timeObserver, let player {
      player.removeTimeObserver(timeObserver)
    }
    timeObserver = nil
    for registration in commandTargets {
      registration.command.removeTarget(registration.target)
      registration.command.isEnabled = registration.wasEnabled
      if let skipCommand = registration.command as? MPSkipIntervalCommand,
         let priorIntervals = registration.priorIntervals {
        skipCommand.preferredIntervals = priorIntervals
      }
    }
    commandTargets.removeAll()

    playlist = nil
    player = nil
    titlesByURL.removeAll()
    if clearNowPlaying {
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }
  }

  private func scheduleOnMain(_ body: @escaping () -> Void) {
    if Thread.isMainThread {
      body()
    } else {
      DispatchQueue.main.async(execute: body)
    }
  }

  private func onMainSync<T>(_ body: () -> T) -> T {
    if Thread.isMainThread {
      return body()
    }
    return DispatchQueue.main.sync(execute: body)
  }
}
