export type Surah = {
  number: number;
  arabicName: string;
  transliteration: string;
  englishName: string;
  verseCount: number;
  startPage: number;
};

export type Verse = {
  surah: number;
  number: number;
  globalNumber: number;
  text: string;
  page: number;
  juz: number;
};

declare const require: (path: string) => unknown;
const data = require('../data/quran.json') as { attribution: string; surahs: Surah[]; verses: Verse[] };
export const quranTextAttribution = data.attribution;
export const quranManifest = require('../data/quran-manifest.json') as {
  textSource: string;
  metadataSource: string;
  retrieved: string;
  textSha256: string;
  metadataSha256: string;
  surahCount: number;
  verseCount: number;
  copyright: string;
  licenseNotice: string;
};
export const surahs = data.surahs;
export const verses = data.verses;

const surahsByNumber = new Map(surahs.map((surah) => [surah.number, surah]));
const versesByKey = new Map(verses.map((verse) => [`${verse.surah}:${verse.number}`, verse]));
const versesBySurah = new Map<number, Verse[]>();
const versesByPage = new Map<number, Verse[]>();
for (const verse of verses) {
  const chapter = versesBySurah.get(verse.surah) ?? [];
  chapter.push(verse);
  versesBySurah.set(verse.surah, chapter);
  const page = versesByPage.get(verse.page) ?? [];
  page.push(verse);
  versesByPage.set(verse.page, page);
}

export function getSurah(number: number): Surah | undefined {
  return surahsByNumber.get(number);
}

export function versesForSurah(number: number): Verse[] {
  return versesBySurah.get(number) ?? [];
}

export function getVerse(surah: number, verse: number): Verse | undefined {
  return versesByKey.get(`${surah}:${verse}`);
}

export function getPageVerses(page: number): Verse[] {
  return versesByPage.get(page) ?? [];
}
