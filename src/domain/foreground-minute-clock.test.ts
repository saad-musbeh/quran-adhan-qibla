import assert from 'node:assert/strict';
import {test} from 'node:test';
import {startForegroundMinuteClock} from './foreground-minute-clock.ts';

test('countdowns tick on wall-clock minutes, pause in background, refresh on resume, and stop when hidden', () => {
  let milliseconds = 61_250;
  let nextId = 0;
  let removed = false;
  let onForeground: (foreground: boolean) => void = () => {};
  const pending = new Map<number, {callback: () => void; delay: number}>();
  const updates: number[] = [];
  const stop = startForegroundMinuteClock({
    foreground: true,
    now: () => new Date(milliseconds),
    schedule: (callback, delay) => {const id = ++nextId; pending.set(id, {callback, delay}); return id;},
    cancel: id => {pending.delete(id);},
    subscribe: listener => {onForeground = listener; return () => {removed = true;};},
  }, now => updates.push(now.getTime()));
  assert.deepEqual(updates, [61_250]);
  assert.equal(pending.size, 1);
  assert.equal(pending.get(nextId)?.delay, 58_750);
  milliseconds = 120_000;
  pending.get(nextId)!.callback();
  assert.deepEqual(updates, [61_250, 120_000]);
  assert.equal(pending.size, 1);
  assert.equal(pending.get(nextId)?.delay, 60_000);
  const oldCallback = pending.get(nextId)!.callback;
  onForeground(false);
  assert.equal(pending.size, 0);
  oldCallback();
  assert.deepEqual(updates, [61_250, 120_000]);
  milliseconds = 9_999_001;
  onForeground(true);
  assert.deepEqual(updates, [61_250, 120_000, 9_999_001]);
  assert.equal(pending.get(nextId)?.delay, 20_999);
  const latestCallback = pending.get(nextId)!.callback;
  stop();
  assert.equal(removed, true);
  assert.equal(pending.size, 0);
  onForeground(true);
  latestCallback();
  assert.equal(updates.length, 3);
  assert.equal(pending.size, 0);
});

test('a clock opened while backgrounded waits for foreground before updating or scheduling', () => {
  let listener: (foreground: boolean) => void = () => {};
  let ticks = 0;
  let scheduled = 0;
  const stop = startForegroundMinuteClock({
    foreground: false,
    now: () => new Date(0),
    schedule: () => ++scheduled,
    cancel: () => {},
    subscribe: onForeground => {listener = onForeground; return () => {};},
  }, () => {ticks += 1;});
  assert.equal(ticks, 0);
  assert.equal(scheduled, 0);
  listener(true);
  assert.equal(ticks, 1);
  assert.equal(scheduled, 1);
  stop();
});
