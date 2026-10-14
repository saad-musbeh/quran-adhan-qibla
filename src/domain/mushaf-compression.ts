import { decompress } from 'fzstd';
import { strFromU8 } from 'fflate';

/** Lossless, per-page decoding; the renderer receives the pinned original SVG. */
export function decodeMushafPage(packed: Uint8Array): string {
  return strFromU8(decompress(packed));
}
