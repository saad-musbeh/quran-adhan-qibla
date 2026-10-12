import test from 'node:test';
import assert from 'node:assert/strict';
import { paginateQuranPage } from './quran-pagination.ts';
import type { Verse } from './quran.ts';

const verse = (number: number, text: string): Verse => ({ surah: 1, number, globalNumber: number, text, page: 1, juz: 1 });

test('pagination preserves every verse exactly and marks verse continuations', () => {
  const input = [verse(1, 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'), verse(2, 'كلمة '.repeat(35).trim())];
  const parts = paginateQuranPage(input, 40);
  const chunks = parts.flat();
  for (const original of input) {
    assert.equal(chunks.filter(chunk => chunk.verse.number === original.number).map(chunk => chunk.text).join(''), original.text);
  }
  assert.ok(chunks.some(chunk => chunk.continuesAfter));
  assert.ok(chunks.some(chunk => chunk.continuesBefore));
  assert.ok(parts.every(part => part.length > 0));
});

test('empty pages still have one empty part and each verse begins as one readable chunk', () => {
  assert.deepEqual(paginateQuranPage([], 80), [[]]);
  const result = paginateQuranPage([verse(1, 'بِسْمِ اللَّهِ')], 80);
  assert.equal(result.length, 1);
  assert.equal(result[0][0].continuesBefore, false);
  assert.equal(result[0][0].continuesAfter, false);
});
