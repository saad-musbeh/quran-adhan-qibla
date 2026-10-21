import assert from 'node:assert/strict';
import test from 'node:test';
import { Platform } from './test-support/stubs/react-native.ts';
import * as expoLocation from './test-support/stubs/expo-location.ts';
import { HookHarness } from './test-support/react-hooks.ts';
import { useHeading } from './use-heading.ts';

Platform.OS = 'ios';
const globalFrame = globalThis as unknown as {
  requestAnimationFrame?: (callback: () => void) => number;
  cancelAnimationFrame?: (handle: number) => void;
};
// requestAnimationFrame inside the hook double-acts as a batching gate: the id is
// assigned only after the callback returns in a synchronous implementation, so the
// callback must fire asynchronously, mirroring the real frame schedule.
const rafPending = new Set<number>();
let rafId = 0;
globalFrame.requestAnimationFrame = callback => {
  const handle = ++rafId;
  rafPending.add(handle);
  queueMicrotask(() => {
    if (!rafPending.has(handle)) return;
    rafPending.delete(handle);
    callback();
  });
  return handle;
};
globalFrame.cancelAnimationFrame = handle => { rafPending.delete(handle); };

type HeadingState = ReturnType<typeof useHeading>;
const FIRST_SAMPLE_TIMEOUT_MS = 8_000;
const coordinates = { latitude: 24.7136, longitude: 46.6753 };

async function mountHeading(enabled = true, coords: typeof coordinates | undefined = coordinates) {
  const harness = new HookHarness(() => useHeading(enabled, coords));
  await harness.mount();
  return { harness, api: () => ({ ...(harness.result as unknown as HeadingState) }) };
}

test('a usable true heading disarms the first-sample timeout and stays ready', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  expoLocation.state.permissionsFailure = null;
  const { harness, api } = await mountHeading();
  t.after(() => harness.unmount());
  await harness.settle();
  assert.equal(api().status, 'loading');
  assert.equal(expoLocation.headingListenerCount(), 1);

  await harness.change(() => expoLocation.emitHeading({ trueHeading: 45, magHeading: 42, accuracy: 3 }));
  await harness.settle();
  assert.equal(api().status, 'ready');
  assert.equal(api().heading, 45);
  assert.equal(api().reason, null);

  await harness.change(() => t.mock.timers.tick(60_000));
  await harness.settle();
  assert.equal(api().status, 'ready');
});

test('a low-accuracy-only stream surfaces the timeout instead of staying calibrating', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { harness, api } = await mountHeading();
  t.after(() => harness.unmount());
  await harness.settle();
  await harness.change(() => expoLocation.emitHeading({ trueHeading: 45, magHeading: 42, accuracy: 2 }));
  await harness.settle();
  assert.equal(api().status, 'calibrating');
  assert.equal(api().reason, 'calibration');

  await harness.change(() => t.mock.timers.tick(FIRST_SAMPLE_TIMEOUT_MS));
  await harness.settle();
  assert.equal(api().status, 'unavailable');
  assert.equal(api().reason, 'timeout');
  assert.equal(api().heading, null);
});

test('calibration may delay the first usable heading without expecting the timeout', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const { harness, api } = await mountHeading();
  t.after(() => harness.unmount());
  await harness.settle();
  await harness.change(() => expoLocation.emitHeading({ trueHeading: 45, magHeading: 42, accuracy: 1 }));
  await harness.settle();
  assert.equal(api().status, 'calibrating');

  await harness.change(() => t.mock.timers.tick(FIRST_SAMPLE_TIMEOUT_MS - 1));
  await harness.change(() => expoLocation.emitHeading({ trueHeading: 90, magHeading: 87, accuracy: 3 }));
  await harness.settle();
  assert.equal(api().status, 'ready');
  assert.equal(api().heading, 90);

  await harness.change(() => t.mock.timers.tick(60_000));
  await harness.settle();
  assert.equal(api().status, 'ready', 'the armed timeout never fires after a usable heading');
});

test('lost calibration clears a ready heading and a usable sample restores it', async t => {
  const { harness, api } = await mountHeading();
  t.after(() => harness.unmount());
  await harness.settle();
  await harness.change(() => expoLocation.emitHeading({ trueHeading: 10, magHeading: 7, accuracy: 3 }));
  await harness.settle();
  await harness.change(() => expoLocation.emitHeading({ trueHeading: 20, magHeading: 17, accuracy: 1 }));
  await harness.settle();
  assert.equal(api().status, 'calibrating');
  await harness.change(() => expoLocation.emitHeading({ trueHeading: 25, magHeading: 22, accuracy: 3 }));
  await harness.settle();
  assert.equal(api().status, 'ready');
});

test('a permission lookup failure reports an error without starting the sensor or timing out', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  expoLocation.state.permissionsFailure = 'permission lookup failed';
  t.after(() => { expoLocation.state.permissionsFailure = null; });
  const { harness, api } = await mountHeading();
  t.after(() => harness.unmount());
  assert.deepEqual(api(), { status: 'unavailable', reason: 'error', heading: null });
  assert.equal(expoLocation.headingListenerCount(), 0);

  await harness.change(() => t.mock.timers.tick(60_000));
  assert.deepEqual(api(), { status: 'unavailable', reason: 'error', heading: null });
});
