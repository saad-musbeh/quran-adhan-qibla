import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
globalThis.require = createRequire(import.meta.url);
const {mushafNeighbors, mushafPreloadLeaves} = await import('./mushaf-preload.ts');
const {mushafSpreadPages} = await import('./mushaf-page-turns.ts');

test('preloading stays within three leaves and includes every visible leaf in both orientations', () => {
  for (const spread of [false, true]) for (let page = 1; page <= 606; page++) for (const direction of [-1, 1]) {
    const anchor = mushafSpreadPages(page, spread)[0];
    const planned = mushafPreloadLeaves(anchor, spread, direction);
    assert.ok(planned.length <= 3);
    assert.equal(new Set(planned).size, planned.length);
    assert.ok(planned.every(n => n >= 1 && n <= 606));
    for (const visible of mushafSpreadPages(anchor, spread)) assert.ok(planned.includes(visible));
  }
});

test('single pages prepare both neighbors, spreads prioritize the reading direction', () => {
  assert.deepEqual(mushafPreloadLeaves(50, false), [50, 51, 49]);
  assert.deepEqual(mushafPreloadLeaves(51, true), [51, 52, 53]);
  assert.deepEqual(mushafPreloadLeaves(51, true, -1), [51, 52, 50]);
  assert.deepEqual(mushafPreloadLeaves(603, true), [603, 604, 605]);
  assert.deepEqual(mushafNeighbors(605, true), [606, 603]);
  assert.deepEqual(mushafNeighbors(606, true), [605]);
  assert.deepEqual(mushafNeighbors(1, false), [2]);
});
