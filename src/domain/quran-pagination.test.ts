import test from 'node:test';
import assert from 'node:assert/strict';
import { paginateQuranPage } from './quran-pagination.ts';
import type { Verse } from './quran.ts';

const verse = (number: number, text: string): Verse => ({ surah: 1, number, globalNumber: number, text, page: 1, juz: 1 });

test('pagination preserves every verse exactly and marks verse continuations', () => {
  const input = [verse(1, 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ'), verse(2, 'كلمة '.repeat(35).trim())];
  const parts = paginateQuranPage(input, 40);
  const chunks = parts.flat();
  assert.deepEqual(chunks.map(chunk => chunk.verse.number).filter((number, index, all) => index === 0 || number !== all[index - 1]), [1, 2]);
  for (const original of input) {
    const pieces = chunks.filter(chunk => chunk.verse.number === original.number);
    assert.equal(pieces.map(chunk => chunk.text).join(''), original.text);
    for (const [index, piece] of pieces.entries()) {
      assert.equal(piece.continuesBefore, index > 0);
      assert.equal(piece.continuesAfter, index < pieces.length - 1);
    }
  }
  assert.ok(chunks.some(chunk => chunk.continuesAfter));
  assert.ok(chunks.some(chunk => chunk.continuesBefore));
  assert.ok(parts.every(part => part.length > 0));
  assert.ok(parts.length > 1);
  for (const part of parts) {
    // One long chunk may fill a part by itself; otherwise markers must fit too.
    assert.ok(part.length === 1 || part.reduce((size, chunk) => size + chunk.text.length + 3, 0) <= 40);
  }
});

test('empty pages still have one empty part and each verse begins as one readable chunk', () => {
  assert.deepEqual(paginateQuranPage([], 80), [[]]);
  const result = paginateQuranPage([verse(1, 'بِسْمِ اللَّهِ')], 80);
  assert.deepEqual(result, [[{ verse: verse(1, 'بِسْمِ اللَّهِ'), text: 'بِسْمِ اللَّهِ', continuesBefore: false, continuesAfter: false }]]);
});

test('pagination reserves room for verse markers when packing short chunks', () => {
  const input = [verse(1, 'a'.repeat(12)), verse(2, 'b'.repeat(12))]; // Synthetic layout fixture.
  const parts = paginateQuranPage(input, 24);
  assert.deepEqual(parts.map(part => part.map(chunk => chunk.verse.number)), [[1], [2]]);
});
