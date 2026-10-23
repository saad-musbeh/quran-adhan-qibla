import Foundation
import zlib

/// Decode one bundled page only when it is displayed. Never inflate the whole Quran.
enum CompactPageData {
  static func decode(contentsOf url: URL) throws -> Data {
    try decode(Data(contentsOf: url))
  }

  static func decode(_ compressed: Data, limit: Int = 8 * 1024 * 1024) throws -> Data {
    guard compressed.count >= 18, compressed.count <= 2 * 1024 * 1024,
      compressed[compressed.startIndex] == 0x1f,
      compressed[compressed.startIndex + 1] == 0x8b, limit > 0
    else { throw PageError.invalid }
    var stream = z_stream()
    guard inflateInit2_(&stream, 15 + 16, ZLIB_VERSION, Int32(MemoryLayout<z_stream>.size)) == Z_OK
    else { throw PageError.invalid }
    defer { inflateEnd(&stream) }
    var output = Data()
    let status = compressed.withUnsafeBytes { input -> Int32 in
      stream.next_in = UnsafeMutablePointer<Bytef>(
        mutating: input.bindMemory(to: Bytef.self).baseAddress!)
      stream.avail_in = uInt(compressed.count)
      var code: Int32 = Z_OK
      var buffer = [UInt8](repeating: 0, count: 64 * 1024)
      while code == Z_OK {
        let count = buffer.withUnsafeMutableBytes { chunk -> Int in
          stream.next_out = chunk.bindMemory(to: Bytef.self).baseAddress!
          stream.avail_out = uInt(chunk.count)
          code = inflate(&stream, Z_NO_FLUSH)
          return chunk.count - Int(stream.avail_out)
        }
        guard count <= limit - output.count else { return Z_MEM_ERROR }
        output.append(contentsOf: buffer.prefix(count))
      }
      return code
    }
    // zlib checks the gzip CRC. Refuse truncated, concatenated and oversized inputs.
    guard status == Z_STREAM_END, stream.avail_in == 0, !output.isEmpty else {
      throw PageError.invalid
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
