import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECITERS } from '../src/data/reciters.ts';
import { SURAH_RECITATIONS } from '../src/data/surah-recitations.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const bundle = 'org.saadmusbeh.quranadhanqibla';
const app = path.join(root, 'target/ios-build/Build/Products/Release-iphonesimulator/QuranAdhanQibla.app');
export const suites = {
  polish: ['testPolishLanguageMenuAndRepeatControls', 'testAdhkarCollectionsAndReminders'],
  ipad: ['testTabletMainMenuAndLandscapeReading'],
  iphone: ['testBooksKeepIndependentPagesAndNames', 'testDefaultVoiceAndNativePlaybackControls',
    'testLocalPrayerAlertsAndDownloadManager', 'testRepeatedTabTransitions'],
};

async function command(program, args, { allowFailure = false, log } = {}) {
  const output = log ? createWriteStream(log) : null;
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(program, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      child.stdout.on('data', data => { stdout += data; if (output) { output.write(data); process.stdout.write(data); } });
      child.stderr.on('data', data => { if (output) output.write(data); process.stderr.write(data); });
      child.on('error', reject);
      child.on('close', code => {
        if (code === 0 || allowFailure) resolve(code === 0 ? stdout.trim() : null);
        else reject(new Error(`${program} ${args.join(' ')} exited with ${code}`));
      });
    });
  } finally {
    if (output) await new Promise(resolve => output.end(resolve));
  }
}

// Use the application's documented sources; never synthesize Quran audio.
// Cache only under ignored target/, then copy into each fresh app container.
export async function seedAudio(container) {
  for (const id of ['ghamdi', 'husary']) {
    const reciter = RECITERS.find(reciter => reciter.id === id);
    const destination = path.join(container, 'Documents/quran-audio', id, '001');
    const cache = path.join(root, 'target/ios-test-audio', id);
    await Promise.all([mkdir(destination, { recursive: true }), mkdir(cache, { recursive: true })]);
    const files = [['surah.mp3', `${SURAH_RECITATIONS[id].server}001.mp3`],
      ...Array.from({ length: 7 }, (_, i) => {
        const name = `001${String(i + 1).padStart(3, '0')}.mp3`;
        return [name, `https://everyayah.com/data/${reciter.directory}/${name}`];
      })];
    for (const [name, url] of files) {
      const cached = path.join(cache, name);
      const existing = await readFile(cached).catch(() => null);
      if (!existing?.length) {
        const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
        if (!response.ok) throw new Error(`Audio fixture ${url}: HTTP ${response.status}`);
        const data = Buffer.from(await response.arrayBuffer());
        if (!data.length || /text|json|html/i.test(response.headers.get('content-type') ?? '')) {
          throw new Error(`Audio fixture ${url} is empty or is not audio`);
        }
        await writeFile(cached, data);
      }
      await copyFile(cached, path.join(destination, name));
    }
  }
}

export async function runSuite(device, suite, { run = command, seed = seedAudio } = {}) {
  if (!device || !Object.hasOwn(suites, suite)) throw new Error('Usage: node scripts/ios-ui-tests.mjs <simulator-UDID> <polish|iphone|ipad>');
  const failures = [];
  for (const method of suites[suite]) {
    try {
      // app.launch() alone retains AsyncStorage, permissions and prior pages.
      const existing = await run('xcrun', ['simctl', 'get_app_container', device, bundle, 'data'], { allowFailure: true });
      if (existing !== null) await run('xcrun', ['simctl', 'uninstall', device, bundle]);
      await run('xcrun', ['simctl', 'install', device, app]);
      if (['testDefaultVoiceAndNativePlaybackControls', 'testLocalPrayerAlertsAndDownloadManager'].includes(method)) {
        const container = await run('xcrun', ['simctl', 'get_app_container', device, bundle, 'data']);
        await seed(container);
      }
      await run('xcodebuild', ['test-without-building', '-workspace', 'ios/QuranAdhanQibla.xcworkspace',
        '-scheme', 'QuranAdhanQibla', '-configuration', 'Release',
        '-destination', `platform=iOS Simulator,id=${device}`,
        // Cloned simulators do not have the app-private fixtures just installed.
        '-parallel-testing-enabled', 'NO',
        '-test-timeouts-enabled', 'YES', '-default-test-execution-time-allowance', '240',
        '-maximum-test-execution-time-allowance', '360',
        `-only-testing:QuranUITests/QuranUITests/${method}`,
        '-derivedDataPath', 'target/ios-build', '-resultBundlePath', `target/${suite}-${method}.xcresult`,
        'CODE_SIGNING_ALLOWED=NO'], { log: path.join(root, `target/${suite}-${method}.log`) });
    } catch (error) {
      console.error(`${method}: ${error.message}`);
      failures.push(method);
    }
  }
  if (failures.length) throw new Error(`iOS UI checks failed: ${failures.join(', ')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runSuite(process.argv[2], process.argv[3]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
