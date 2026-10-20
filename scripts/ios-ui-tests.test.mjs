import assert from 'node:assert/strict';
import test from 'node:test';
import { runSuite, suites } from './ios-ui-tests.mjs';

test('each iPhone check gets a fresh app; audio fixtures precede tests on the same simulator', async () => {
  const events = [];
  const run = async (program, args) => {
    events.push([program, args]);
    return args.includes('get_app_container') ? '/simulator/private/data' : '';
  };
  await runSuite('phone-udid', 'iphone', { run, seed: async container => events.push(['seed', container]) });
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

test('a failed check keeps its failure and still runs the rest of the suite', async () => {
  const tested = [];
  await assert.rejects(runSuite('phone-udid', 'polish', {
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

test('bad arguments and failed fixture setup never launch XCTest', async () => {
  let launched = false;
  const run = async program => { if (program === 'xcodebuild') launched = true; return null; };
  await assert.rejects(runSuite('', 'iphone', { run }), /Usage:/);
  await assert.rejects(runSuite('phone', 'typo', { run }), /Usage:/);
  assert.equal(launched, false);
  let tests = 0;
  await assert.rejects(runSuite('phone', 'iphone', {
    run: async program => { if (program === 'xcodebuild') tests++; return '/container'; },
    seed: async () => { throw new Error('Fixture unavailable'); },
  }), /testDefaultVoiceAndNativePlaybackControls, testLocalPrayerAlertsAndDownloadManager/);
  assert.equal(tests, 2);
});
