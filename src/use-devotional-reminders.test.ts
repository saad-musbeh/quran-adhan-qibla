import assert from 'node:assert/strict';
import test from 'node:test';
import { Platform } from './test-support/stubs/react-native.ts';
import * as Notifications from './test-support/stubs/expo-notifications.ts';
import { DEVOTIONAL_NAMESPACE, normalizeDevotionalPreferences } from './domain/devotional-reminders.ts';
import { HookHarness } from './test-support/react-hooks.ts';
import { useDevotionalReminders } from './use-devotional-reminders.ts';

Platform.OS = 'ios';

type Props = Parameters<typeof useDevotionalReminders>[0];
type HookApi = {
  status: string;
  scheduledCount: number;
  reconcile: () => void;
  requestPermission: () => Promise<boolean>;
  test: () => Promise<boolean>;
};

function foreignItem(id: string): { identifier: string; content: { data: { namespace: string } }; trigger: null } {
  return { identifier: id, content: { data: { namespace: 'someone.else' } }, trigger: null };
}

function ownedItem(id: string, data: Record<string, unknown>): { identifier: string; content: { data: Record<string, unknown> }; trigger: null } {
  return { identifier: id, content: { data }, trigger: null };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolveFn, rejectFn) => { resolve = resolveFn; reject = rejectFn; });
  return { promise, resolve, reject };
}

const prayer = { method: 0 as const, hanafi: false, ramadan: false };
const location = { latitude: 24.7136, longitude: 46.6753 };

function enabledPreferences() {
  return normalizeDevotionalPreferences({ salawat: { enabled: true }, morning: { enabled: true, time: '07:30' } });
}

function baseProps(prefs = enabledPreferences()): Props {
  return {
    ready: true,
    preferences: prefs,
    language: 'ar',
    location,
    prayer,
    onOpen: () => undefined,
  };
}

async function mountHook(props: Props): Promise<HookHarness> {
  const harness = new HookHarness(() => useDevotionalReminders({ ...props }));
  await harness.mount();
  await harness.settle();
  return harness;
}

function api(harness: HookHarness): HookApi {
  return harness.result as unknown as HookApi;
}

test('replaces recurring devotional alerts and keeps independent test alerts', async t => {
  Notifications.resetStore();
  Notifications.store.scheduled.push(
    ownedItem('dev-1', { namespace: DEVOTIONAL_NAMESPACE, kind: 'salawat' }) as never,
    ownedItem('dev-test-1', { namespace: `${DEVOTIONAL_NAMESPACE}.test` }) as never,
    foreignItem('f-1') as never,
  );
  const enabled = baseProps();
  const expectedCount = 26; // 08:00–20:00 every 30 minutes, plus morning at 07:30.
  const harness = await mountHook(enabled);
  t.after(() => harness.unmount());
  assert.ok(!Notifications.store.scheduled.some(item => item.identifier === 'dev-1'), 'the replaced recurring reminder is cancelled');
  assert.ok(Notifications.store.scheduled.some(item => item.identifier === 'dev-test-1'), 'the 5s test alert survives the reconcile');
  assert.ok(Notifications.store.scheduled.some(item => item.identifier === 'f-1'), 'foreign alerts survive');
  assert.equal(api(harness).status, 'ready');
  assert.equal(api(harness).scheduledCount, expectedCount);
  assert.equal(Notifications.store.scheduled.filter(item => item.content.data?.namespace === DEVOTIONAL_NAMESPACE).length, expectedCount);
});

test('a superseded reconcile cannot rebuild its schedule', async t => {
  Notifications.resetStore();
  const staleGetAll = deferred<unknown[]>();
  Notifications.store.getAllOverride = () => staleGetAll.promise;
  const props = baseProps();
  const harness = new HookHarness(() => useDevotionalReminders({ ...props }));
  await harness.mount();
  t.after(() => harness.unmount());
  // Let the mount reconcile enter getAll while the override is still the gate.
  await harness.settle();
  const supersedingGetAll = deferred<unknown[]>();
  Notifications.store.getAllOverride = () => supersedingGetAll.promise;

  await harness.change(() => api(harness).reconcile());
  const writesAtStall = Notifications.store.log.length;
  staleGetAll.resolve(Notifications.store.scheduled.slice());
  // Wake the stale reconcile: it aborts, then the superseding one reaches its getAll and parks.
  await new Promise(resolve => setImmediate(resolve));
  await harness.settle();
  assert.equal(Notifications.store.log.length, writesAtStall, 'the stale generation made no writes');

  Notifications.store.getAllOverride = null;
  supersedingGetAll.resolve(Notifications.store.scheduled.slice());
  await harness.settle();

  assert.equal(api(harness).status, 'ready');
  assert.equal(api(harness).scheduledCount, 26);
});

test('a user test alert replaces the previous test and survives recurring reconciliation', async t => {
  Notifications.resetStore();
  const props = baseProps(normalizeDevotionalPreferences({ salawat: { enabled: true } }));
  const harness = await mountHook(props);
  t.after(() => harness.unmount());
  assert.ok(Notifications.store.scheduled.length > 0);

  assert.equal(await harness.change(() => api(harness).test()), true);
  const firstTest = Notifications.store.scheduled.find(item => item.content.data?.namespace === `${DEVOTIONAL_NAMESPACE}.test`)!;
  assert.equal(await harness.change(() => api(harness).test()), true);
  const testAlerts = Notifications.store.scheduled.filter(item => item.content.data?.namespace === `${DEVOTIONAL_NAMESPACE}.test`);
  assert.equal(testAlerts.length, 1);
  assert.notEqual(testAlerts[0].identifier, firstTest.identifier);
  assert.equal(Notifications.store.scheduled.some(item => item.identifier === firstTest.identifier), false);
  assert.deepEqual(testAlerts[0].trigger, { type: 'timeInterval', seconds: 5 });

  props.preferences = normalizeDevotionalPreferences({ salawat: { enabled: true, intervalMinutes: 60 } });
  await harness.render();
  await harness.settle();
  assert.ok(Notifications.store.scheduled.some(item => item.identifier === testAlerts[0].identifier), 'a reconcile keeps the fresh test alert');
  assert.equal(Notifications.store.scheduled.filter(item => item.content.data?.kind === 'salawat' && item.content.data?.namespace === DEVOTIONAL_NAMESPACE).length,
    13); // 08:00–20:00, hourly, including both endpoints.
});

test('an exhausted permission requirement reports instead of scheduling', async t => {
  Notifications.resetStore();
  Notifications.store.permissions = { status: 'denied', ios: { status: 0, allowsSound: false } };
  const props = baseProps();
  const harness = await mountHook(props);
  t.after(() => harness.unmount());
  assert.equal(api(harness).status, 'permission-required');
  assert.equal(api(harness).scheduledCount, 0);
  assert.equal(Notifications.store.scheduled.length, 0);
  Notifications.store.permissions = { status: 'granted', ios: { status: 2, allowsSound: true } };
});
