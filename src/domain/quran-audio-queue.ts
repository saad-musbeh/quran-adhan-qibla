import { getSurah, getVerse } from './quran.ts';
import type { AudioRange } from './quran-audio.ts';

export type QuranQueuePosition = { surah: number; verse: number };

/** Initial gapless queue: the rest of this surah and, when available, the next surah. */
export function initialQuranQueue(start: QuranQueuePosition, range: AudioRange | null): QuranQueuePosition[] {
  if (range) {
    const chapter = getSurah(range.surah);
    if (!chapter || range.surah !== start.surah || start.verse < range.start || start.verse > range.end
      || !getVerse(range.surah, range.start) || !getVerse(range.surah, range.end)) return [];
    return Array.from({ length: range.end - range.start + 1 }, (_, index) => ({ surah: range.surah, verse: range.start + index }));
  }

  const chapter = getSurah(start.surah);
  if (!chapter || !getVerse(start.surah, start.verse)) return [];
  const positions = Array.from({ length: chapter.verseCount - start.verse + 1 }, (_, index) => ({ surah: start.surah, verse: start.verse + index }));
  const nextChapter = getSurah(start.surah + 1);
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
