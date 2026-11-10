import AVFoundation
import Combine
import Foundation

@MainActor final class AudioDownloads: ObservableObject {
  private struct InventoryKey: Hashable {
    let reciterID: String
    let verseCounts: [Int]
  }
  @Published private(set) var byteCount: Int64 = 0
  @Published private(set) var progress: Double?
  @Published private(set) var status: String?
  @Published private(set) var isDownloading = false
  @Published private(set) var currentSurah: Int?
  @Published private(set) var currentVerse: Int?
  @Published var error: String?

  private let root: URL
  private var job: Task<Void, Never>?
  private var generation = UUID()
  private var activeReciter: String?
  private var activeSurah: Int?
  private var completedFiles = 0
  private var plannedFiles = 0
  private var inventoryCache: [InventoryKey: Set<Int>] = [:]

  init(root: URL) {
    self.root = root
    refreshBytes()
  }
  private func chapterDirectory(_ id: String, _ surah: Int) -> URL {
    root.appendingPathComponent(id, isDirectory: true).appendingPathComponent(
      String(format: "%03d", surah), isDirectory: true)
  }
  private func file(_ reciter: Reciter, _ surah: Int, _ verse: Int?) -> URL {
    chapterDirectory(reciter.id, surah).appendingPathComponent(
      verse.map { String(format: "%03d%03d.mp3", surah, $0) } ?? "surah.mp3")
  }
  func localURL(reciter: Reciter, surah: Int, verse: Int?) -> URL? {
    let url = file(reciter, surah, verse)
    return valid(url) ? url : nil
  }
  func savedSurahs(reciter: Reciter, verseCounts: [Int]) -> [Int] {
    let key = InventoryKey(reciterID: reciter.id, verseCounts: verseCounts)
    if let cached = inventoryCache[key] { return cached.sorted() }
    let completed = Set(
      verseCounts.indices.compactMap { index -> Int? in
        let surah = index + 1
        guard verseCounts[index] > 0,
          localURL(reciter: reciter, surah: surah, verse: nil) != nil,
          (1...verseCounts[index]).allSatisfy({
            localURL(reciter: reciter, surah: surah, verse: $0) != nil
          })
        else { return nil }
        return surah
      })
    inventoryCache[key] = completed
    return completed.sorted()
  }

  func start(reciter: Reciter, surahs: [Int], verseCounts: [Int]) {
    cancel()
    generation = UUID()
    let token = generation
    let selected = Array(
      Set(
        surahs.filter {
          verseCounts.indices.contains($0 - 1) && verseCounts[$0 - 1] > 0 && (1...114).contains($0)
        })
    ).sorted()
    activeReciter = reciter.id
    activeSurah = nil
    error = nil
    status = nil
    completedFiles = 0
    plannedFiles = selected.reduce(0) { $0 + 1 + verseCounts[$1 - 1] }
    progress = selected.isEmpty ? 1 : 0
    isDownloading = !selected.isEmpty
    guard !selected.isEmpty else {
      status = "Download complete"
      return
    }
    job = Task { [weak self] in
      guard let self else { return }
      do {
        for surah in selected {
          try Task.checkCancellation()
          guard self.generation == token else { return }
          self.activeSurah = surah
          self.currentSurah = surah
          let verses: [Int?] = [nil] + (1...verseCounts[surah - 1]).map(Optional.some)
          for verse in verses {
            try Task.checkCancellation()
            guard self.generation == token else { return }
            self.currentVerse = verse
            let destination = self.file(reciter, surah, verse)
            if self.valid(destination) {
              self.markCompleted()
              continue
            }
            let previousSize = self.fileSize(destination)
            try FileManager.default.createDirectory(
              at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
            let remote: URL?
            if let verse {
              remote = URL(
                string:
                  "https://everyayah.com/data/\(reciter.directory)/\(String(format: "%03d%03d", surah, verse)).mp3"
              )
            } else {
              remote = URL(string: "\(reciter.server)\(String(format: "%03d", surah)).mp3")
            }
            guard let remote else { throw DownloadError.invalidSource }
            self.status = "Downloading"
            var request = URLRequest(url: remote)
            request.timeoutInterval = verse == nil ? 600 : 60
            let (temporaryURL, response) = try await URLSession.shared.download(for: request)
            try Task.checkCancellation()
            guard self.generation == token else {
              try? FileManager.default.removeItem(at: temporaryURL)
              return
            }
            guard let http = response as? HTTPURLResponse, http.statusCode == 200,
              let contentType = http.value(forHTTPHeaderField: "Content-Type")?.lowercased(),
              contentType.contains("audio/mpeg")
                || contentType.contains("application/octet-stream"),
              self.hasMP3Signature(temporaryURL), try await self.isDecodableMP3(temporaryURL)
            else {
              try? FileManager.default.removeItem(at: temporaryURL)
              throw DownloadError.invalidRecording
            }
            let staging = destination.appendingPathExtension("\(token.uuidString).partial")
            try? FileManager.default.removeItem(at: staging)
            try FileManager.default.moveItem(at: temporaryURL, to: staging)
            guard self.generation == token else {
              try? FileManager.default.removeItem(at: staging)
              return
            }
            if FileManager.default.fileExists(atPath: destination.path) {
              _ = try FileManager.default.replaceItemAt(
                destination, withItemAt: staging, backupItemName: nil, options: [])
            } else {
              try FileManager.default.moveItem(at: staging, to: destination)
            }
            guard self.generation == token else {
              try? FileManager.default.removeItem(at: destination)
              return
            }
            self.markCompleted()
            self.byteCount = max(0, self.byteCount + self.fileSize(destination) - previousSize)
          }
          self.markSurahComplete(reciterID: reciter.id, surah: surah, verseCounts: verseCounts)
        }
        guard self.generation == token else { return }
        self.isDownloading = false
        self.job = nil
        self.activeReciter = nil
        self.activeSurah = nil
        self.currentSurah = nil
        self.currentVerse = nil
        self.progress = 1
        self.status = "Download complete"
      } catch is CancellationError {
        guard self.generation == token else { return }
        if let reciterID = self.activeReciter, let surah = self.activeSurah {
          self.removePartialFiles(in: self.chapterDirectory(reciterID, surah))
        }
        self.finishCancelled()
      } catch {
        guard self.generation == token else { return }
        if let reciterID = self.activeReciter, let surah = self.activeSurah {
          self.removePartialFiles(in: self.chapterDirectory(reciterID, surah))
        }
        self.error = error.localizedDescription
        self.isDownloading = false
        self.job = nil
        self.activeReciter = nil
        self.activeSurah = nil
        self.currentSurah = nil
        self.currentVerse = nil
        self.progress = nil
        self.status = nil
      }
    }
  }
  private func markCompleted() {
    completedFiles += 1
    progress = plannedFiles == 0 ? 1 : min(1, Double(completedFiles) / Double(plannedFiles))
  }
  func cancel() {
    let wasActive = isDownloading
    let partialDirectory = activeReciter.flatMap { id in
      activeSurah.map { chapterDirectory(id, $0) }
    }
    generation = UUID()
    job?.cancel()
    job = nil
    if let partialDirectory { removePartialFiles(in: partialDirectory) }
    isDownloading = false
    activeReciter = nil
    activeSurah = nil
    currentSurah = nil
    currentVerse = nil
    if wasActive {
      status = "Download cancelled"
      progress = nil
    }
  }
  private func finishCancelled() {
    isDownloading = false
    job = nil
    activeReciter = nil
    activeSurah = nil
    currentSurah = nil
    currentVerse = nil
    progress = nil
    status = "Download cancelled"
  }
  func remove(reciter: Reciter, surah: Int) {
    // A whole-Quran job may be about to reach this chapter. Cancel every job
    // for this reciter before deleting so it cannot recreate the removed files.
    if activeReciter == reciter.id { cancel() }
    let directory = chapterDirectory(reciter.id, surah)
    let removedBytes = directoryBytes(directory)
    try? FileManager.default.removeItem(at: directory)
    byteCount = max(0, byteCount - removedBytes)
    for key in Array(inventoryCache.keys) where key.reciterID == reciter.id {
      inventoryCache[key]?.remove(surah)
    }
  }
  private func valid(_ url: URL) -> Bool {
    guard let attributes = try? FileManager.default.attributesOfItem(atPath: url.path),
      let size = attributes[.size] as? NSNumber, size.int64Value > 0
    else { return false }
    return hasMP3Signature(url)
  }
  private func hasMP3Signature(_ url: URL) -> Bool {
    guard let handle = try? FileHandle(forReadingFrom: url) else { return false }
    defer { try? handle.close() }
    guard let bytes = try? handle.read(upToCount: 4), bytes.count >= 2 else { return false }
    if bytes.starts(with: [0x49, 0x44, 0x33]) { return true }  // ID3
    return bytes[0] == 0xFF && (bytes[1] & 0xE0) == 0xE0  // MPEG frame sync
  }
  private func isDecodableMP3(_ url: URL) async throws -> Bool {
    let asset = AVURLAsset(url: url)
    let playable = try await asset.load(.isPlayable)
    let duration = try await asset.load(.duration).seconds
    return playable && duration.isFinite && duration > 0
  }
  private func refreshBytes() {
    let enumerator = FileManager.default.enumerator(
      at: root, includingPropertiesForKeys: [.fileSizeKey], options: [.skipsHiddenFiles])
    var total: Int64 = 0
    while let url = enumerator?.nextObject() as? URL {
      guard !url.lastPathComponent.hasSuffix(".partial") else { continue }
      total += Int64((try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0)
    }
    byteCount = total
  }
  private func fileSize(_ url: URL) -> Int64 {
    guard let attributes = try? FileManager.default.attributesOfItem(atPath: url.path),
      let size = attributes[.size] as? NSNumber
    else { return 0 }
    return size.int64Value
  }
  private func directoryBytes(_ directory: URL) -> Int64 {
    let enumerator = FileManager.default.enumerator(
      at: directory, includingPropertiesForKeys: [.fileSizeKey], options: [.skipsHiddenFiles])
    var total: Int64 = 0
    while let url = enumerator?.nextObject() as? URL {
      if url.hasDirectoryPath || url.lastPathComponent.hasSuffix(".partial") { continue }
      total += fileSize(url)
    }
    return total
  }
  private func removePartialFiles(in directory: URL) {
    guard
      let enumerator = FileManager.default.enumerator(
        at: directory, includingPropertiesForKeys: nil, options: [.skipsHiddenFiles])
    else { return }
    for case let url as URL in enumerator where url.lastPathComponent.hasSuffix(".partial") {
      try? FileManager.default.removeItem(at: url)
    }
  }
  private func markSurahComplete(reciterID: String, surah: Int, verseCounts: [Int]) {
    for key in Array(inventoryCache.keys)
    where key.reciterID == reciterID && key.verseCounts == verseCounts {
      inventoryCache[key, default: []].insert(surah)
    }
  }
  private enum DownloadError: LocalizedError {
    case invalidRecording
    case invalidSource
    var errorDescription: String? {
      switch self {
      case .invalidRecording: "The server response is not a valid playable MP3 recording."
      case .invalidSource: "The audio source URL is invalid."
      }
    }
  }
}
