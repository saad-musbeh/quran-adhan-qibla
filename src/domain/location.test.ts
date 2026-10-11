import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LOCATION_REFRESH_MS, LocationAccessError, requestDeviceLocation, shouldRefreshLocation, type LocationProvider } from './location.ts';

const position = { coords: { latitude: 24.7136, longitude: 46.6753, accuracy: 1000 }, timestamp: 123 };
function provider(overrides: Partial<LocationProvider> = {}): LocationProvider {
  return {
    getPermission: async () => ({ granted: true, canAskAgain: true }),
    requestPermission: async () => { throw new Error('Already granted; do not prompt again'); },
    servicesEnabled: async () => true,
    currentPosition: async () => position,
    ...overrides,
  };
}

test('accepts approximate location and reuses an existing permission', async () => {
  assert.deepEqual(await requestDeviceLocation(provider()), { ...position.coords, timestamp: 123 });
});

test('automatic refresh waits six hours and never prompts or replaces a manual selection', async () => {
  assert.equal(shouldRefreshLocation('device', 100, 100 + LOCATION_REFRESH_MS - 1), false);
  assert.equal(shouldRefreshLocation('device', 100, 100 + LOCATION_REFRESH_MS), true);
  assert.equal(shouldRefreshLocation('manual', 100, 100 + LOCATION_REFRESH_MS), false);
  assert.equal(shouldRefreshLocation('city', 100, 100 + LOCATION_REFRESH_MS), false);
  assert.equal(shouldRefreshLocation('map', 100, 100 + LOCATION_REFRESH_MS), false);
  assert.equal(shouldRefreshLocation(undefined, 0, LOCATION_REFRESH_MS), false);
  await assert.rejects(requestDeviceLocation(provider({
    getPermission: async () => ({ granted: false, canAskAgain: true }),
    requestPermission: async () => { assert.fail('Automatic refresh cannot prompt'); },
    currentPosition: async () => { assert.fail('Cannot read without permission'); },
  }), 100, false), { reason: 'denied' });
});

test('asks only when needed and never reads coordinates after denial', async () => {
  let reads = 0;
  let prompts = 0;
  const denied = provider({
    getPermission: async () => ({ granted: false, canAskAgain: true }),
    requestPermission: async () => { prompts++; return { granted: false, canAskAgain: true }; },
    currentPosition: async () => { reads++; return position; },
  });
  await assert.rejects(requestDeviceLocation(denied), { reason: 'denied' });
  assert.equal(prompts, 1);
  assert.equal(reads, 0);
  await assert.rejects(requestDeviceLocation(provider({
    getPermission: async () => ({ granted: false, canAskAgain: false }),
  })), { reason: 'blocked' });
});

test('a grant after the prompt allows a single location read', async () => {
  const granted = await requestDeviceLocation(provider({
    getPermission: async () => ({ granted: false, canAskAgain: true }),
    requestPermission: async () => ({ granted: true, canAskAgain: true }),
  }));
  assert.equal(granted.latitude, 24.7136);
});

test('disabled services never start a position request', async () => {
  await assert.rejects(requestDeviceLocation(provider({
    servicesEnabled: async () => false,
    currentPosition: async () => { assert.fail('Must not read location'); },
  })), { reason: 'servicesDisabled' });
});

test('a slow fix times out and a later result cannot replace the failure', async () => {
  let finish!: (value: typeof position) => void;
  const pending = requestDeviceLocation(provider({
    currentPosition: () => new Promise(resolve => { finish = resolve; }),
  }), 5);
  await assert.rejects(pending, { reason: 'timeout' });
  finish(position);
  await assert.rejects(pending, { reason: 'timeout' });
});

test('invalid fixes and provider errors become recoverable location errors', async () => {
  await assert.rejects(requestDeviceLocation(provider({
    currentPosition: async () => ({ ...position, coords: { ...position.coords, latitude: NaN } }),
  })), { reason: 'locationError' });
  await assert.rejects(requestDeviceLocation(provider({
    currentPosition: async () => { throw new Error('GPS unavailable'); },
  })), LocationAccessError);
});
