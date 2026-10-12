/** Offline index for the original Hafs/KFQC Madinah Mushaf vector pages. */
export type MushafPageRecord = {
  page: number;
  width: number;
  height: number;
  verseKeys: string[];
};

// The path is also resolvable from the Node test harness's global Metro shim.
export const MUSHAF_PAGES = require('../data/mushaf-pages.json') as MushafPageRecord[];
export const MUSHAF_PAGE_COUNT = 604;
export const MUSHAF_VERSE_COUNT = 6236;

export function getMushafPage(page: number): MushafPageRecord | undefined {
  if (!Number.isInteger(page) || page < 1 || page > MUSHAF_PAGE_COUNT) return undefined;
  return MUSHAF_PAGES[page - 1];
}

export function getMushafPageVerses(page: number): readonly string[] {
  return getMushafPage(page)?.verseKeys ?? [];
}

const firstPageByVerse = new Map<string, number>();
for (const page of MUSHAF_PAGES) {
  for (const key of page.verseKeys) {
    if (!firstPageByVerse.has(key)) firstPageByVerse.set(key, page.page);
  }
}

/** Returns the first page on which an ayah appears (some ayahs span pages). */
export function getMushafVersePage(surah: number, ayah: number): number | undefined {
  if (!Number.isInteger(surah) || !Number.isInteger(ayah) || surah < 1 || surah > 114 || ayah < 1) return undefined;
  const key = `${surah}:${ayah}`;
  return firstPageByVerse.get(key);
}
