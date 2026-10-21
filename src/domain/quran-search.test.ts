import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { normalizeQuranSearch, searchQuran } from './quran-search.ts';

globalThis.require = createRequire(import.meta.url);
const { surahs, verses } = await import('./quran.ts');
// Use a small subset of the verified corpus with unrelated chapters as decoys.
const chapters = surahs.filter(surah => [1, 112, 114].includes(surah.number));
const data = verses.filter(verse => [1, 112, 114].includes(verse.surah));
const keys = (query: string, limit?: number) => searchQuran(query, data, chapters, limit).map(verse => `${verse.surah}:${verse.number}`);

test('Arabic search ignores vocalization and normalizes common letter forms', () => {
  assert.equal(normalizeQuranSearch('بِسْمِ اللَّهِ'), 'بسم الله');
  assert.equal(normalizeQuranSearch(' أ إ آ ٱ ى ة '), 'ا ا ا ا ي ه');
  assert.deepEqual(keys('بسم الله'), ['1:1']);
  assert.deepEqual(keys('بِسْمِ اللَّهِ'), ['1:1']);
});

test('chapter names select the matching chapter and verse numbers select matching ayahs', () => {
  assert.deepEqual(keys('opening'), ['1:1', '1:2', '1:3', '1:4', '1:5', '1:6', '1:7']);
  assert.deepEqual(keys('الإخلاص'), ['112:1', '112:2', '112:3', '112:4']);
  assert.deepEqual(keys('1'), ['1:1', '112:1', '114:1']);
});

test('empty and unmatched queries return nothing; limits retain corpus order without changing source text', () => {
  const original = structuredClone(data);
  assert.deepEqual(keys('  '), []);
  assert.deepEqual(keys('not-a-verse'), []);
  assert.deepEqual(keys('opening', 3), ['1:1', '1:2', '1:3']);
  assert.deepEqual(data, original);
});
