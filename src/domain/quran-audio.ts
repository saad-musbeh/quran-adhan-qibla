import { getSurah, getVerse } from './quran.ts';

export type AudioRange = { surah: number; start: number; end: number };
export type VersePosition = { surah: number; verse: number };

export function verseKey(surah: number, verse: number): string {
  return `${surah}:${verse}`;
}

export function audioCacheKey(reciter: string, surah: number, verse: number): string {
  return `quran-audio-v1/${reciter}/${String(surah).padStart(3, '0')}${String(verse).padStart(3, '0')}.mp3`;
}

export function isValidAudioDownloadResponse(status: number, mimeType: string | null | undefined, headers: Record<string, string>): boolean {
  const headerType = Object.entries(headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1];
  const contentType = (mimeType ?? headerType)?.split(';', 1)[0]?.trim().toLowerCase();
  return status === 200 && (contentType === 'audio/mpeg' || contentType === 'application/octet-stream');
}

export function createAudioRange(surah: number, start: number, end: number): AudioRange {
  const chapter = getVerse(surah, 1);
  const last = getVerse(surah, end);
  const first = getVerse(surah, start);
  if (!chapter || !first || !last || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    throw new RangeError('Invalid surah verse range');
  }
  return { surah, start, end };
}

/** Move within a range, wrapping at its end, or continue through the complete Quran. */
export function nextVersePosition(current: VersePosition, range: AudioRange | null): VersePosition | null {
  if (range && current.surah === range.surah && current.verse >= range.end) {
    return { surah: range.surah, verse: range.start };
  }
  const verse = getVerse(current.surah, current.verse);
  if (!verse) return null;
  const next = getVerse(current.surah, current.verse + 1);
  if (next) return { surah: next.surah, verse: next.number };
  const nextChapter = getVerse(current.surah + 1, 1);
  return nextChapter ? { surah: nextChapter.surah, verse: nextChapter.number } : null;
}

export function previousVersePosition(current: VersePosition): VersePosition | null {
  if (current.verse > 1 && getVerse(current.surah, current.verse - 1)) {
    return { surah: current.surah, verse: current.verse - 1 };
  }
  const previousSurah = getSurah(current.surah - 1);
  return previousSurah ? { surah: previousSurah.number, verse: previousSurah.verseCount } : null;
}

export function previousPositionInRange(current: VersePosition, range: AudioRange | null): VersePosition | null {
  if (range && current.surah === range.surah && current.verse <= range.start) {
    return { surah: range.surah, verse: range.end };
  }
  return previousVersePosition(current);
}
