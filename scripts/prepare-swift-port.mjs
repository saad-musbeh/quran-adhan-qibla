import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { decompress } from 'fzstd';
import { RECITERS } from '../src/data/reciters.ts';
import { SURAH_RECITATIONS } from '../src/data/surah-recitations.ts';
import { FULL_SURAH_ENDS, VERSE_RECORDING_ENDS } from '../src/data/recitation-ends.ts';
import { TAFSIR_BOOKS } from '../src/data/tafsir.ts';
import { swiftPortIcon } from './swift-port-icon.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const app = path.join(root, 'native-ios/QuranAdhanQibla.swiftpm/Sources/App');
const resources = path.join(app, 'Resources');
await fs.mkdir(resources, { recursive: true });
const json = async (name, value) => fs.writeFile(path.join(resources, `${name}.json`), JSON.stringify(value));
for (const name of ['quran', 'quran-manifest', 'mushaf-pages', 'mushaf-manifest', 'adhkar', 'adhkar-manifest', 'countries']) {
  await fs.copyFile(path.join(root, `src/data/${name}.json`), path.join(resources, `${name}.json`));
}
const cities = JSON.parse(await fs.readFile(path.join(root, 'src/data/cities.json'), 'utf8')).flat();
const grouped = Object.groupBy(cities, city => city.countryCode);
await fs.mkdir(path.join(resources, 'Cities'), { recursive: true });
for (const [country, rows] of Object.entries(grouped)) await fs.writeFile(path.join(resources, 'Cities', `${country}.json`), JSON.stringify(rows));
await json('reciters', RECITERS.map(r => ({ ...r, ...SURAH_RECITATIONS[r.id], fullEnds: FULL_SURAH_ENDS[r.id] ?? {}, verseEnds: VERSE_RECORDING_ENDS[r.id] ?? {} })));
await json('tafsir-catalogue', TAFSIR_BOOKS);
await fs.copyFile(path.join(root, 'assets/mushaf/pages-src/khatm-dua.json'), path.join(resources, 'khatm-dua.json'));
await fs.copyFile(path.join(root, 'assets/quran/AmiriQuran.ttf'), path.join(resources, 'AmiriQuran.ttf'));
await fs.mkdir(path.join(resources, 'Sounds'), { recursive: true });
for (const name of (await fs.readdir(path.join(root, 'assets/adhan'))).filter(f => f.endsWith('.wav'))) await fs.copyFile(path.join(root, 'assets/adhan', name), path.join(resources, 'Sounds', name));
await fs.mkdir(path.join(resources, 'Credits'), { recursive: true });
for (const [src, dest] of [
  ['LICENSE', 'APP-LICENSE.txt'], ['native-ios/ADHAN-LICENSE', 'ADHAN-LICENSE.txt'],
  ['assets/quran/OFL.txt', 'FONT-LICENSE.txt'], ['assets/adhan/PROVENANCE.md', 'ADHAN-PROVENANCE.txt'],
  ['assets/city-data/ATTRIBUTION.txt', 'CITY-ATTRIBUTION.txt'], ['docs/QURAN-DATA.md', 'QURAN-DATA.txt'],
  ['docs/QURAN-AUDIO.md', 'QURAN-AUDIO.txt'],
  ['docs/TAFSIR.md', 'TAFSIR.txt'], ['docs/ADHKAR.md', 'ADHKAR.txt'],
  ['assets/mushaf/LICENSE.txt', 'MUSHAF-LICENSE.txt'], ['assets/mushaf/PROVENANCE.md', 'MUSHAF-PROVENANCE.txt'],
  ['assets/mushaf/UPSTREAM-PROVENANCE.md', 'MUSHAF-UPSTREAM-PROVENANCE.txt'],
  ['assets/licenses/HisnElMuslim-MIT.txt', 'ADHKAR-LICENSE.txt'],
  ['assets/tafsir/TERMS.md', 'TAFSIR-TERMS.txt'], ['assets/tafsir/QURANPEDIA-LICENSE.md', 'QURANPEDIA-LICENSE.txt'],
  ['assets/tafsir/TAFSIR-MIRROR-LICENSE.txt', 'TAFSIR-MIRROR-LICENSE.txt'],
]) await fs.copyFile(path.join(root, src), path.join(resources, 'Credits', dest));
// Preserve every verified SVG path. Only the viewBox changes to fit the original
// artwork inside equal margins. Runtime uses system zlib and WebKit with JavaScript
// disabled; compressed pages stay compact in both the archive and installed app.
const svgDir = path.join(root, 'target/swift-port/svg');
const pageDir = path.join(resources, 'Pages');
await fs.mkdir(svgDir, { recursive: true }); await fs.mkdir(pageDir, { recursive: true });
const manifest = JSON.parse(await fs.readFile(path.join(root, 'src/data/mushaf-manifest.json'), 'utf8'));
const outputHashes = {};
const hitmaps = {};
const renderedBoxes = {};
for (let page = 1; page <= 606; page++) {
  const stem = String(page).padStart(3, '0');
  const source = decompress(await fs.readFile(path.join(root, 'assets/mushaf/pages', `${stem}.svg.zst`)));
  const hash = crypto.createHash('sha256').update(source).digest('hex');
  if (page <= 604 && manifest.sourceSvgSha256[`${stem}.svg`] !== hash) throw new Error(`Unverified Quran page ${page}`);
  const svgPath = path.join(svgDir, `${stem}.svg`);
  await fs.writeFile(svgPath, source);
  outputHashes[`${stem}.svg`] = hash;
  const svg = new TextDecoder().decode(source);
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1].split(/\s+/).map(Number);
  const verses = [...svg.matchAll(/<path\b[^>]*class="ayahPolygon"[^>]*>/g)].map(([tag]) => {
    const attr = name => tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1];
    const subpaths = (attr('d')?.match(/M[^M]+/g) ?? []).map(segment => {
      const numbers = segment.match(/-?\d+(?:\.\d+)?/g).map(Number);
      return Array.from({ length: numbers.length / 2 }, (_, i) => [numbers[i * 2], numbers[i * 2 + 1]]);
    });
    return { surah: Number(attr('surah')), verse: Number(attr('ayah')), subpaths };
  });
  let [x, y, width, height] = viewBox;
  if (page <= 2) {
    const bounds = execFileSync('inkscape', ['--batch-process', '--app-id-tag=codex-swift-port', svgPath, '--query-x', '--query-y', '--query-width', '--query-height'], { encoding: 'utf8' }).trim().split(/\s+/).map(Number);
    if (bounds.length !== 4 || !bounds.every(Number.isFinite)) throw new Error('Invalid opening-page artwork bounds');
    x += bounds[0]; y += bounds[1]; width = bounds[2]; height = bounds[3];
  }
  if (page <= 604) {
    const padX = width * .06 / .88, padY = height * .06 / .88;
    x -= padX; y -= padY; width += 2 * padX; height += 2 * padY;
  }
  const renderedBox = [x, y, width, height];
  const rendered = svg.replace(/viewBox="[^"]+"/, `viewBox="${renderedBox.join(' ')}"`);
  await fs.writeFile(path.join(pageDir, `${stem}.svgz`), gzipSync(Buffer.from(rendered), { level: 9 }));
  renderedBoxes[stem] = renderedBox;
  hitmaps[page] = { viewBox: renderedBox, verses };
}
// Remove only obsolete generated page representations after all new pages exist.
for (const name of await fs.readdir(pageDir)) {
  if (/^\d{3}\.(pdf|sha256)$/.test(name)) await fs.unlink(path.join(pageDir, name));
}
await fs.writeFile(path.join(pageDir, 'rendering-viewboxes.json'), JSON.stringify(renderedBoxes));
await json('page-hitmaps', hitmaps);
await json('swift-port-assets', { schema: 1, sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), quranPages: 604, appendixPages: 2, cityCount: cities.length, sourceSvgSha256: outputHashes });
const icons = path.join(app, 'Assets.xcassets/AppIcon.appiconset');
await fs.mkdir(icons, { recursive: true });
// Follow the current iOS configuration, including future launcher-icon changes.
const icon = await swiftPortIcon(root);
await fs.writeFile(path.join(icons, 'AppIcon.png'), icon.png);
await fs.writeFile(path.join(icons, 'Contents.json'), JSON.stringify({ images: [{ filename: 'AppIcon.png', idiom: 'universal', platform: 'ios', size: '1024x1024' }], info: { author: 'xcode', version: 1 } }));
await fs.writeFile(path.join(app, 'Assets.xcassets/Contents.json'), JSON.stringify({ info: { author: 'xcode', version: 1 } }));
console.log(`Prepared 606 compressed SVG pages, ${cities.length} cities, 20 reciters and ${TAFSIR_BOOKS.length} tafsir editions.`);
