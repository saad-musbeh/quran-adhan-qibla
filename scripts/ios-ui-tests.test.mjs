import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runSuite, suites } from './ios-ui-tests.mjs';

async function temporaryResults(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'quran-ios-ui-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test('each iPhone check gets a fresh app; audio fixtures precede tests on the same simulator', async t => {
  const events = [];
  const run = async (program, args) => {
    events.push([program, args]);
    return args.includes('get_app_container') ? '/simulator/private/data' : '';
  };
  await runSuite('phone-udid', 'iphone', { run, seed: async container => events.push(['seed', container]), resultsRoot: await temporaryResults(t) });
  const tests = events.filter(([program]) => program === 'xcodebuild');
  assert.equal(tests.length, suites.iphone.length);
  const results = new Set();
  for (const [index, [, args]] of tests.entries()) {
    assert.equal(args[0], 'test-without-building');
    assert.equal(args[args.indexOf('-parallel-testing-enabled') + 1], 'NO');
    assert.equal(args[args.indexOf('-destination') + 1], 'platform=iOS Simulator,id=phone-udid');
    assert.ok(args.includes(`-only-testing:QuranUITests/QuranUITests/${suites.iphone[index]}`));
    results.add(args[args.indexOf('-resultBundlePath') + 1]);
  }
  assert.equal(results.size, tests.length);
  const setup = events.map(([program, args]) => program === 'xcrun' ? args[1] : program);
  assert.deepEqual(setup, [
    'get_app_container', 'uninstall', 'install', 'xcodebuild',
    'get_app_container', 'uninstall', 'install', 'get_app_container', 'seed', 'xcodebuild',
    'get_app_container', 'uninstall', 'install', 'get_app_container', 'seed', 'xcodebuild',
    'get_app_container', 'uninstall', 'install', 'xcodebuild',
  ]);
  assert.ok(events.filter(([program]) => program === 'seed').every(([, container]) => container === '/simulator/private/data'));
});

test('a failed check keeps its failure and still runs the rest of the suite', async t => {
  const tested = [];
  await assert.rejects(runSuite('phone-udid', 'polish', {
    resultsRoot: await temporaryResults(t),
    run: async (program, args) => {
      if (program === 'xcodebuild') {
        tested.push(args.find(arg => arg.startsWith('-only-testing:')));
        if (tested.length === 1) throw new Error('XCTest failure');
      }
      return null; // No installed app on the first run is a supported condition.
    },
  }), /iOS UI checks failed: testPolishLanguageMenuAndRepeatControls/);
  assert.equal(tested.length, suites.polish.length);
});

test('bad arguments and failed fixture setup never launch XCTest', async t => {
  let launched = false;
  const run = async program => { if (program === 'xcodebuild') launched = true; return null; };
  await assert.rejects(runSuite('', 'iphone', { run }), /Usage:/);
  await assert.rejects(runSuite('phone', 'typo', { run }), /Usage:/);
  assert.equal(launched, false);
  let tests = 0;
  await assert.rejects(runSuite('phone', 'iphone', {
    resultsRoot: await temporaryResults(t),
    run: async program => { if (program === 'xcodebuild') tests++; return '/container'; },
    seed: async () => { throw new Error('Fixture unavailable'); },
  }), /testDefaultVoiceAndNativePlaybackControls, testLocalPrayerAlertsAndDownloadManager/);
  assert.equal(tests, 2);
});

test('reruns tolerate restored result directories and preserve all previous diagnostics', async t => {
  const resultsRoot = await temporaryResults(t);
  const oldResult = path.join(resultsRoot, 'polish-testPolishLanguageMenuAndRepeatControls.xcresult');
  await mkdir(oldResult);
  await writeFile(path.join(oldResult, 'previous.txt'), 'Previous run');
  const paths = [];
  const run = async (program, args) => {
    if (program === 'xcodebuild') {
      const result = args[args.indexOf('-resultBundlePath') + 1];
      // Model Xcode's refusal to overwrite an existing result directory.
      await mkdir(result);
      await writeFile(path.join(result, 'diagnostics.txt'), 'Retained');
      paths.push(result);
    }
    return null;
  };
  await runSuite('phone', 'polish', { run, resultsRoot });
  await runSuite('phone', 'polish', { run, resultsRoot });
  assert.equal(paths.length, 2 * suites.polish.length);
  assert.equal(new Set(paths).size, paths.length);
  assert.notEqual(path.dirname(paths[0]), path.dirname(paths.at(-1)));
  assert.equal(await readFile(path.join(oldResult, 'previous.txt'), 'utf8'), 'Previous run');
  for (const result of paths) assert.equal(await readFile(path.join(result, 'diagnostics.txt'), 'utf8'), 'Retained');
});
