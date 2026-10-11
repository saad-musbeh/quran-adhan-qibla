import type { Surah, Verse } from './quran';

const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalizeQuranSearch(value: string): string {
  return value.toLocaleLowerCase().normalize('NFKC').replace(ARABIC_MARKS, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim().replace(/\s+/g, ' ');
}

export function searchQuran(query: string, verses: readonly Verse[], surahs: readonly Surah[], limit = 40): Verse[] {
  const normalized = normalizeQuranSearch(query);
  if (!normalized) return [];
  const bySurah = new Map(surahs.map(s => [s.number, normalizeQuranSearch(`${s.arabicName} ${s.englishName} ${s.transliteration}`)]));
  const found: Verse[] = [];
  for (const verse of verses) {
    const searchable = normalizeQuranSearch(`${verse.text} ${bySurah.get(verse.surah) ?? ''} ${verse.number}`);
    if (searchable.includes(normalized)) {
      found.push(verse);
      if (found.length >= Math.max(1, limit)) break;
    }
  }
  return found;
}
