import AVFoundation
import MediaPlayer
import SwiftUI

struct Reciter: Codable, Identifiable, Hashable {
  let id: String
  let name: String
  let arabicName: String
  let directory: String
  let read: Int
  let server: String
  let timed: Bool
  let fullEnds: [String: Double]
  let verseEnds: [String: Double]
  func label(arabic: Bool) -> String { arabic ? arabicName : name }
}

@MainActor final class QuranAudio: ObservableObject {
  enum EndMode: String, CaseIterable, Identifiable {
    case stop, next, repeatSurah
    var id: String { rawValue }
  }
  private struct Track {
    let surah: Int
    let verse: Int?
    let url: URL
    let reciterID: String
    let end: Double?
  }

  @Published private(set) var reciters: [Reciter]
  @Published var selectedReciterID: String {
    didSet {
      if oldValue != selectedReciterID {
        stop()
        error = nil
      }
    }
  }
  @Published var rate: Float = 1 {
    didSet {
      let bounded = rate.isFinite ? min(2, max(0.5, rate)) : 1
      if bounded != rate {
        rate = bounded
        return
      }
      if isPlaying { player.rate = rate }
    }
  }
  @Published var endMode: EndMode = .stop {
    didSet { if oldValue != endMode { applyLiveEndMode() } }
  }
  @Published private(set) var currentSurah = 1
  @Published private(set) var currentVerse: Int?
  @Published private(set) var isPlaying = false
  @Published private(set) var currentTime: Double = 0
  @Published private(set) var duration: Double = 0
  @Published var error: String?
  let downloads: AudioDownloads
  let root: URL
  let verseCounts: [Int]

  private let player = AVQueuePlayer()
  private var periodic: Any?
  private var currentItemObservation: NSKeyValueObservation?
  private var itemEndObserver: NSObjectProtocol?
  private var itemFailureObserver: NSObjectProtocol?
  private var itemStallObserver: NSObjectProtocol?
  private var itemStatusObservation: NSKeyValueObservation?
  private var recoveryAttempts = 0
  private var interruption: NSObjectProtocol?
  private var route: NSObjectProtocol?
  private var tracksByItem: [ObjectIdentifier: Track] = [:]
  private var remainingTracks: [Track] = []
  private var repeatTracks: [Track] = []
  private var isFullSurah = true
  private var finishMode: EndMode = .stop
  private var generation = UUID()
  private var remoteTargets: [(MPRemoteCommand, Any)] = []
  private var shouldResumeAfterInterruption = false

  init(reciters: [Reciter], verseCounts: [Int], root: URL) {
    self.reciters = reciters
    self.verseCounts = verseCounts
    self.root = root
    selectedReciterID =
      reciters.first(where: { $0.id == "husary" })?.id ?? reciters.first?.id ?? "husary"
    downloads = AudioDownloads(root: root)
    configureAudioSession()
    player.actionAtItemEnd = .pause
    periodic = player.addPeriodicTimeObserver(
      forInterval: CMTime(seconds: 0.2, preferredTimescale: 600), queue: .main
    ) { [weak self] time in
      Task { @MainActor in self?.updateTime(time) }
    }
    currentItemObservation = player.observe(\.currentItem, options: [.initial, .new]) {
      [weak self] _, change in
      guard let item = change.newValue ?? nil else { return }
      Task { @MainActor in self?.activate(item) }
    }
    interruption = NotificationCenter.default.addObserver(
      forName: AVAudioSession.interruptionNotification, object: nil, queue: .main
    ) { [weak self] note in
      guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
        let type = AVAudioSession.InterruptionType(rawValue: raw)
      else { return }
      let optionsRaw = note.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
      let options = AVAudioSession.InterruptionOptions(rawValue: optionsRaw)
      Task { @MainActor in
        guard let self else { return }
        if type == .began {
          self.shouldResumeAfterInterruption = self.isPlaying
          self.player.pause()
          self.isPlaying = false
          self.updateMetadata()
        } else if self.shouldResumeAfterInterruption && options.contains(.shouldResume) {
          self.shouldResumeAfterInterruption = false
          self.resume()
        }
      }
    }
    route = NotificationCenter.default.addObserver(
      forName: AVAudioSession.routeChangeNotification, object: nil, queue: .main
    ) { [weak self] note in
      guard let raw = note.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
        AVAudioSession.RouteChangeReason(rawValue: raw) == .oldDeviceUnavailable
      else { return }
      Task { @MainActor in self?.pause() }
    }
    configureRemoteCommands()
  }

  deinit {
    if let periodic { player.removeTimeObserver(periodic) }
    currentItemObservation?.invalidate()
    [itemEndObserver, itemFailureObserver, itemStallObserver, interruption, route].compactMap { $0 }
      .forEach(NotificationCenter.default.removeObserver)
    remoteTargets.forEach { $0.0.removeTarget($0.1) }
  }

  private var activeReciter: Reciter? { reciters.first { $0.id == selectedReciterID } }
  private func configureAudioSession() {
    do {
      try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [])
      try AVAudioSession.sharedInstance().setActive(true)
    } catch { self.error = error.localizedDescription }
  }
  private func addRemoteTarget(
    _ command: MPRemoteCommand,
    _ action: @escaping (MPRemoteCommandEvent) -> MPRemoteCommandHandlerStatus
  ) {
    let target = command.addTarget(handler: action)
    remoteTargets.append((command, target))
  }
  private func configureRemoteCommands() {
    let center = MPRemoteCommandCenter.shared()
    center.playCommand.isEnabled = true
    center.pauseCommand.isEnabled = true
    addRemoteTarget(center.playCommand) { [weak self] _ in
      Task { @MainActor in self?.resume() }
      return .success
    }
    addRemoteTarget(center.pauseCommand) { [weak self] _ in
      Task { @MainActor in self?.pause() }
      return .success
    }
    addRemoteTarget(center.togglePlayPauseCommand) { [weak self] _ in
      Task { @MainActor in self?.toggle() }
      return .success
    }
    addRemoteTarget(center.stopCommand) { [weak self] _ in
      Task { @MainActor in self?.stop() }
      return .success
    }
    addRemoteTarget(center.nextTrackCommand) { [weak self] _ in
      Task { @MainActor in self?.next() }
      return .success
    }
    addRemoteTarget(center.previousTrackCommand) { [weak self] _ in
      Task { @MainActor in self?.previous() }
      return .success
    }
    addRemoteTarget(center.changePlaybackPositionCommand) { [weak self] event in
      guard let event = event as? MPChangePlaybackPositionCommandEvent else {
        return .commandFailed
      }
      Task { @MainActor in self?.seek(to: event.positionTime) }
      return .success
    }
  }

  private func metadata(for track: Track?) {
    guard let track else {
      MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
      return
    }
    let currentReciter = reciters.first { $0.id == track.reciterID }
    let name = currentReciter?.name ?? "Quran"
    var info: [String: Any] = [
      MPMediaItemPropertyTitle: track.verse.map { "Surah \(track.surah), ayah \($0)" }
        ?? "Surah \(track.surah)",
      MPMediaItemPropertyArtist: name,
      MPMediaItemPropertyAlbumTitle: "Quran recitation",
      MPNowPlayingInfoPropertyPlaybackRate: isPlaying ? rate : 0,
      MPNowPlayingInfoPropertyElapsedPlaybackTime: currentTime,
    ]
    if duration > 0 { info[MPMediaItemPropertyPlaybackDuration] = duration }
    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
  }
  private func updateMetadata() {
    metadata(for: player.currentItem.flatMap { tracksByItem[ObjectIdentifier($0)] })
  }
  private func applyLiveEndMode() {
    finishMode = endMode
    guard isFullSurah, let current = player.currentItem,
      let track = tracksByItem[ObjectIdentifier(current)]
    else { return }
    // Keep the current item and its position. Replace only the future queue
    // so the newly selected behavior takes effect at this surah's boundary.
    for queued in player.items() where queued !== current {
      player.remove(queued)
      tracksByItem.removeValue(forKey: ObjectIdentifier(queued))
    }
    remainingTracks.removeAll()
    repeatTracks = []
    if endMode == .repeatSurah, let repeated = makeTrack(surah: track.surah, verse: nil) {
      repeatTracks = [repeated]
    } else if endMode == .next, track.surah < 114 {
      remainingTracks = ((track.surah + 1)...114).compactMap { makeTrack(surah: $0, verse: nil) }
    }
    if let next = remainingTracks.first {
      remainingTracks.removeFirst()
      player.insert(item(for: next), after: current)
    }
  }
  private func makeTrack(surah: Int, verse: Int?) -> Track? {
    guard let reciter = activeReciter else { return nil }
    let chapter = String(format: "%03d", surah)
    let filename = verse.map { String(format: "%03d%03d.mp3", surah, $0) } ?? "surah.mp3"
    let local = root.appendingPathComponent(reciter.id).appendingPathComponent(chapter)
      .appendingPathComponent(filename)
    let url: URL?
    if FileManager.default.fileExists(atPath: local.path) {
      url = local
    } else if let verse {
      url = URL(
        string:
          "https://everyayah.com/data/\(reciter.directory)/\(String(format: "%03d%03d", surah, verse)).mp3"
      )
    } else {
      url = URL(string: "\(reciter.server)\(chapter).mp3")
    }
    guard let url else { return nil }
    let endKey = verse.map { "\(surah):\($0)" } ?? "\(surah)"
    let end = verse == nil ? reciter.fullEnds[endKey] : reciter.verseEnds[endKey]
    return Track(surah: surah, verse: verse, url: url, reciterID: reciter.id, end: end)
  }
  private func item(for track: Track) -> AVPlayerItem {
    let item = AVPlayerItem(url: track.url)
    item.audioTimePitchAlgorithm = .spectral
    if let end = track.end, end.isFinite, end > 0 {
      item.forwardPlaybackEndTime = CMTime(seconds: end, preferredTimescale: 600)
    }
    tracksByItem[ObjectIdentifier(item)] = track
    return item
  }
  private func queue(_ tracks: [Track], repeated: [Track] = [], full: Bool, mode: EndMode) {
    generation = UUID()
    let token = generation
    clearQueue()
    guard let first = tracks.first else {
      error = "No audio source is available."
      return
    }
    error = nil
    repeatTracks = repeated
    remainingTracks = Array(tracks.dropFirst())
    isFullSurah = full
    finishMode = mode
    recoveryAttempts = 0
    let firstItem = item(for: first)
    player.insert(firstItem, after: nil)
    // Keep one next item prepared; refill it as the current item changes.
    if !remainingTracks.isEmpty {
      player.insert(item(for: remainingTracks.removeFirst()), after: firstItem)
    }
    currentSurah = first.surah
    currentVerse = first.verse
    currentTime = 0
    duration = first.end ?? 0
    activate(firstItem)
    player.playImmediately(atRate: rate)
    isPlaying = player.currentItem != nil
    updateMetadata()
    Task { [weak self, weak firstItem] in
      guard let firstItem else { return }
      do {
        let value = try await firstItem.asset.load(.duration)
        await MainActor.run {
          guard let self, self.generation == token, self.player.currentItem === firstItem else {
            return
          }
          let loaded = value.seconds
          if loaded.isFinite && loaded > 0 {
            self.duration = min(loaded, first.end ?? loaded)
            self.updateMetadata()
          }
        }
      } catch {
        await MainActor.run {
          if let self, self.generation == token { self.fail(error.localizedDescription) }
        }
      }
    }
  }
  private func clearQueue() {
    player.pause()
    player.removeAllItems()
    tracksByItem.removeAll()
    remainingTracks.removeAll()
    repeatTracks.removeAll()
    [itemEndObserver, itemFailureObserver, itemStallObserver].compactMap { $0 }.forEach(
      NotificationCenter.default.removeObserver)
    itemStatusObservation?.invalidate()
    itemStatusObservation = nil
    itemEndObserver = nil
    itemFailureObserver = nil
    itemStallObserver = nil
    isPlaying = false
    currentTime = 0
    duration = 0
  }
  private func activate(_ item: AVPlayerItem) {
    guard let track = tracksByItem[ObjectIdentifier(item)] else { return }
    currentSurah = track.surah
    currentVerse = isFullSurah ? nil : track.verse
    currentTime = max(0, item.currentTime().seconds.isFinite ? item.currentTime().seconds : 0)
    let measured = item.duration.seconds
    duration =
      measured.isFinite && measured > 0 ? min(measured, track.end ?? measured) : (track.end ?? 0)
    [itemEndObserver, itemFailureObserver, itemStallObserver].compactMap { $0 }.forEach(
      NotificationCenter.default.removeObserver)
    itemStatusObservation?.invalidate()
    itemEndObserver = NotificationCenter.default.addObserver(
      forName: .AVPlayerItemDidPlayToEndTime, object: item, queue: .main
    ) { [weak self, weak item] _ in
      guard let item else { return }
      Task { @MainActor in self?.itemEnded(item) }
    }
    itemFailureObserver = NotificationCenter.default.addObserver(
      forName: .AVPlayerItemFailedToPlayToEndTime, object: item, queue: .main
    ) { [weak self] note in
      let reason = note.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? Error
      Task { @MainActor in
        self?.recoverOrFail(reason?.localizedDescription ?? "Audio playback failed.")
      }
    }
    itemStallObserver = NotificationCenter.default.addObserver(
      forName: .AVPlayerItemPlaybackStalled, object: item, queue: .main
    ) { [weak self, weak item] _ in
      Task { @MainActor in
        guard let self, let item, self.player.currentItem === item else { return }
        self.recoverOrFail("Audio playback stalled. Check the network and try again.")
      }
    }
    if item.status == .failed {
      fail(item.error?.localizedDescription ?? "Audio playback failed.")
      return
    }
    itemStatusObservation = item.observe(\.status, options: [.new]) {
      [weak self, weak item] observed, _ in
      guard observed.status == .failed || observed.status == .readyToPlay else { return }
      Task { @MainActor in
        guard let self, let item, self.player.currentItem === item else { return }
        if observed.status == .failed {
          self.recoverOrFail(observed.error?.localizedDescription ?? "Audio playback failed.")
        }
      }
    }
    if !remainingTracks.isEmpty, player.items().count < 2, let next = remainingTracks.first {
      remainingTracks.removeFirst()
      player.insert(self.item(for: next), after: item)
    }
    updateMetadata()
  }
  private func itemEnded(_ item: AVPlayerItem) {
    guard player.currentItem === item, tracksByItem[ObjectIdentifier(item)] != nil else { return }
    // .pause prevents AVQueuePlayer advancing before this identity-checked transition.
    if player.items().count > 1 {
      player.advanceToNextItem()
      player.playImmediately(atRate: rate)
      isPlaying = true
      return
    }
    if !remainingTracks.isEmpty {
      let next = remainingTracks.removeFirst()
      player.insert(self.item(for: next), after: item)
      player.advanceToNextItem()
      player.playImmediately(atRate: rate)
      isPlaying = true
      return
    }
    if !repeatTracks.isEmpty || (finishMode == .repeatSurah && isFullSurah) {
      queue(repeatTracks, repeated: repeatTracks, full: isFullSurah, mode: finishMode)
      return
    }
    player.pause()
    isPlaying = false
    currentVerse = isFullSurah ? nil : currentVerse
    updateMetadata()
  }
  private func updateTime(_ time: CMTime) {
    guard let item = player.currentItem, let track = tracksByItem[ObjectIdentifier(item)] else {
      return
    }
    let elapsed = time.seconds
    if elapsed.isFinite { currentTime = max(0, elapsed) }
    if currentTime > 1 { recoveryAttempts = 0 }
    let measured = item.duration.seconds
    if measured.isFinite && measured > 0 { duration = min(measured, track.end ?? measured) }
    updateMetadata()
  }
  private func fail(_ message: String) {
    player.pause()
    isPlaying = false
    error = message
    updateMetadata()
  }
  private func recoverOrFail(_ message: String) {
    guard recoveryAttempts == 0, let oldItem = player.currentItem,
      let track = tracksByItem[ObjectIdentifier(oldItem)]
    else {
      fail(message)
      return
    }
    recoveryAttempts += 1
    let position = oldItem.currentTime().seconds
    let oldDuration = duration
    let resumePosition =
      position.isFinite
      ? min(max(0, position), oldDuration.isFinite && oldDuration > 0 ? oldDuration : position) : 0
    let shouldResume = isPlaying
    let queuedTracks =
      player.items().dropFirst().compactMap { tracksByItem[ObjectIdentifier($0)] } + remainingTracks
    remainingTracks.removeAll()
    player.pause()
    player.removeAllItems()
    tracksByItem.removeAll()
    let replacement = self.item(for: track)
    player.insert(replacement, after: nil)
    for next in queuedTracks { player.insert(self.item(for: next), after: nil) }
    activate(replacement)
    error = nil
    let resumeAfterSeek: (Bool) -> Void = { [weak self, weak replacement] _ in
      Task { @MainActor in
        guard let self, let replacement, self.player.currentItem === replacement else { return }
        if shouldResume {
          self.player.playImmediately(atRate: self.rate)
          self.isPlaying = true
        } else {
          self.player.pause()
          self.isPlaying = false
        }
        self.updateMetadata()
      }
    }
    if resumePosition > 0 {
      replacement.seek(
        to: CMTime(seconds: resumePosition, preferredTimescale: 600),
        completionHandler: resumeAfterSeek)
    } else {
      resumeAfterSeek(true)
    }
  }
  private func resume() {
    guard player.currentItem != nil else {
      error = error ?? "No recording is selected."
      return
    }
    do {
      try AVAudioSession.sharedInstance().setActive(true)
      player.playImmediately(atRate: rate)
      isPlaying = true
      error = nil
      updateMetadata()
    } catch { fail(error.localizedDescription) }
  }
  func toggle() { isPlaying ? pause() : resume() }
  func toggle(surah: Int) { if player.currentItem == nil { playSurah(surah) } else { toggle() } }
  func pause() {
    player.pause()
    isPlaying = false
    updateMetadata()
  }
  func stop() {
    generation = UUID()
    clearQueue()
    currentVerse = nil
    error = nil
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
  }

  func playSurah(_ surah: Int) {
    guard (1...114).contains(surah) else { return }
    // Repeat applies to this surah alone. Next explicitly queues later surahs.
    let last = endMode == .next ? 114 : surah
    let tracks = (surah...last).compactMap { makeTrack(surah: $0, verse: nil) }
    queue(
      tracks, repeated: endMode == .repeatSurah ? Array(tracks.prefix(1)) : [], full: true,
      mode: endMode)
  }
  func playVerse(surah: Int, verse: Int) {
    guard valid(surah: surah, verse: verse), let track = makeTrack(surah: surah, verse: verse)
    else { return }
    queue([track], full: false, mode: .stop)
  }
  func loop(surah: Int, start: Int, end: Int) {
    guard (1...114).contains(surah), verseCounts.indices.contains(surah - 1), start >= 1,
      end >= start, end <= verseCounts[surah - 1]
    else { return }
    let tracks = (start...end).compactMap { makeTrack(surah: surah, verse: $0) }
    queue(tracks, repeated: tracks, full: false, mode: .stop)
  }
  private func valid(surah: Int, verse: Int) -> Bool {
    (1...114).contains(surah) && verseCounts.indices.contains(surah - 1) && verse >= 1
      && verse <= verseCounts[surah - 1]
  }
  func next() {
    guard let item = player.currentItem, let track = tracksByItem[ObjectIdentifier(item)] else {
      return
    }
    if isFullSurah {
      guard track.surah < 114 else { return }
      playSurah(track.surah + 1)
    } else {
      let nextVerse = track.verse ?? 1
      if let first = repeatTracks.first, let last = repeatTracks.last {
        let endVerse = last.verse ?? nextVerse
        let startVerse = first.verse ?? endVerse
        let candidate = nextVerse >= endVerse ? startVerse : nextVerse + 1
        let remaining =
          candidate <= endVerse
          ? (candidate...endVerse).compactMap { makeTrack(surah: track.surah, verse: $0) } : []
        queue(remaining, repeated: repeatTracks, full: false, mode: .stop)
      } else if valid(surah: track.surah, verse: nextVerse + 1) {
        playVerse(surah: track.surah, verse: nextVerse + 1)
      }
    }
  }
  func previous() {
    guard let item = player.currentItem, let track = tracksByItem[ObjectIdentifier(item)] else {
      return
    }
    if currentTime > 3 {
      replay()
      return
    }
    if isFullSurah {
      playSurah(max(1, track.surah - 1))
    } else if let first = repeatTracks.first, let last = repeatTracks.last {
      let start = first.verse ?? 1
      let end = last.verse ?? start
      let previousVerse = track.verse == start ? end : max(start, (track.verse ?? start) - 1)
      let tracks = (previousVerse...end).compactMap { makeTrack(surah: track.surah, verse: $0) }
      queue(tracks, repeated: repeatTracks, full: false, mode: .stop)
    } else {
      let previousVerse = max(1, (track.verse ?? 1) - 1)
      playVerse(surah: track.surah, verse: previousVerse)
    }
  }
  func replay() {
    seek(to: 0)
    if !isPlaying { resume() }
  }
  func seek(to seconds: Double) {
    guard let item = player.currentItem, seconds.isFinite else { return }
    let maximum = duration.isFinite && duration > 0 ? duration : 0
    let clamped = min(max(0, seconds), maximum)
    item.seek(to: CMTime(seconds: clamped, preferredTimescale: 600)) { [weak self, weak item] _ in
      Task { @MainActor in
        guard let self, self.player.currentItem === item else { return }
        self.currentTime = clamped
        self.updateMetadata()
      }
    }
  }
}
