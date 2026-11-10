import { parseLocalizedInteger } from './localized-number.ts';
import { allVerses } from './quran.ts';
import { getMushafVersePage } from '../data/mushaf.ts';

let juzPages:Map<number,number>|undefined;
function getJuzPages(){
if(juzPages)return juzPages;
juzPages=new Map();
for (const verse of allVerses()) {
  if (!juzPages.has(verse.juz)) {
    const page = getMushafVersePage(verse.surah, verse.number);
    if (page) juzPages.set(verse.juz, page);
  }
}

return juzPages;
}

/** Invalid edits never clamp/jump to an unintended page. Uses the verified Mushaf index. */
export function readerNavigationTarget(kind: 'page' | 'juz', input: string): number | null {
  const number = parseLocalizedInteger(input);
  if (number === null) return null;
  return kind === 'page' ? number >= 1 && number <= 604 ? number : null : getJuzPages().get(number) ?? null;
}
