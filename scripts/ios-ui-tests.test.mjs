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

function launchTimeoutSummary() {
  return {
    totalTestCount: 1, failedTests: 1,
    testFailures: [{
      targetName: 'QuranUITests', testName: 'testTabletMainMenuAndLandscapeReading()',
      failureText: 'Failed to launch <XCUIApplicationImpl: 0x10a4ddc00 org.saadmusbeh.quranadhanqibla at /build/QuranAdhanQibla.app> via Xcode: Timed out while launching application via Xcode.',
    }],
  };
}

test('an Xcode launch timeout retries once with fresh data and preserves both result bundles', async t => {
  const warning = t.mock.method(console, 'warn', () => {});
  const events = [];
  const paths = [];
  await runSuite('ipad', 'ipad', {
    resultsRoot: await temporaryResults(t),
    run: async (program, args) => {
      events.push(program === 'xcodebuild' ? program : args[0] === 'xcresulttool' ? 'summary' : args[1]);
      if (args[0] === 'xcresulttool') return JSON.stringify(launchTimeoutSummary());
      if (program === 'xcodebuild') {
        const result = args[args.indexOf('-resultBundlePath') + 1];
        await mkdir(result);
        await writeFile(path.join(result, 'diagnostics.txt'), 'Retained');
        paths.push(result);
        if (paths.length === 1) throw new Error('xcodebuild exited with 65');
      }
      return '/container';
    },
  });
  assert.deepEqual(events, [
    'get_app_container', 'uninstall', 'install', 'xcodebuild', 'summary',
    'get_app_container', 'uninstall', 'install', 'xcodebuild',
  ]);
  assert.equal(paths.length, 2);
  assert.notEqual(paths[0], paths[1]);
  assert.equal(warning.mock.callCount(), 1);
  assert.ok(warning.mock.calls[0].arguments[0].includes(paths[0]));
  for (const result of paths) assert.equal(await readFile(path.join(result, 'diagnostics.txt'), 'utf8'), 'Retained');
});

test('a repeated launch timeout fails after two attempts', async t => {
  const warning = t.mock.method(console, 'warn', () => {});
  let attempts = 0;
  await assert.rejects(runSuite('ipad', 'ipad', {
    resultsRoot: await temporaryResults(t),
    run: async (program, args) => {
      if (args[0] === 'xcresulttool') return JSON.stringify(launchTimeoutSummary());
      if (program === 'xcodebuild') { attempts++; throw new Error('launch timeout'); }
      return null;
    },
  }), /iOS UI checks failed: testTabletMainMenuAndLandscapeReading/);
  assert.equal(attempts, 2);
  assert.equal(warning.mock.callCount(), 1);
});

test('assertions, crashes, mixed failures and unavailable diagnostics are never retried', async t => {
  const assertion = launchTimeoutSummary();
  assertion.testFailures[0].failureText = 'XCTAssertTrue failed: home menu did not load';
  const crash = launchTimeoutSummary();
  crash.testFailures[0].failureText = 'App crashed during launch';
  const mixed = launchTimeoutSummary();
  mixed.testFailures.push(assertion.testFailures[0]);
  for (const summary of [assertion, crash, mixed, null, 'invalid JSON']) {
    let attempts = 0;
    await assert.rejects(runSuite('ipad', 'ipad', {
      resultsRoot: await temporaryResults(t),
      run: async (program, args) => {
        if (args[0] === 'xcresulttool') return typeof summary === 'string' ? summary : JSON.stringify(summary);
        if (program === 'xcodebuild') { attempts++; throw new Error('XCTest failure'); }
        return null;
      },
    }), /iOS UI checks failed/);
    assert.equal(attempts, 1);
  }
});
