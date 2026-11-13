import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { HookHarness } from './test-support/react-hooks.ts';
import { AppState, Platform } from './test-support/stubs/react-native.ts';
import * as Notifications from './test-support/stubs/expo-notifications.ts';
import { usePrayerNotifications } from './use-prayer-notifications.ts';
import { PRAYER_NOTIFICATION_NAMESPACE } from './domain/prayer-notifications.ts';
import { usePersistentWrite } from './use-persistent-write.ts';
import * as locationDomain from './domain/location.ts';
import * as savedLocation from './domain/saved-location.ts';

const require = createRequire(import.meta.url);
(globalThis as typeof globalThis & { require: NodeRequire }).require = require;

// Compile the real hook so the regression exercises its production control flow with a
// controlled device provider and storage, matching the transpile+harness pattern.
const compiled = ts.transpileModule(readFileSync(new URL('./use-location.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

type Permission = { granted: boolean; canAskAgain: boolean };
type Position = { coords: { latitude: number; longitude: number; accuracy: number | null }; timestamp: number };
type LocationStub = {
  Accuracy: { High: number };
  getForegroundPermissionsAsync(): Promise<Permission>;
  requestForegroundPermissionsAsync(): Promise<Permission>;
  hasServicesEnabledAsync(): Promise<boolean>;
  getCurrentPositionAsync(): Promise<Position>;
};
type StorageStub = {
  getItem(): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};
type HookResult = {
  location: { timestamp: number; source: string } | null;
  loading: boolean;
  error: string | null;
  ready: boolean;
  loadFailed: boolean;
  saveFailed: boolean;
  retry(): void;
  retrySave(): void;
  useAlternative(value: {latitude: number; longitude: number; source: 'city' | 'manual' | 'map'; label?: string}): void;
  locate(allowPrompt?: boolean): Promise<void>;
};

function build(storage: StorageStub, location: LocationStub): { h: HookHarness; result(): HookResult } {
  const output = { exports: {} as { useLocation(enabled: boolean): HookResult } };
  const mocks: Record<string, unknown> = {
    react: require('react'),
    'react-native': { AppState },
    'expo-location': location,
    '@react-native-async-storage/async-storage': storage,
    './domain/location': locationDomain,
    './domain/saved-location': savedLocation,
    './use-persistent-write': { usePersistentWrite },
    './system-device-location': { hasSystemDeviceLocation: false, getSystemDeviceLocation: () => { throw new Error('unused'); } },
  };
  new Function('require', 'module', 'exports', compiled)((name: string) => {
    if (!(name in mocks)) throw new Error(`Unexpected native import: ${name}`);
    return mocks[name];
  }, output, output.exports);
  const h = new HookHarness(() => output.exports.useLocation(true));
  return { h, result: () => h.result as HookResult };
}

function controllableProvider() {
  const state = { attempts: 0, fail: true, now: 0 };
  const location: LocationStub = {
    Accuracy: { High: 4 },
    async getForegroundPermissionsAsync() { return { granted: true, canAskAgain: true }; },
    async requestForegroundPermissionsAsync() { return { granted: true, canAskAgain: true }; },
    async hasServicesEnabledAsync() { return true; },
    async getCurrentPositionAsync() {
      state.attempts++;
      if (state.fail) throw new Error('Temporary provider failure');
      return { coords: { latitude: 24.7, longitude: 46.7, accuracy: 50 }, timestamp: state.now };
    },
  };
  return { state, location };
}

function memoryStorage(saved: unknown): StorageStub {
  return {
    async getItem() { return saved === null ? null : JSON.stringify(saved); },
    async setItem() {},
    async removeItem() {},
  };
}

async function resume(h: HookHarness) {
  await h.change(() => AppState.emit('background'));
  await h.change(() => AppState.emit('active'));
  await h.settle();
}

test('a failed automatic refresh does not postpone the next attempt for six hours', async () => {
  const realNow = Date.now;
  const clock = { now: 1_800_000_000_000 };
  Date.now = () => clock.now;
  const fix = { latitude: 24.7, longitude: 46.7, source: 'device', accuracy: 100, timestamp: clock.now - 7 * 3_600_000 };
  const { state, location } = controllableProvider();
  state.now = clock.now;
  let h: HookHarness | undefined;
  try {
    const harness = build(memoryStorage(fix), location);
    h = harness.h;
    const result = harness.result;
    await h.mount();
    await h.settle();
    assert.equal(state.attempts, 1, 'a stale saved fix triggers one automatic refresh');
    assert.equal(result().error, 'locationError');
    assert.equal(result().location?.timestamp, fix.timestamp, 'the stale fix is retained after a failure');

    // Resuming moments later must not hammer the provider while the short backoff is active.
    await resume(h);
    assert.equal(state.attempts, 1, 'the short backoff prevents an immediate retry');

    // An hour later the automatic refresh runs again despite the earlier failure.
    clock.now += 3_600_000;
    state.now = clock.now;
    state.fail = false;
    await resume(h);
    assert.equal(state.attempts, 2, 'the next resume retries the automatic refresh');
    assert.equal(result().location?.timestamp, clock.now);

    // A fresh successful fix restarts the six-hour reuse window.
    await resume(h);
    assert.equal(state.attempts, 2, 'a fresh fix is reused without another attempt');
  } finally {
    await h?.unmount();
    Date.now = realNow;
  }
});

test('a successful device fix is reused for six hours and then refreshed once', async () => {
  const realNow = Date.now;
  const clock = { now: 1_800_000_000_000 };
  Date.now = () => clock.now;
  const fix = { latitude: 24.7, longitude: 46.7, source: 'device', accuracy: 100, timestamp: clock.now - 3_600_000 };
  const { state, location } = controllableProvider();
  state.fail = false;
  state.now = clock.now;
  let h: HookHarness | undefined;
  try {
    const harness = build(memoryStorage(fix), location);
    h = harness.h;
    const result = harness.result;
    await h.mount();
    await h.settle();
    assert.equal(state.attempts, 0, 'a one-hour-old fix is not refreshed');

    clock.now += 5 * 3_600_000; // Fix reaches exactly six hours old.
    state.now = clock.now;
    await resume(h);
    assert.equal(state.attempts, 1, 'the fix refreshes once it reaches six hours');
    assert.equal(result().location?.timestamp, clock.now);

    await resume(h);
    assert.equal(state.attempts, 1, 'the refreshed fix is reused without a prompt or extra attempt');
  } finally {
    await h?.unmount();
    Date.now = realNow;
  }
});

test('a manual locate retries immediately even while the failure backoff is pending', async () => {
  const realNow = Date.now;
  const clock = { now: 1_800_000_000_000 };
  Date.now = () => clock.now;
  const fix = { latitude: 24.7, longitude: 46.7, source: 'device', accuracy: 100, timestamp: clock.now - 7 * 3_600_000 };
  const { state, location } = controllableProvider();
  state.now = clock.now;
  let h: HookHarness | undefined;
  try {
    const harness = build(memoryStorage(fix), location);
    h = harness.h;
    const result = harness.result;
    await h.mount();
    await h.settle();
    assert.equal(state.attempts, 1);
    assert.equal(result().error, 'locationError');

    state.fail = false;
    state.now = clock.now;
    await h.change(() => result().locate(true));
    await h.settle();
    assert.equal(state.attempts, 2, 'a manual locate is not delayed by the failure backoff');
    assert.equal(result().error, null);
    assert.equal(result().location?.timestamp, clock.now);
  } finally {
    await h?.unmount();
    Date.now = realNow;
  }
});

test('a failed saved-location read preserves scheduled prayers until successful retry', async () => {
  Platform.OS = 'ios';
  Notifications.resetStore();
  Notifications.store.scheduled.push({identifier: 'saved-fajr', content: {data: {namespace: PRAYER_NOTIFICATION_NAMESPACE}}, trigger: null});
  const io = memoryStorage({latitude: 24.7, longitude: 46.7, source: 'city', timestamp: Date.now(), label: 'Riyadh'});
  const read = io.getItem;
  io.getItem = async () => { throw Error('Transient read failure'); };
  const { h, result } = build(io, controllableProvider().location);
  let prayer: HookHarness | undefined;
  try {
    await h.mount();
    assert.equal(result().ready, false);
    assert.equal(result().loadFailed, true);
    prayer = new HookHarness(() => usePrayerNotifications({
      ready: result().ready, enabled: true, location: result().location as never,
      settings: {method: 0, hanafi: false, ramadan: false, highLatitudeRule: 'middle', polarRule: 'none'},
      language: 'ar', labels: {title: 'Adhan', channelName: 'Adhan', body: () => 'Prayer'},
    }));
    await prayer.mount();
    await prayer.settle();
    assert.equal(Notifications.store.scheduled[0]?.identifier, 'saved-fajr');
    assert.equal(Notifications.store.log.length, 0, 'unresolved hydration cannot cancel or reschedule alarms');
    io.getItem = read;
    await h.change(() => result().retry());
    assert.equal(result().ready, true);
    assert.equal(result().loadFailed, false);
    assert.equal(result().location?.source, 'city');
    await prayer.render();
    await prayer.settle();
    assert.ok(!Notifications.store.scheduled.some(item => item.identifier === 'saved-fajr'));
    assert.ok(Notifications.store.scheduled.length > 0, 'retry reconciles a new schedule with the restored location');
  } finally { await prayer?.unmount(); await h.unmount(); }
});

test('an explicit location can recover from a failed read and failed save without losing the new choice', async () => {
  const io = memoryStorage(null);
  io.getItem = async () => { throw Error('Read unavailable'); };
  let stored = '';
  io.setItem = async () => { throw Error('Disk full'); };
  const { h, result } = build(io, controllableProvider().location);
  try {
    await h.mount();
    await h.change(() => result().useAlternative({latitude: 24.7, longitude: 46.7, source: 'manual'}));
    assert.equal(result().ready, true);
    assert.equal(result().loadFailed, false);
    assert.equal(result().saveFailed, true);
    io.setItem = async (_key: string, value: string) => { stored = value; };
    await h.change(() => result().retrySave());
    assert.equal(result().saveFailed, false);
    assert.equal(JSON.parse(stored).source, 'manual');
  } finally { await h.unmount(); }
});
