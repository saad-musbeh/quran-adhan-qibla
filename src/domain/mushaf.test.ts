import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {gunzipSync} from 'node:zlib';
import test from 'node:test';

globalThis.require = createRequire(import.meta.url);
const {MUSHAF_PAGES, getMushafPage, getMushafPageVerses, getMushafVersePage} = await import('../data/mushaf.ts');
const quran = JSON.parse(readFileSync(new URL('../data/quran.json', import.meta.url), 'utf8')) as {
  verses: Array<{surah: number; number: number}>;
};
const manifest = JSON.parse(readFileSync(new URL('../data/mushaf-manifest.json', import.meta.url), 'utf8')) as {
  pageCount: number;
  uniqueVerseCount: number;
  sourceSvgSha256: Record<string, string>;
  bundledGzipSha256: Record<string, string>;
};
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

test('all official page references are indexed and map to the Quran corpus', () => {
  assert.equal(MUSHAF_PAGES.length, 604);
  assert.equal(manifest.pageCount, 604);
  assert.equal(manifest.uniqueVerseCount, 6236);
  assert.deepEqual(MUSHAF_PAGES.map(page => page.page), Array.from({length: 604}, (_, index) => index + 1));
  assert.deepEqual(new Set(MUSHAF_PAGES.flatMap(page => page.verseKeys)), new Set(quran.verses.map(verse => `${verse.surah}:${verse.number}`)));

  assert.deepEqual(getMushafPageVerses(37).slice(0, 1), ['2:231']);
  assert.deepEqual(getMushafPageVerses(38).slice(0, 1), ['2:234']);
  assert.deepEqual(getMushafPageVerses(599).slice(0, 1), ['98:6']);
  assert.deepEqual(getMushafPageVerses(599).slice(-1), ['100:5']);
  assert.deepEqual(getMushafPageVerses(600).slice(0, 1), ['100:6']);
  assert.deepEqual(getMushafPageVerses(600).slice(-1), ['102:8']);
  assert.equal(getMushafVersePage(100, 6), 600);
  assert.equal(getMushafVersePage(100, 5), 599);
  assert.equal(getMushafVersePage(115, 1), undefined);
  assert.equal(getMushafPage(0), undefined);
});

test('each bundled page matches its pinned SVG and compressed-source checksums', () => {
  assert.equal(Object.keys(manifest.sourceSvgSha256).length, 604);
  assert.equal(Object.keys(manifest.bundledGzipSha256).length, 604);

  for (const record of MUSHAF_PAGES) {
    const name = `${String(record.page).padStart(3, '0')}.svg`;
    const packed = readFileSync(new URL(`../../assets/mushaf/pages/${name}.gz`, import.meta.url));
    assert.equal(sha256(packed), manifest.bundledGzipSha256[`${name}.gz`], name);
    const svgBytes = gunzipSync(packed);
    assert.equal(sha256(svgBytes), manifest.sourceSvgSha256[name], name);
    const svg = svgBytes.toString('utf8');
    assert.match(svg, /^<\?xml[^>]*\?>\s*<svg\b/, name);
    assert.doesNotMatch(svg, /<\s*(?:script|foreignObject|iframe|object|embed)\b|<!ENTITY\b/i, name);
    assert.doesNotMatch(svg, /\bhref\s*=\s*["'](?!#|data:)[^"']+/i, name);
    assert.doesNotMatch(svg, /url\(\s*["']?(?:https?:|\/\/)/i, name);

    const verseKeys = new Set<string>();
    for (const match of svg.matchAll(/<path\b(?=[^>]*\bclass="[^"]*\bayahPolygon\b[^"]*")(?=[^>]*\bsurah="(\d+)")(?=[^>]*\bayah="(\d+)")[^>]*>/g)) {
      verseKeys.add(`${match[1]}:${match[2]}`);
    }
    assert.deepEqual([...verseKeys].sort(), [...record.verseKeys].sort(), name);
  }
});
