import assert from 'node:assert/strict';
import test from 'node:test';
import { Platform } from './test-support/stubs/react-native.ts';
import * as Notifications from './test-support/stubs/expo-notifications.ts';
import { PRAYER_NOTIFICATION_NAMESPACE, IOS_PENDING_NOTIFICATION_LIMIT } from './domain/prayer-notifications.ts';
import { DEVOTIONAL_NAMESPACE } from './domain/devotional-reminders.ts';
import { HookHarness } from './test-support/react-hooks.ts';
import { usePrayerNotifications } from './use-prayer-notifications.ts';
import { RECONCILE_TIMEOUT_MS } from './notification-queue.ts';

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
  const harness = new HookHarness(() => usePrayerNotifications({ ...props }));
  await harness.mount();
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

test('schedules only into the remaining shared pending budget and preserves foreign alerts', async t => {
  Notifications.resetStore();
  const foreignIds = await seedForeign(50);
  const props = baseProps();
  const harness = await mountHook(props);
  t.after(() => harness.unmount());
  assert.equal(api(harness).status, 'ready');
  assert.equal(api(harness).scheduledCount, 12);
  assert.equal(Notifications.store.scheduled.length, 62, 'two slots remain for user test alerts');
  for (const id of foreignIds) assert.ok(Notifications.store.scheduled.some(item => item.identifier === id));
});

test('an exhausted pending pool schedules nothing new', async t => {
  Notifications.resetStore();
  await seedForeign(64);
  const props = baseProps();
  const harness = await mountHook(props);
  t.after(() => harness.unmount());
  assert.equal(api(harness).status, 'ready');
  assert.equal(api(harness).scheduledCount, 0);
  assert.equal(Notifications.store.scheduled.length, 64);
});

test('a caller notificationLimit lower than the remaining budget wins', async t => {
  Notifications.resetStore();
  await seedForeign(50);
  const props = baseProps();
  props.notificationLimit = 5;
  const harness = await mountHook(props);
  t.after(() => harness.unmount());
  assert.equal(api(harness).scheduledCount, 5);
  assert.equal(Notifications.store.scheduled.length, 55);
});

test('reconciliation cancels owned prayer alerts but never user test alerts', async t => {
  Notifications.resetStore();
  const foreignIds = await seedForeign(1);
  Notifications.store.scheduled.push(
    ownedItem('prev-1', { namespace: PRAYER_NOTIFICATION_NAMESPACE, prayer: 'isha', date: '2025-1-1' }) as never,
    ownedItem('test-1', { namespace: PRAYER_NOTIFICATION_NAMESPACE, test: true, prayer: 'fajr' }) as never,
  );
  const props = baseProps();
  const harness = await mountHook(props);
  t.after(() => harness.unmount());
  assert.ok(!Notifications.store.scheduled.some(item => item.identifier === 'prev-1'), 'a replaced prayer alert is cancelled');
  assert.ok(Notifications.store.scheduled.some(item => item.identifier === 'test-1'), 'the 5s test alert survives the reconcile');
  for (const id of foreignIds) assert.ok(Notifications.store.scheduled.some(item => item.identifier === id));

  assert.equal(await harness.change(() => api(harness).testAlert('maghrib')), true);
  assert.ok(!Notifications.store.scheduled.some(item => item.identifier === 'test-1'), 'a new test alert replaces the previous one');
  const replacedTest = Notifications.store.scheduled.find(item => item.content.data?.test === true);
  assert.ok(replacedTest);
  assert.equal(replacedTest.content.data?.prayer, 'maghrib');

  props.language = 'en';
  await harness.render();
  await harness.settle();
  assert.ok(Notifications.store.scheduled.some(item => item.identifier === replacedTest.identifier), 'a reconcile inside the test window keeps the test alert');
  assert.ok(Notifications.store.scheduled.length <= IOS_PENDING_NOTIFICATION_LIMIT);
});

test('a superseded reconcile aborts before cancelling or scheduling', async t => {
  Notifications.resetStore();
  const foreignIds = await seedForeign(50);
  Notifications.store.scheduled.push(
    ownedItem('prev-1', { namespace: PRAYER_NOTIFICATION_NAMESPACE, prayer: 'isha', date: '2025-1-1' }) as never,
  );
  const staleGetAll = deferred<unknown[]>();
  Notifications.store.getAllOverride = () => staleGetAll.promise;
  const props = baseProps();
  const harness = new HookHarness(() => usePrayerNotifications({ ...props }));
  await harness.mount();
  t.after(() => harness.unmount());
  // Let the mount reconcile enter getAll while the override is still the gate.
  await harness.settle();
  const supersedingGetAll = deferred<unknown[]>();
  Notifications.store.getAllOverride = () => supersedingGetAll.promise;

  await harness.change(() => api(harness).reconcile());
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
});

test('a timed-out reconcile cannot schedule prayers after alerts have been disabled', async t => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: new Date('2026-10-20T10:00:00Z') });
  Notifications.resetStore();
  await seedForeign(50);
  const gate = deferred<unknown[]>();
  let entered = false;
  Notifications.store.getAllOverride = () => { entered = true; return gate.promise; };
  const props = baseProps();
  const harness = new HookHarness(() => usePrayerNotifications({ ...props }));
  await harness.mount();
  t.after(() => harness.unmount());
  assert.equal(entered, true, 'the first reconcile is blocked in native IO');
  Notifications.store.getAllOverride = null;
  props.enabled = false;
  await harness.render();
  await harness.change(() => t.mock.timers.tick(RECONCILE_TIMEOUT_MS));
  await harness.settle();
  assert.equal(api(harness).status, 'disabled', 'the disable proceeds while the old native call is unresolved');
  assert.equal(api(harness).scheduledCount, 0);
  const writes = [...Notifications.store.log];

  await harness.change(() => gate.resolve(Notifications.store.scheduled.slice()));
  assert.deepEqual(Notifications.store.log, writes, 'the late reconcile cannot cancel or schedule anything');
  assert.equal(prayerOwned().length, 0);
  assert.equal(Notifications.store.scheduled.length, 50);
});

test('disabling alerts cancels the pending test and every owned prayer, and protects foreign alerts', async t => {
  Notifications.resetStore();
  const props = baseProps();
  const harness = await mountHook(props);
  t.after(() => harness.unmount());
  assert.ok(prayerOwned().length > 0, 'recurring prayers were scheduled');
  assert.equal(await harness.change(() => api(harness).testAlert('fajr')), true);
  assert.equal(prayerTests().length, 1);
  Notifications.store.scheduled.push(
    foreignItem('foreign-1') as never,
    ownedItem('devotional-1', { namespace: DEVOTIONAL_NAMESPACE, kind: 'salawat' }) as never,
  );

  props.enabled = false;
  await harness.render();
  await harness.settle();

  assert.equal(api(harness).status, 'disabled');
  assert.equal(prayerOwned().length, 0, 'the master toggle cancels prayer and test alerts');
  assert.ok(Notifications.store.scheduled.some(item => item.identifier === 'foreign-1'), 'foreign alerts are untouched');
  assert.ok(Notifications.store.scheduled.some(item => item.identifier === 'devotional-1'), 'devotional alerts are untouched');
});

test('a disable that lands while a test alert is scheduling cancels the late test', async t => {
  Notifications.resetStore();
  const props = baseProps();
  const harness = await mountHook(props);
  t.after(() => harness.unmount());

  const gate = deferred<void>();
  Notifications.store.scheduleGate = gate.promise;
  t.after(() => gate.resolve());
  let pending!: Promise<boolean>;
  await harness.change(() => { pending = api(harness).testAlert('fajr'); });
  assert.equal(Notifications.store.log.at(-1)?.[0], 'schedule');
  assert.equal((Notifications.store.log.at(-1)?.[1] as { test?: boolean }).test, true,
    'the native schedule call is in flight before disabling');
  assert.equal(prayerTests().length, 0);
  props.enabled = false;
  await harness.render();
  await harness.settle();
  assert.equal(api(harness).status, 'disabled');
  await harness.change(() => gate.resolve());
  assert.equal(await pending, false);

  assert.equal(prayerTests().length, 0, 'no test reminder remains after a disable racing the async test');
  assert.equal(api(harness).status, 'disabled');
});
