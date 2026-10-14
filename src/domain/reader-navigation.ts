import { parseLocalizedInteger } from './localized-number.ts';
import { verses } from './quran.ts';
import { getMushafVersePage } from '../data/mushaf.ts';

const juzPages = new Map<number, number>();
for (const verse of verses) {
  if (!juzPages.has(verse.juz)) {
    const page = getMushafVersePage(verse.surah, verse.number);
    if (page) juzPages.set(verse.juz, page);
  }
}

/** Invalid edits never clamp/jump to an unintended page. Uses the verified Mushaf index. */
export function readerNavigationTarget(kind: 'page' | 'juz', input: string): number | null {
  const number = parseLocalizedInteger(input);
  if (number === null) return null;
  return kind === 'page' ? number >= 1 && number <= 604 ? number : null : juzPages.get(number) ?? null;
}
