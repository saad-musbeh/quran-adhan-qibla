import assert from 'node:assert/strict';
import test from 'node:test';
import { Platform, AppState, Linking } from './test-support/stubs/react-native.ts';
import * as Notifications from './test-support/stubs/expo-notifications.ts';
import * as islamicCore from './test-support/stubs/islamic-core.ts';
import { PRAYER_NOTIFICATION_NAMESPACE, IOS_PENDING_NOTIFICATION_LIMIT } from './domain/prayer-notifications.ts';
import { DEVOTIONAL_NAMESPACE } from './domain/devotional-reminders.ts';
import { HookHarness } from './test-support/react-hooks.ts';
import { usePrayerNotifications } from './use-prayer-notifications.ts';

Platform.OS = 'ios';

type Props = Parameters<typeof usePrayerNotifications>[0];
type HookApi = {
  status: string;
  scheduledCount: number;
  error: string | null;
  reconcile: () => void;
  testAlert: (prayer?: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha') => Promise<boolean>;
};

const settings = { method: 0 as const, hanafi: false, ramadan: false, highLatitudeRule: 'middle' as const, polarRule: 'none' as const };
const location = { latitude: 24.7136, longitude: 46.6753 };
const labels = { title: 'Adhan', channelName: 'Adhan channel', body: () => 'Prayer body', testTitle: 'Test', testBody: 'Test body' };

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

async function mountHook(props: Props): Promise<HookHarness> {
  const harness = new HookHarness(() => usePrayerNotifications(props));
  harness.mount();
  await harness.settle();
  return harness;
}

function api(harness: HookHarness): HookApi {
  return harness.result as unknown as HookApi;
}

function prayerOwned() {
  return Notifications.store.scheduled.filter(item => item.content.data?.namespace === PRAYER_NOTIFICATION_NAMESPACE);
}

function prayerTests() {
  return prayerOwned().filter(item => item.content.data?.test === true);
}

function baseProps(): Props {
  return {
    ready: true,
    enabled: true,
    notificationLimit: 40,
    location,
    settings,
    language: 'ar',
    labels,
  } as unknown as Props;
}

async function seedForeign(count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    ids.push(`f-${i}`);
    Notifications.store.scheduled.push(foreignItem(`f-${i}`) as never);
  }
  return ids;
}

test('schedules only into the remaining shared pending budget and preserves foreign alerts', async () => {
  Notifications.resetStore();
  const foreignIds = await seedForeign(50);
  const props = baseProps();
  const harness = await mountHook(props);
  assert.equal(api(harness).status, 'ready');
  assert.equal(api(harness).scheduledCount, IOS_PENDING_NOTIFICATION_LIMIT - 50);
  assert.equal(Notifications.store.scheduled.length, IOS_PENDING_NOTIFICATION_LIMIT);
  for (const id of foreignIds) assert.ok(Notifications.store.scheduled.some(item => item.identifier === id));
  harness.unmount();
});

test('an exhausted pending pool schedules nothing new', async () => {
  Notifications.resetStore();
  await seedForeign(64);
  const props = baseProps();
  const harness = await mountHook(props);
  assert.equal(api(harness).status, 'ready');
  assert.equal(api(harness).scheduledCount, 0);
  assert.equal(Notifications.store.scheduled.length, 64);
  harness.unmount();
});

test('a caller notificationLimit lower than the remaining budget wins', async () => {
  Notifications.resetStore();
  await seedForeign(50);
  const props = baseProps();
  props.notificationLimit = 5;
  const harness = await mountHook(props);
  assert.equal(api(harness).scheduledCount, 5);
  assert.equal(Notifications.store.scheduled.length, 55);
  harness.unmount();
});

test('reconciliation cancels owned prayer alerts but never user test alerts', async () => {
  Notifications.resetStore();
  const foreignIds = await seedForeign(1);
  Notifications.store.scheduled.push(
    ownedItem('prev-1', { namespace: PRAYER_NOTIFICATION_NAMESPACE, prayer: 'isha', date: '2025-1-1' }) as never,
    ownedItem('test-1', { namespace: PRAYER_NOTIFICATION_NAMESPACE, test: true, prayer: 'fajr' }) as never,
  );
  const props = baseProps();
  const harness = await mountHook(props);
  assert.ok(!Notifications.store.scheduled.some(item => item.identifier === 'prev-1'), 'a replaced prayer alert is cancelled');
  assert.ok(Notifications.store.scheduled.some(item => item.identifier === 'test-1'), 'the 5s test alert survives the reconcile');
  for (const id of foreignIds) assert.ok(Notifications.store.scheduled.some(item => item.identifier === id));

  assert.equal(await api(harness).testAlert('maghrib'), true);
  assert.ok(!Notifications.store.scheduled.some(item => item.identifier === 'test-1'), 'a new test alert replaces the previous one');
  const replacedTest = Notifications.store.scheduled.find(item => item.content.data?.test === true);
  assert.ok(replacedTest);
  assert.equal(replacedTest.content.data?.prayer, 'maghrib');

  props.language = 'en';
  harness.render();
  await harness.settle();
  assert.ok(Notifications.store.scheduled.some(item => item.identifier === replacedTest.identifier), 'a reconcile inside the test window keeps the test alert');
  assert.ok(Notifications.store.scheduled.length <= IOS_PENDING_NOTIFICATION_LIMIT);
  harness.unmount();
});

test('a superseded reconcile aborts before cancelling or scheduling', async () => {
  Notifications.resetStore();
  const foreignIds = await seedForeign(50);
  Notifications.store.scheduled.push(
    ownedItem('prev-1', { namespace: PRAYER_NOTIFICATION_NAMESPACE, prayer: 'isha', date: '2025-1-1' }) as never,
  );
  const staleGetAll = deferred<unknown[]>();
  Notifications.store.getAllOverride = () => staleGetAll.promise;
  const props = baseProps();
  const harness = new HookHarness(() => usePrayerNotifications(props));
  harness.mount();
  // Let the mount reconcile enter getAll while the override is still the gate.
  await harness.settle();
  const supersedingGetAll = deferred<unknown[]>();
  Notifications.store.getAllOverride = () => supersedingGetAll.promise;

  api(harness).reconcile();
  const logAtStall = Notifications.store.log.length;
  staleGetAll.resolve(Notifications.store.scheduled.slice());
  // Wake the stale reconcile: it aborts, then the superseding one reaches its getAll and parks.
  await new Promise(resolve => setImmediate(resolve));
  await harness.settle();
  assert.equal(Notifications.store.log.length, logAtStall, 'the stale generation made no writes');
  assert.ok(Notifications.store.scheduled.some(item => item.identifier === 'prev-1'), 'the aborted reconcile left the owned alert in place');

  Notifications.store.getAllOverride = null;
  supersedingGetAll.resolve(Notifications.store.scheduled.slice());
  await harness.settle();

  assert.ok(!Notifications.store.scheduled.some(item => item.identifier === 'prev-1'), 'the superseding reconcile replaced the owned alert');
  assert.deepEqual(Notifications.store.scheduled.filter(item => item.content.data?.namespace === PRAYER_NOTIFICATION_NAMESPACE).length, IOS_PENDING_NOTIFICATION_LIMIT - 50);
  assert.equal(api(harness).status, 'ready');
  assert.equal(api(harness).scheduledCount, IOS_PENDING_NOTIFICATION_LIMIT - 50);
  for (const id of foreignIds) assert.ok(Notifications.store.scheduled.some(item => item.identifier === id));
  assert.equal(api(harness).error, null);
  harness.unmount();
});

test('a wedged notification resolve cannot schedule stale prayers later on', async () => {
  Notifications.resetStore();
  await seedForeign(50);
  const gate = deferred<unknown[]>();
  Notifications.store.getAllOverride = () => gate.promise;
  const props = baseProps();
  const harness = new HookHarness(() => usePrayerNotifications(props));
  harness.mount();
  Notifications.store.getAllOverride = null;

  api(harness).reconcile();
  gate.resolve(Notifications.store.scheduled.slice());
  await harness.settle();
  assert.equal(api(harness).status, 'ready');
  assert.equal(api(harness).scheduledCount, IOS_PENDING_NOTIFICATION_LIMIT - 50);
  assert.ok(!Notifications.store.scheduled.some(item =>
    (item.content.data?.namespace ?? '') === PRAYER_NOTIFICATION_NAMESPACE && typeof item.content.data?.date === 'string' && item.content.data.date.startsWith('2025')
  ));
  harness.unmount();
});

test('disabling alerts cancels the pending test and every owned prayer, and protects foreign alerts', async () => {
  Notifications.resetStore();
  const props = baseProps();
  const harness = await mountHook(props);
  assert.ok(prayerOwned().length > 0, 'recurring prayers were scheduled');
  assert.equal(await api(harness).testAlert('fajr'), true);
  assert.equal(prayerTests().length, 1);
  Notifications.store.scheduled.push(
    foreignItem('foreign-1') as never,
    ownedItem('devotional-1', { namespace: DEVOTIONAL_NAMESPACE, kind: 'salawat' }) as never,
  );

  props.enabled = false;
  harness.render();
  await harness.settle();

  assert.equal(api(harness).status, 'disabled');
  assert.equal(prayerOwned().length, 0, 'the master toggle cancels prayer and test alerts');
  assert.ok(Notifications.store.scheduled.some(item => item.identifier === 'foreign-1'), 'foreign alerts are untouched');
  assert.ok(Notifications.store.scheduled.some(item => item.identifier === 'devotional-1'), 'devotional alerts are untouched');
  harness.unmount();
});

test('a disable that lands while a test alert is scheduling cancels the late test', async () => {
  Notifications.resetStore();
  const props = baseProps();
  const harness = await mountHook(props);

  const pending = api(harness).testAlert('fajr');
  props.enabled = false;
  harness.render();
  await pending;
  await harness.settle();

  assert.equal(prayerTests().length, 0, 'no test reminder remains after a disable racing the async test');
  assert.equal(api(harness).status, 'disabled');
  harness.unmount();
});

void AppState; void Linking; void islamicCore;
