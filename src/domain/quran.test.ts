import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

(globalThis as typeof globalThis & { require: NodeRequire }).require = createRequire(import.meta.url);
const { getPageVerses, getSurah, getVerse, quranManifest, surahs, verses, versesForSurah } = await import('./quran.ts');

test('bundled text and official Tanzil metadata cover the complete Quran', () => {
  assert.equal(surahs.length, 114);
  assert.equal(verses.length, 6236);
  assert.equal(quranManifest.surahCount, 114);
  assert.equal(quranManifest.verseCount, 6236);
  assert.match(quranManifest.textSha256, /^[a-f0-9]{64}$/);
  assert.match(quranManifest.metadataSha256, /^[a-f0-9]{64}$/);
  assert.match(quranManifest.licenseNotice, /verbatim copies/);
  assert.match(quranManifest.licenseNotice, /tanzil\.net/);
});

test('verse IDs are contiguous, chapter counts agree with metadata, and each verse has valid page and juz', () => {
  assert.equal(new Set(verses.map((verse) => `${verse.surah}:${verse.number}`)).size, 6236);
  let globalNumber = 1;
  for (const surah of surahs) {
    const chapter = versesForSurah(surah.number);
    assert.equal(chapter.length, surah.verseCount, `surah ${surah.number}`);
    assert.equal(chapter[0]?.number, 1);
    assert.ok(surah.startPage >= 1 && surah.startPage <= 604);
    for (const [index, verse] of chapter.entries()) {
      assert.equal(verse.globalNumber, globalNumber++);
      assert.equal(verse.number, index + 1);
      assert.ok(verse.text.trim().length > 0);
      assert.ok(Number.isInteger(verse.page) && verse.page >= 1 && verse.page <= 604);
      assert.ok(Number.isInteger(verse.juz) && verse.juz >= 1 && verse.juz <= 30);
    }
  }
  assert.equal(globalNumber, 6237);
  assert.equal(getVerse(1, 1)?.text, 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ');
  assert.equal(getVerse(114, 6)?.globalNumber, 6236);
});

test('surah, verse, and Medina page lookup return stable grouped entries', () => {
  assert.equal(getSurah(9)?.englishName, 'The Repentance');
  assert.equal(getSurah(115), undefined);
  assert.equal(getVerse(2, 286)?.number, 286);
  assert.equal(getVerse(2, 287), undefined);
  const page = getPageVerses(2);
  assert.ok(page.length > 0);
  assert.ok(page.every((verse) => verse.page === 2));
});
