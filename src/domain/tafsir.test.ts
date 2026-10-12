import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const {TAFSIR_BOOKS} = await import('../data/tafsir.ts');
const tafsir = JSON.parse(readFileSync(new URL('../data/tafsir.json', import.meta.url), 'utf8')) as {
  edition: {title: string; translationKey: string; publisher: string; source: string; version: string; versionDate: string};
  verses: Record<string, {arabicText: string; text: string; footnotes: string | null}>;
};
const quran = JSON.parse(readFileSync(new URL('../data/quran.json', import.meta.url), 'utf8')) as {
  surahs: Array<{number: number; verseCount: number}>;
};
const manifest = JSON.parse(readFileSync(new URL('../../assets/tafsir/manifest.json', import.meta.url), 'utf8')) as {
  surahCount: number;
  ayahCount: number;
  version: string;
  versionDate: string;
  verifiedHomepageCard: {title: string; publisher: string; version: string};
  metadataSourceUrl: string;
  metadataPageSha256: string;
  rawResponseSha256BySurah: Record<string, string>;
  sourceBodySha256: string;
};

test('catalogue lists only the two verified QuranEnc editions and their pinned releases', () => {
  assert.deepEqual(TAFSIR_BOOKS.map(book => book.id), ['moyassar', 'mokhtasar']);
  assert.deepEqual(TAFSIR_BOOKS.map(book => book.apiKey), ['arabic_moyassar', 'arabic_mokhtasar']);
  assert.deepEqual(TAFSIR_BOOKS.map(book => book.version), ['V1.0.0 (2017-02-15)', 'V1.0.0 (2017-02-15)']);
  assert.deepEqual(TAFSIR_BOOKS.map(book => book.url), [
    'https://quranenc.com/ar/browse/arabic_moyassar',
    'https://quranenc.com/ar/browse/arabic_mokhtasar',
  ]);
  assert.equal(TAFSIR_BOOKS[0].publisher, 'مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة');
  assert.equal(TAFSIR_BOOKS[1].publisher, 'مركز تفسير للدراسات القرآنية');
});

test('development provenance fixture covers canonical Tanzil ayah keys in order', () => {
  const expectedKeys = quran.surahs.flatMap(surah =>
    Array.from({length: surah.verseCount}, (_, index) => `${surah.number}:${index + 1}`),
  );
  assert.equal(expectedKeys.length, 6236);
  assert.deepEqual(Object.keys(tafsir.verses), expectedKeys);
  for (const [key, entry] of Object.entries(tafsir.verses)) {
    assert.ok(entry.arabicText.length > 0, `${key} retains source Arabic`);
    assert.ok(entry.text.length > 0, `${key} has the source tafsir`);
    assert.ok(entry.footnotes === null || typeof entry.footnotes === 'string', `${key} retains valid source footnotes`);
  }
});

test('fixture is labelled as Moyassar and its release, retrieval, and response hashes are retained', () => {
  assert.equal(tafsir.edition.title, TAFSIR_BOOKS[0].title);
  assert.equal(tafsir.edition.translationKey, TAFSIR_BOOKS[0].apiKey);
  assert.equal(tafsir.edition.publisher, TAFSIR_BOOKS[0].publisher);
  assert.equal(tafsir.edition.source, 'QuranEnc.com');
  assert.equal(`${tafsir.edition.version} (${tafsir.edition.versionDate})`, TAFSIR_BOOKS[0].version);
  assert.equal(manifest.surahCount, 114);
  assert.equal(manifest.ayahCount, 6236);
  assert.equal(manifest.version, tafsir.edition.version);
  assert.equal(manifest.versionDate, tafsir.edition.versionDate);
  assert.equal(manifest.verifiedHomepageCard.title, 'اللغة العربية - التفسير الميسر');
  assert.equal(manifest.verifiedHomepageCard.publisher, 'صادر عن مجمع الملك فهد لطباعة المصحف الشريف بالمدينة المنورة.');
  assert.equal(manifest.verifiedHomepageCard.version, `${manifest.version} (${manifest.versionDate})`);
  assert.equal(manifest.metadataSourceUrl, 'https://quranenc.com/ar/home/');
  assert.match(manifest.metadataPageSha256, /^[a-f0-9]{64}$/);
  assert.equal(Object.keys(manifest.rawResponseSha256BySurah).length, 114);
  assert.deepEqual(Object.keys(manifest.rawResponseSha256BySurah), Array.from({length: 114}, (_, i) => String(i + 1)));
  assert.ok(Object.values(manifest.rawResponseSha256BySurah).every(hash => /^[a-f0-9]{64}$/.test(hash)));
  const content = JSON.stringify(tafsir.verses);
  assert.equal(createHash('sha256').update(content, 'utf8').digest('hex'), manifest.sourceBodySha256);
});
