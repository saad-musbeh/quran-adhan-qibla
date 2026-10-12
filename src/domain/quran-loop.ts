import { getSurah, getVerse } from './quran.ts';

export type QuranLoopRange = { surah: number; start: number; end: number };

export type QuranLoopRangeResult =
  | { ok: true; surah: number; start: number; end: number }
  | { ok: false; error: 'invalid-key' | 'different-surah' | 'reversed' };

type AyahKey = { surah: number; ayah: number };

/** Parse a canonical `surah:ayah` key and confirm that it names a real Quran verse. */
function parseAyahKey(key: string): AyahKey | null {
  const match = /^(\d+):(\d+)$/.exec(key);
  if (!match) return null;

  const surah = Number(match[1]);
  const ayah = Number(match[2]);
  if (!Number.isInteger(surah) || !Number.isInteger(ayah) || !getVerse(surah, ayah)) return null;
  return { surah, ayah };
}

/**
 * Convert two source ayah keys into an audio loop range.
 * The source order is significant: the first key must be at or before the last key.
 */
export function createQuranLoopRange(firstKey: string, lastKey?: string | null): QuranLoopRangeResult {
  const first = parseAyahKey(firstKey);
  if (!first) return { ok: false, error: 'invalid-key' };
  const last = lastKey == null
    ? { surah: first.surah, ayah: getSurah(first.surah)!.verseCount }
    : parseAyahKey(lastKey);
  if (!last) return { ok: false, error: 'invalid-key' };
  if (first.surah !== last.surah) return { ok: false, error: 'different-surah' };
  if (first.ayah > last.ayah) return { ok: false, error: 'reversed' };
  return { ok: true, surah: first.surah, start: first.ayah, end: last.ayah };
}
