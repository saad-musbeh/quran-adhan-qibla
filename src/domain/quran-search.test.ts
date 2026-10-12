import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuranSearch, searchQuran } from './quran-search.ts';
import type { Surah, Verse } from './quran.ts';

const chapters: Surah[] = [{ number: 1, arabicName: 'الْفَاتِحَة', transliteration: 'Al-Fatihah', englishName: 'The Opening', verseCount: 1, startPage: 1 }];
const data: Verse[] = [{ surah: 1, number: 1, globalNumber: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', page: 1, juz: 1 }];

test('Arabic search ignores vocalization and normalizes common alef forms', () => {
  assert.equal(normalizeQuranSearch('بِسْمِ اللَّهِ'), 'بسم الله');
  assert.equal(searchQuran('بسم الله', data, chapters).length, 1);
  assert.equal(searchQuran('بِسْمِ اللَّهِ', data, chapters).length, 1);
});

test('English chapter names and verse references are searchable without altering Quran text', () => {
  assert.equal(searchQuran('opening', data, chapters)[0].number, 1);
  assert.equal(searchQuran('1', data, chapters)[0].text, data[0].text);
  assert.equal(data[0].text, 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
});
