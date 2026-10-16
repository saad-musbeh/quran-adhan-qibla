import { getSurah, getVerse } from './quran.ts';
import type { AudioRange } from './quran-audio.ts';

export type QuranQueuePosition = { surah: number; verse: number };
export type SurahEndMode = 'stop' | 'next' | 'repeat';

/** Keep the whole requested sequence native, including full-surah repeats. */
export function initialQuranQueue(start: QuranQueuePosition, range: AudioRange | null, endMode: SurahEndMode = 'stop'): QuranQueuePosition[] {
  if (range) {
    const chapter = getSurah(range.surah);
    if (!chapter || range.surah !== start.surah || start.verse < range.start || start.verse > range.end
      || !getVerse(range.surah, range.start) || !getVerse(range.surah, range.end)) return [];
    return Array.from({ length: range.end - range.start + 1 }, (_, index) => ({ surah: range.surah, verse: range.start + index }));
  }

  const chapter = getSurah(start.surah);
  if (!chapter || !getVerse(start.surah, start.verse)) return [];
  const first = endMode === 'repeat' ? 1 : start.verse;
  const positions = Array.from({ length: chapter.verseCount - first + 1 }, (_, index) => ({ surah: start.surah, verse: first + index }));
  const nextChapter = endMode === 'next' ? getSurah(start.surah + 1) : undefined;
  if (nextChapter) positions.push(...Array.from({ length: nextChapter.verseCount }, (_, index) => ({ surah: nextChapter.number, verse: index + 1 })));
  return positions;
}

export function nextQuranQueueChapter(queue: readonly QuranQueuePosition[]): QuranQueuePosition[] {
  const last = queue.at(-1);
  const chapter = last ? getSurah(last.surah + 1) : undefined;
  if (!chapter) return [];
  return Array.from({ length: chapter.verseCount }, (_, index) => ({ surah: chapter.number, verse: index + 1 }));
}

export function findQuranQueuePosition(queue: readonly QuranQueuePosition[], position: QuranQueuePosition): number {
  return queue.findIndex(item => item.surah === position.surah && item.verse === position.verse);
}
