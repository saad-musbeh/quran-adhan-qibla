import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
globalThis.require = createRequire(import.meta.url);
const { juzArabic, chapterNames, printedPageVerses } = await import('./quran-reader.ts');

test('all thirty parts have Arabic running labels, including cached page thirty', () => {
  assert.equal(juzArabic(26), 'الجزء السادس والعشرون');
  assert.equal(juzArabic(30), 'الجزء الثلاثون');
  const labels = Array.from({length:30},(_,i)=>juzArabic(i+1));
  assert.equal(new Set(labels).size,30);
  assert.ok(labels.every(label => !label.includes('undefined')));
});

test('page headings follow printed page boundaries and keep Arabic surah names', () => {
  const page = printedPageVerses(600);
  assert.equal(page[0].surah,100);
  assert.equal(page[0].number,6);
  assert.equal(chapterNames(page),'سورة القارعة  سورة التكاثر');
  assert.equal(juzArabic(printedPageVerses(601)[0].juz),'الجزء الثلاثون');
});
