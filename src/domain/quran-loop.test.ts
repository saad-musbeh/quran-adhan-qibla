import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

(globalThis as typeof globalThis & { require: NodeRequire }).require = createRequire(import.meta.url);
const { createQuranLoopRange } = await import('./quran-loop.ts');

test('creates a loop range from valid same-surah ayah keys, including a single ayah', () => {
  assert.deepEqual(createQuranLoopRange('1:2', '1:5'), { ok: true, surah: 1, start: 2, end: 5 });
  assert.deepEqual(createQuranLoopRange('1:4', '1:4'), { ok: true, surah: 1, start: 4, end: 4 });
});

test('defaults an omitted ending ayah to the last ayah of the starting surah', () => {
  assert.deepEqual(createQuranLoopRange('1:3'), { ok: true, surah: 1, start: 3, end: 7 });
  assert.deepEqual(createQuranLoopRange('2:285', null), { ok: true, surah: 2, start: 285, end: 286 });
});

test('validates keys against actual Quran verse limits', () => {
  assert.deepEqual(createQuranLoopRange('1:1', '1:7'), { ok: true, surah: 1, start: 1, end: 7 });
  assert.deepEqual(createQuranLoopRange('1:1', '1:8'), { ok: false, error: 'invalid-key' });
});

test('rejects malformed, decimal, and nonexistent ayah keys', () => {
  assert.deepEqual(createQuranLoopRange('1.5:2', '1:5'), { ok: false, error: 'invalid-key' });
  assert.deepEqual(createQuranLoopRange('1:2.5', '1:5'), { ok: false, error: 'invalid-key' });
  assert.deepEqual(createQuranLoopRange('115:1', '115:2'), { ok: false, error: 'invalid-key' });
});

test('rejects ranges crossing surahs or running backward', () => {
  assert.deepEqual(createQuranLoopRange('1:7', '2:1'), { ok: false, error: 'different-surah' });
  assert.deepEqual(createQuranLoopRange('1:5', '1:2'), { ok: false, error: 'reversed' });
});
