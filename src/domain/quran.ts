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
const data = require('../data/quran-metadata.json') as { attribution: string; surahs: Surah[] };
let loadedVerses:Verse[]|undefined;
export function allVerses():Verse[]{
  if(!loadedVerses)loadedVerses=(require('../data/quran.json') as {verses:Verse[]}).verses;
  return loadedVerses;
}
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


const surahsByNumber = new Map(surahs.map((surah) => [surah.number, surah]));
const offsets=new Map<number,number>();
let offset=0;for(const surah of surahs){offsets.set(surah.number,offset);offset+=surah.verseCount;}

export function getSurah(number: number): Surah | undefined {
  return surahsByNumber.get(number);
}

export function versesForSurah(number: number): Verse[] {
  const chapter=getSurah(number);if(!chapter)return [];
  const start=offsets.get(number)!;return allVerses().slice(start,start+chapter.verseCount);
}

export function getVerse(surah: number, verse: number): Verse | undefined {
  const chapter=getSurah(surah);if(!chapter||!Number.isInteger(verse)||verse<1||verse>chapter.verseCount)return undefined;
  return allVerses()[offsets.get(surah)!+verse-1];
}

export function getPageVerses(page: number): Verse[] {
  return allVerses().filter(verse=>verse.page===page);
}
