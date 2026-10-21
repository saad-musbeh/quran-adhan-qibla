import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import test from 'node:test';

(globalThis as typeof globalThis & { require: NodeRequire }).require = createRequire(import.meta.url);
const { getPageVerses, getSurah, getVerse, quranManifest, surahs, verses, versesForSurah } = await import('./quran.ts');

test('bundled text and official Tanzil metadata cover the complete Quran', () => {
  assert.equal(surahs.length, 114);
  assert.equal(verses.length, 6236);
  assert.equal(quranManifest.surahCount, 114);
  assert.equal(quranManifest.verseCount, 6236);
  assert.equal(quranManifest.textSha256, 'af9311c521b5dadab01ea1ef259c281ffa83cf224bad24ee89469ce1c3c72916');
  assert.equal(quranManifest.metadataSha256, '8867c1d88191472adec9db694b3cd9f135b1a2ef580574d32cf888dcb22c5c7a');
  // Pin the imported 2026-10-11 snapshot documented in docs/QURAN-DATA.md.
  // Source XML hashes alone do not detect edits to the bundled text/metadata.
  // This is a regression guard, not a fresh verification of upstream XML.
  assert.equal(createHash('sha256').update(JSON.stringify({ surahs, verses })).digest('hex'),
    '19dc118ef84af374c38d7b4ddf0aaf381af4230b29329ff96581d0744a3b8968');
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
