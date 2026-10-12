import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const expectedVersion = '57.0.5';
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packagePath = join(repoRoot, 'node_modules/expo-audio/package.json');
const sourcePath = join(repoRoot, 'node_modules/expo-audio/ios/AudioPlaylist.swift');

const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
if (packageJson.version !== expectedVersion) {
  throw new Error(`Expected expo-audio ${expectedVersion}, found ${packageJson.version ?? 'unknown'}`);
}

const patches = [
  {
    name: 'serialize end notifications with queue mutations',
    before: String.raw`      forName: .AVPlayerItemDidPlayToEndTime,
      object: nil,
      queue: nil`,
    after: String.raw`      forName: .AVPlayerItemDidPlayToEndTime,
      object: nil,
      queue: .main`,
  },
  {
    name: 'logical track index for loop copies',
    before: String.raw`  private var playerItems: [AVPlayerItem?] = []
  private var previousTrackIndex = 0

  var currentTrackIndex: Int {
    guard let current = ref.currentItem,
          let index = playerItems.firstIndex(where: { $0 === current }) else {
      return min(max(previousTrackIndex, 0), max(sources.count - 1, 0))
    }
    return index
  }`,
    after: String.raw`  private var playerItems: [AVPlayerItem?] = []
  private var loopCopyIndexes: [ObjectIdentifier: Int] = [:]
  private var previousTrackIndex = 0

  var currentTrackIndex: Int {
    guard let current = ref.currentItem,
          let index = playerItems.firstIndex(where: { $0 === current }) ?? loopCopyIndexes[ObjectIdentifier(current)] else {
      return min(max(previousTrackIndex, 0), max(sources.count - 1, 0))
    }
    return index
  }`,
  },
  {
    name: 'prepare a loop cycle at initialization',
    before: String.raw`    ref.actionAtItemEnd = loopMode == .single ? .pause : .advance
    setupPublisher()
    addPlaybackEndNotification()
  }`,
    after: String.raw`    ref.actionAtItemEnd = loopMode == .single ? .pause : .advance
    setupPublisher()
    addPlaybackEndNotification()
    if loopMode == .all {
      prepareLoopCopies()
    }
  }`,
  },
  {
    name: 'preserve the current item when trimming consumed sources',
    before: String.raw`  func add(source: AudioSource) {
    sources.append(source)
    let item = AudioUtils.createAVPlayerItem(from: source)
    if let item {
      ref.insert(item, after: nil)
    }
    playerItems.append(item)
    updateStatus(with: ["trackCount": trackCount])
  }

  func insert(source: AudioSource, at index: Int) {
    guard index >= 0 && index <= sources.count else {
      return
    }

    let wasPlaying = isPlaying
    let resumeIndex: Int
    if ref.currentItem != nil {
      resumeIndex = index <= currentTrackIndex ? currentTrackIndex + 1 : currentTrackIndex
    } else {
      resumeIndex = index
    }
    sources.insert(source, at: index)

    previousTrackIndex = resumeIndex
    rebuildPlaylist(startingAt: resumeIndex)
    if wasPlaying {
      play(at: currentRate)
    }
    updateStatus(with: ["trackCount": trackCount])
  }

  func remove(at index: Int) {
    guard validIndex(index) else {
      return
    }

    let wasPlaying = isPlaying
    let current = currentTrackIndex
    sources.remove(at: index)

    if index == current {
      let resumeIndex = min(current, max(0, sources.count - 1))
      previousTrackIndex = resumeIndex
      rebuildPlaylist(startingAt: resumeIndex)
      if wasPlaying && !sources.isEmpty {
        play(at: currentRate)
      }
    } else if index < current {
      let resumeIndex = current - 1
      previousTrackIndex = resumeIndex
      rebuildPlaylist(startingAt: resumeIndex)
      if wasPlaying {
        play(at: currentRate)
      }
    } else if index < playerItems.count {
      if let item = playerItems[index] {
        ref.remove(item)
      }
      playerItems.remove(at: index)
    }

    updateStatus(with: ["trackCount": trackCount])
  }`,
    after: String.raw`  func add(source: AudioSource) {
    sources.append(source)
    let item = AudioUtils.createAVPlayerItem(from: source)
    if let item {
      ref.insert(item, after: nil)
    }
    playerItems.append(item)
    if loopMode == .all {
      prepareLoopCopies()
    }
    updateStatus(with: ["trackCount": trackCount])
  }

  func insert(source: AudioSource, at index: Int) {
    guard index >= 0 && index <= sources.count else {
      return
    }

    let wasPlaying = isPlaying
    let resumeIndex: Int
    if ref.currentItem != nil {
      resumeIndex = index <= currentTrackIndex ? currentTrackIndex + 1 : currentTrackIndex
    } else {
      resumeIndex = index
    }
    sources.insert(source, at: index)

    previousTrackIndex = resumeIndex
    rebuildPlaylist(startingAt: resumeIndex)
    if wasPlaying {
      play(at: currentRate)
    }
    updateStatus(with: ["trackCount": trackCount])
  }

  func remove(at index: Int) {
    guard validIndex(index) else {
      return
    }

    let wasPlaying = isPlaying
    let current = currentTrackIndex
    sources.remove(at: index)

    if index == current {
      let resumeIndex = min(current, max(0, sources.count - 1))
      previousTrackIndex = resumeIndex
      rebuildPlaylist(startingAt: resumeIndex)
      if wasPlaying && !sources.isEmpty {
        play(at: currentRate)
      }
    } else if index < current {
      playerItems.remove(at: index)
      previousTrackIndex = current - 1
      removeLoopCopies(forRemovedSourceAt: index)
    } else if index < playerItems.count {
      if let item = playerItems[index] {
        ref.remove(item)
      }
      playerItems.remove(at: index)
      removeLoopCopies(forRemovedSourceAt: index)
    }

    updateStatus(with: ["trackCount": trackCount])
  }`,
  },
  {
    name: 'clear loop mappings and prepare or remove loop items with loop mode',
    before: String.raw`  func clear() {
    ref.pause()
    ref.removeAllItems()
    sources.removeAll()
    playerItems.removeAll()
    previousTrackIndex = 0

    updateStatus(with: [
      "trackCount": 0,
      "currentIndex": 0,
      "playing": false
    ])
  }

  func setLoopMode(_ mode: LoopMode) {
    loopMode = mode
    ref.actionAtItemEnd = mode == .single ? .pause : .advance
    updateStatus(with: ["loop": mode.rawValue])
  }`,
    after: String.raw`  func clear() {
    ref.pause()
    ref.removeAllItems()
    sources.removeAll()
    playerItems.removeAll()
    loopCopyIndexes.removeAll()
    previousTrackIndex = 0

    updateStatus(with: [
      "trackCount": 0,
      "currentIndex": 0,
      "playing": false
    ])
  }

  func setLoopMode(_ mode: LoopMode) {
    loopMode = mode
    ref.actionAtItemEnd = mode == .single ? .pause : .advance
    if mode == .all {
      prepareLoopCopies()
    } else {
      removeFutureLoopCopies()
    }
    updateStatus(with: ["loop": mode.rawValue])
  }`,
  },
  {
    name: 'rebuild and replenish loop copies without seeking at loop boundaries',
    before: String.raw`  private func rebuildPlaylist(startingAt index: Int) {
    var items = [AVPlayerItem?](repeating: nil, count: sources.count)
    for i in index..<sources.count {
      items[i] = AudioUtils.createAVPlayerItem(from: sources[i])
    }
    playerItems = items

    ref.removeAllItems()
    for i in index..<sources.count {
      if let item = items[i] {
        ref.insert(item, after: nil)
      }
    }
  }`,
    after: String.raw`  private func rebuildPlaylist(startingAt index: Int) {
    var items = [AVPlayerItem?](repeating: nil, count: sources.count)
    for i in index..<sources.count {
      items[i] = AudioUtils.createAVPlayerItem(from: sources[i])
    }
    playerItems = items
    loopCopyIndexes.removeAll()

    ref.removeAllItems()
    for i in index..<sources.count {
      if let item = items[i] {
        ref.insert(item, after: nil)
      }
    }
    if loopMode == .all {
      prepareLoopCopies()
    }
  }

  /// Keeps one complete cycle of fresh AVPlayerItems after the original queue.
  /// Each consumed copy is replenished in the end observer below, so playback
  /// never has to rebuild or seek the active AVQueuePlayer at the loop point.
  private func prepareLoopCopies() {
    let alreadyQueued = Set(loopCopyIndexes.values)
    for index in sources.indices where !alreadyQueued.contains(index) {
      appendLoopCopy(for: index)
    }
  }

  private func appendLoopCopy(for index: Int) {
    guard validIndex(index), let item = AudioUtils.createAVPlayerItem(from: sources[index]) else {
      return
    }
    loopCopyIndexes[ObjectIdentifier(item)] = index
    ref.insert(item, after: nil)
  }

  private func removeFutureLoopCopies() {
    let current = ref.currentItem
    for item in ref.items() where item !== current && loopCopyIndexes[ObjectIdentifier(item)] != nil {
      ref.remove(item)
      loopCopyIndexes.removeValue(forKey: ObjectIdentifier(item))
    }
  }

  private func removeLoopCopies(forRemovedSourceAt removedIndex: Int) {
    let queuedItems = ref.items()
    var adjustedIndexes: [ObjectIdentifier: Int] = [:]
    for (identifier, logicalIndex) in loopCopyIndexes {
      if logicalIndex == removedIndex {
        if let item = queuedItems.first(where: { ObjectIdentifier($0) == identifier }) {
          ref.remove(item)
        }
      } else {
        adjustedIndexes[identifier] = logicalIndex > removedIndex ? logicalIndex - 1 : logicalIndex
      }
    }
    loopCopyIndexes = adjustedIndexes
  }`,
  },
  {
    name: 'replenish loop copies after consumed items without rebuilding the queue',
    before: String.raw`      guard let self,
            let item = notification.object as? AVPlayerItem,
            let finishedIndex = self.playerItems.firstIndex(where: { $0 === item }) else {
        return
      }

      let isLastTrack = finishedIndex >= self.sources.count - 1

      switch self.loopMode {
      case .single:
        self.ref.seek(to: .zero)
        self.play(at: self.currentRate)

      case .all:
        if isLastTrack {
          self.skipTo(index: 0)
          self.play(at: self.currentRate)
        }

      case .none:
        if isLastTrack {
          self.updateStatus(with: [
            "playing": false,
            "didJustFinish": true
          ])
        }
      }`,
    after: String.raw`      guard let self,
            let item = notification.object as? AVPlayerItem else {
        return
      }

      let itemIdentifier = ObjectIdentifier(item)
      let finishedCopyIndex = self.loopCopyIndexes.removeValue(forKey: itemIdentifier)
      guard let finishedIndex = self.playerItems.firstIndex(where: { $0 === item }) ?? finishedCopyIndex else {
        return
      }

      let isLastTrack = finishedIndex >= self.sources.count - 1

      switch self.loopMode {
      case .single:
        self.ref.seek(to: .zero)
        self.play(at: self.currentRate)

      case .all:
        self.appendLoopCopy(for: finishedIndex)

      case .none:
        if isLastTrack {
          self.updateStatus(with: [
            "playing": false,
            "didJustFinish": true
          ])
        }
      }`,
  },
  {
    name: 'release loop mappings and source references',
    before: String.raw`    owningRegistry?.remove(self)
    cancellables.removeAll()

    if let timeToken {`,
    after: String.raw`    owningRegistry?.remove(self)
    cancellables.removeAll()
    loopCopyIndexes.removeAll()
    playerItems.removeAll()
    sources.removeAll()

    if let timeToken {`,
  },
];

function occurrences(source, block) {
  return source.split(block).length - 1;
}

let source = await readFile(sourcePath, 'utf8');
let didPatch = false;
for (const patch of patches) {
  const oldCount = occurrences(source, patch.before);
  const newCount = occurrences(source, patch.after);
  if (oldCount === 1 && newCount === 0) {
    source = source.replace(patch.before, patch.after);
    didPatch = true;
  } else if (oldCount === 0 && newCount === 1) {
    continue;
  } else {
    throw new Error(`Unexpected expo-audio source for patch "${patch.name}" (old=${oldCount}, patched=${newCount})`);
  }
}

if (didPatch) {
  const temporaryPath = `${sourcePath}.codex-patch-tmp`;
  await writeFile(temporaryPath, source, 'utf8');
  await rename(temporaryPath, sourcePath);
  console.log(`Patched expo-audio ${expectedVersion} AudioPlaylist.swift`);
} else {
  console.log(`expo-audio ${expectedVersion} AudioPlaylist.swift already patched`);
}
