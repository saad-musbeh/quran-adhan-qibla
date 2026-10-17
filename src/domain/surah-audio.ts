import { SURAH_RECITATIONS } from '../data/surah-recitations.ts';
import type { ReciterId } from '../data/reciters.ts';
import { getSurah } from './quran.ts';
import type { QuranQueuePosition, SurahEndMode } from './quran-audio-queue.ts';

export type AyahTiming = { ayah: number; start: number; end: number };

export function fullSurahUri(reciter: ReciterId, surah: number): string {
  if (!getSurah(surah)) throw new RangeError('Invalid surah');
  return `${SURAH_RECITATIONS[reciter].server}${String(surah).padStart(3, '0')}.mp3`;
}

/** One native track per surah. Only an explicit Next choice queues other surahs. */
export function fullSurahQueue(surah: number, end: SurahEndMode): QuranQueuePosition[] {
  if (!getSurah(surah)) return [];
  return Array.from({ length: end === 'next' ? 115 - surah : 1 }, (_, i) => ({ surah: surah + i, verse: 1 }));
}

/** Timing data is optional; never guess verse boundaries from elapsed duration. */
export function parseAyahTimings(value: unknown, surah: number): AyahTiming[] {
  const chapter = getSurah(surah);
  if (!chapter || !Array.isArray(value)) return [];
  const result: AyahTiming[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') return [];
    if (row.ayah === 0) continue; // Opening invocation is not a numbered ayah.
    if (row.ayah !== result.length + 1 || typeof row.start_time !== 'number' || typeof row.end_time !== 'number'
      || !Number.isFinite(row.start_time) || !Number.isFinite(row.end_time)
      || row.start_time < 0 || row.end_time <= row.start_time
      || (result.length > 0 && row.start_time / 1000 < result.at(-1)!.end)) return [];
    result.push({ ayah: row.ayah, start: row.start_time / 1000, end: row.end_time / 1000 });
  }
  return result.length === chapter.verseCount ? result : [];
}

export function ayahAtTime(timings: readonly AyahTiming[], time: number): number | null {
  return timings.find(row => time >= row.start && time < row.end)?.ayah ?? null;
}
