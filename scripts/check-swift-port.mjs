import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { decompress } from 'fzstd';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { swiftPortIcon } from './swift-port-icon.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const project = path.join(root, 'native-ios/QuranAdhanQibla.swiftpm');
const resources = path.join(project, 'Sources/App/OfflineContent');
const expectedIcon = await swiftPortIcon(root);
const bundledIcon = await fs.readFile(path.join(project, 'Sources/App/Assets.xcassets/AppIcon.appiconset/AppIcon.png'));
assert.deepEqual(
  bundledIcon, expectedIcon.png,
  'The app playground uses the configured current iOS icon',
);
assert.equal(bundledIcon.readUInt32BE(16), 1024, 'App icon width matches its asset-catalog declaration');
assert.equal(bundledIcon.readUInt32BE(20), 1024, 'App icon height matches its asset-catalog declaration');
const manifest = await fs.readFile(path.join(project, 'Package.swift'), 'utf8');
const appleBranch = manifest.split('#else')[0];
assert.ok(appleBranch.includes('.iOSApplication('), 'The Apple branch declares an app product');
assert.ok(!appleBranch.includes('.testTarget('), 'Host tests must stay out of the app playground build graph');
const read = async name => JSON.parse(await fs.readFile(path.join(resources, `${name}.json`), 'utf8'));
const quran = await read('quran');
const hits = await read('page-hitmaps');
assert.equal(quran.surahs.length, 114);
assert.equal(quran.verses.length, 6236);
assert.equal(new Set(quran.verses.map(v => `${v.surah}:${v.number}`)).size, 6236);
assert.equal((await read('reciters')).length, 20);
assert.equal((await read('tafsir-catalogue')).length, 36);
assert.deepEqual(Object.values(await read('adhkar')).map(rows => rows.length), [24, 22, 8]);
assert.equal((await read('swift-port-assets')).cityCount, 224763);
for (const name of ['quran', 'quran-manifest', 'mushaf-manifest', 'adhkar', 'countries']) {
  assert.deepEqual(await fs.readFile(path.join(resources, `${name}.json`)), await fs.readFile(path.join(root, `src/data/${name}.json`)), `${name} preserves its verified source bytes`);
}
let cityCount = 0;
for (const country of await read('countries')) {
  const cities = JSON.parse(await fs.readFile(path.join(resources, 'Cities', `${country.code}.json`)));
  assert.equal(cities.length, country.cityCount);
  assert.ok(cities.every(c => c.countryCode === country.code && Math.abs(c.latitude) <= 90 && Math.abs(c.longitude) <= 180));
  cityCount += cities.length;
}
assert.equal(cityCount, 224763);
const assetManifest = await read('swift-port-assets');
const canonical = new Set(quran.verses.map(v => `${v.surah}:${v.number}`));
const covered = new Set();
for (let page = 1; page <= 606; page++) {
  const file = path.join(resources, 'Pages', `${String(page).padStart(3, '0')}.svg.xz`);
  const decoded = execFileSync('xz', ['--decompress', '--stdout', file], { maxBuffer: 8 * 1024 * 1024 });
  const svg = decoded.toString('utf8');
  const stem = String(page).padStart(3, '0');
  assert.equal(crypto.createHash('sha256').update(decoded).digest('hex'), assetManifest.renderedSvgSha256[`${stem}.svg`]);
  const original = Buffer.from(decompress(await fs.readFile(path.join(root, 'assets/mushaf/pages', `${stem}.svg.zst`))));
  const sourceHashes = assetManifest.sourceSvgSha256;
  assert.equal(crypto.createHash('sha256').update(original).digest('hex'), sourceHashes[`${stem}.svg`]);
  // Every byte except the intentional fit/crop viewBox is identical to the source.
  const normalizeBox = text => text.replace(/viewBox="[^"]+"/, 'viewBox="SOURCE"');
  assert.equal(normalizeBox(svg), normalizeBox(original.toString('utf8')), `page ${page}: original SVG paths/attributes unchanged`);
  assert.ok(!/<(?:script|image|foreignObject)\b|(?:href|src)\s*=/i.test(svg), `page ${page}: self-contained static artwork`);
  const map = hits[page];
  assert.deepEqual(svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number), map.viewBox);
  assert.equal(map.viewBox.length, 4);
  assert.ok(map.viewBox.every(Number.isFinite) && map.viewBox[2] > 0 && map.viewBox[3] > 0);
  for (const verse of map.verses) {
    const key = `${verse.surah}:${verse.verse}`;
    assert.ok(canonical.has(key), `page ${page}: canonical verse ${key}`);
    covered.add(key);
    for (const points of verse.subpaths) {
      assert.ok(points.length >= 3);
      for (const [x, y] of points) {
        assert.ok(x >= map.viewBox[0] - 0.1 && x <= map.viewBox[0] + map.viewBox[2] + 0.1, `page ${page}: verse hit target fits horizontally`);
        assert.ok(y >= map.viewBox[1] - 0.1 && y <= map.viewBox[1] + map.viewBox[3] + 0.1, `page ${page}: verse hit target fits vertically`);
      }
    }
  }
}
assert.equal(covered.size, 6236);
for (const file of (await fs.readdir(path.join(resources, 'Sounds'))).filter(f => f.endsWith('.wav'))) {
  const bytes = await fs.readFile(path.join(resources, 'Sounds', file));
  assert.equal(bytes.subarray(0, 4).toString(), 'RIFF');
  assert.equal(bytes.subarray(8, 12).toString(), 'WAVE');
  let byteRate, length;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const kind = bytes.subarray(offset, offset + 4).toString();
    const size = bytes.readUInt32LE(offset + 4);
    if (kind === 'fmt ') byteRate = bytes.readUInt32LE(offset + 16);
    if (kind === 'data') length = size;
    offset += 8 + size + (size % 2);
  }
  assert.ok(byteRate > 0 && length / byteRate < 30, `${file}: iOS sound is shorter than 30 seconds`);
}
assert.equal((await fs.readdir(path.join(resources, 'Pages'))).filter(f => f.endsWith('.pdf')).length, 0, 'Compact package excludes obsolete PDFs');
assert.equal((await fs.readdir(path.join(resources, 'Pages'))).filter(f => f.endsWith('.svgz')).length, 0, 'Compact package excludes obsolete gzip pages');
console.log('Asset verification passed: original content bytes, all pages/verse targets, all countries/cities, and notification audio.');
if (process.argv.includes('--assets-only')) process.exit(0);

function run(cmd, args, cwd = root) {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${cmd} failed (${result.status})`);
}
const sources = (await fs.readdir(path.join(project, 'Sources/App'))).filter(f => f.endsWith('.swift')).map(f => `Sources/App/${f}`);
const resourceCheckDir = path.join(root, 'target/swift-port/resource-check');
await fs.mkdir(resourceCheckDir, { recursive: true });
const resourceCheckBinary = path.join(resourceCheckDir, 'resource-locator-check');
if (!spawnSync('swift', ['--version'], { stdio: 'ignore' }).error) {
  run('swift', ['test', '--jobs', '4'], project);
  run('swiftc', ['-frontend', '-parse', ...sources], project);
  run('swiftc', ['-parse-as-library', 'Sources/App/ResourceLocator.swift', '../Verification/ResourceLocatorChecks.swift', '-o', resourceCheckBinary], project);
  run(resourceCheckBinary, []);
  if (process.platform === 'darwin') run('bash', ['scripts/check-swift-page-decoder.sh']);
} else if (!spawnSync('podman', ['--version'], { stdio: 'ignore' }).error) {
  const base = ['run', '--rm', '-v', `${root}:/work:z`, '-w', '/work/native-ios/QuranAdhanQibla.swiftpm', 'docker.io/library/swift:6.0'];
  run('podman', [...base, 'swift', 'test', '--jobs', '4', '--scratch-path', '/work/target/swift-port/build']);
  run('podman', [...base, 'swiftc', '-frontend', '-parse', ...sources]);
  run('podman', [...base, 'swiftc', '-parse-as-library', 'Sources/App/ResourceLocator.swift', '../Verification/ResourceLocatorChecks.swift', '-o', '/work/target/swift-port/resource-check/resource-locator-check']);
  run('podman', [...base, '/work/target/swift-port/resource-check/resource-locator-check']);
} else { throw new Error('Install Swift 6 or Podman to run the Swift core tests and syntax checks.'); }
console.log('Swift core tests, source syntax, resource locator and XZ asset checks passed. Apple Compression decoder checks run on macOS (including GitHub simulator CI); iOS behavior requires an Apple SDK build/device.');
