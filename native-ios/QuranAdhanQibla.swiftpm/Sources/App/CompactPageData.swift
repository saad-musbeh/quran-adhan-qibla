import Foundation
import Compression

/// Decode one losslessly compressed vector page only when it is displayed.
enum CompactPageData {
  static func decode(contentsOf url: URL) throws -> Data {
    try decode(Data(contentsOf: url))
  }

  static func decode(_ compressed: Data, limit: Int = 8 * 1024 * 1024) throws -> Data {
    guard compressed.count >= 32, compressed.count <= 2 * 1024 * 1024,
      compressed.prefix(6).elementsEqual([0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]), limit > 0
    else { throw PageError.invalid }
    let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: 64 * 1024)
    defer { buffer.deallocate() }
    var stream = compression_stream(
      dst_ptr: buffer, dst_size: 0, src_ptr: UnsafePointer(buffer), src_size: 0, state: nil)
    guard compression_stream_init(&stream, COMPRESSION_STREAM_DECODE, COMPRESSION_LZMA)
      == COMPRESSION_STATUS_OK
    else { throw PageError.invalid }
    defer { compression_stream_destroy(&stream) }
    var output = Data()
    try compressed.withUnsafeBytes { input in
      stream.src_ptr = input.bindMemory(to: UInt8.self).baseAddress!
      stream.src_size = compressed.count
      while true {
        let remaining = stream.src_size
        stream.dst_ptr = buffer
        stream.dst_size = 64 * 1024
        let status = compression_stream_process(&stream, Int32(COMPRESSION_STREAM_FINALIZE.rawValue))
        let count = 64 * 1024 - stream.dst_size
        guard count <= limit - output.count else { throw PageError.invalid }
        output.append(buffer, count: count)
        if status == COMPRESSION_STATUS_END {
          // Refuse concatenated streams, trailing bytes and empty pages.
          guard stream.src_size == 0, !output.isEmpty else { throw PageError.invalid }
          return
        }
        guard status == COMPRESSION_STATUS_OK,
          count > 0 || stream.src_size < remaining
        else { throw PageError.invalid }
      }
    }
    return output
  }

  enum PageError: LocalizedError {
    case invalid
    var errorDescription: String? {
      "تعذّر قراءة صفحة القرآن. أعد فتح المشروع الكامل. / Cannot read this Quran page. Reopen the complete project."
    }
  }
}
