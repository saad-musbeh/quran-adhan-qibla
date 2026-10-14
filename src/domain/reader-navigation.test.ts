import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
(globalThis as typeof globalThis & {require: NodeRequire}).require = createRequire(new URL('./quran.ts', import.meta.url));
const {readerNavigationTarget} = await import('./reader-navigation.ts');
const {verses} = await import('./quran.ts');
const {getMushafPageVerses} = await import('../data/mushaf.ts');

test('direct page entry accepts native digits and preserves exact valid boundaries', () => {
  assert.equal(readerNavigationTarget('page', '١'), 1);
  assert.equal(readerNavigationTarget('page', '۶۰۴'), 604);
  assert.equal(readerNavigationTarget('page', ' 68 '), 68);
  for (const invalid of ['', '0', '605', '-1', '2.5', '٣x', '1e2']) assert.equal(readerNavigationTarget('page', invalid), null);
});

test('every direct juz entry opens its first ayah in the verified printed page index', () => {
  for (let juz = 1; juz <= 30; juz++) {
    const first = verses.find(verse => verse.juz === juz)!;
    const page = readerNavigationTarget('juz', String(juz))!;
    assert.ok(getMushafPageVerses(page).includes(`${first.surah}:${first.number}`));
    if (page > 1) assert.ok(!getMushafPageVerses(page - 1).includes(`${first.surah}:${first.number}`));
  }
  assert.equal(readerNavigationTarget('juz', '٣٠'), 582);
  for (const invalid of ['0', '31', '1.5', '']) assert.equal(readerNavigationTarget('juz', invalid), null);
});
