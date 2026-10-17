import assert from 'node:assert/strict';
import test from 'node:test';
import { enqueueNotificationReconcile, RECONCILE_TIMEOUT_MS } from './notification-queue.ts';

async function flush(): Promise<void> {
  for (let i = 0; i < 30; i++) await new Promise(setImmediate);
}

test('fast reconciles run once each and in enqueue order', async () => {
  const order: string[] = [];
  enqueueNotificationReconcile(async () => { order.push('first'); });
  enqueueNotificationReconcile(async () => { order.push('second'); });
  enqueueNotificationReconcile(async () => { order.push('third'); });
  await flush();
  assert.deepEqual(order, ['first', 'second', 'third']);
});

test('a failing reconcile unblocks the next reconcile', async () => {
  const order: string[] = [];
  enqueueNotificationReconcile(async () => { order.push('start'); throw new Error('reconcile boom'); });
  enqueueNotificationReconcile(async () => { order.push('after-error'); });
  await flush();
  assert.deepEqual(order, ['start', 'after-error']);
});

test('a synchronously throwing reconcile unblocks the next reconcile', async () => {
  const order: string[] = [];
  enqueueNotificationReconcile(() => { throw new Error('sync boom'); });
  enqueueNotificationReconcile(async () => { order.push('after-sync'); });
  await flush();
  assert.deepEqual(order, ['after-sync']);
});

test('a wedged reconcile times out and the queued reconcile still runs', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const order: string[] = [];
  enqueueNotificationReconcile(() => new Promise<void>(() => undefined));
  enqueueNotificationReconcile(async () => { order.push('rescued'); });
  await flush();
  assert.deepEqual(order, []);
  t.mock.timers.tick(RECONCILE_TIMEOUT_MS);
  await flush();
  assert.deepEqual(order, ['rescued']);
});

test('a wedged reconcile that later rejects does not escape the chain', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const order: string[] = [];
  let sinkReject!: (error: Error) => void;
  enqueueNotificationReconcile(() => new Promise<void>((_resolve, reject) => { sinkReject = reject; }));
  enqueueNotificationReconcile(async () => { order.push('second'); });
  await flush();
  t.mock.timers.tick(RECONCILE_TIMEOUT_MS);
  await flush();
  assert.deepEqual(order, ['second']);
  sinkReject(new Error('late native failure'));
  await flush();
  assert.deepEqual(order, ['second']);
});

test('a wedged reconcile cannot delay a settled quick successor beyond the timeout', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const order: string[] = [];
  enqueueNotificationReconcile(async () => { order.push('quick'); });
  enqueueNotificationReconcile(() => new Promise<void>(() => undefined));
  enqueueNotificationReconcile(async () => { order.push('after-wedge'); });
  await flush();
  t.mock.timers.tick(RECONCILE_TIMEOUT_MS);
  await flush();
  assert.deepEqual(order, ['quick', 'after-wedge']);
});
