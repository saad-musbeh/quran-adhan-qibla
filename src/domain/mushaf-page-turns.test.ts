import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MushafPageTurns } from './mushaf-page-turns.ts';

test('rapid page turns survive delayed intermediate React commits', () => {
  const turns = new MushafPageTurns(58);
  assert.equal(turns.accept(58, 1, 1), 59);
  assert.equal(turns.accept(59, 1, 2), 60);
  assert.equal(turns.accept(60, -1, 3), 59);
  assert.equal(turns.accept(59, -1, 4), 58);
  assert.equal(turns.request(59), null);
  assert.equal(turns.request(60), null);
  assert.equal(turns.page, 58);
  assert.equal(turns.request(58), 4);
  assert.equal(turns.accept(58, 1, 5), 59);
});

test('page picker navigation and reloads establish a new displayed page', () => {
  const turns = new MushafPageTurns(58);
  turns.accept(58, 1, 1);
  assert.equal(turns.request(300), 1);
  assert.equal(turns.accept(59, 1, 2), null);
  assert.equal(turns.accept(300, 1, 2), 301);
  const reloaded = new MushafPageTurns(301);
  assert.equal(reloaded.accept(301, -1, 1), 300);
});

test('duplicate, out-of-order and out-of-bounds page-turn messages are rejected', () => {
  const turns = new MushafPageTurns(1);
  for (const [page,delta,sequence] of [[1,-1,1],[1,0,1],[1,2,1],[2,1,1],[1,1,2],[1,1,NaN]]) {
    assert.equal(turns.accept(page,delta,sequence), null);
  }
  assert.equal(turns.accept(1,1,1), 2);
  assert.equal(turns.accept(1,1,1), null);
  assert.equal(turns.accept(2,1,1), null);
  const last = new MushafPageTurns(604);
  assert.equal(last.accept(604,1,1), null);
  assert.equal(last.accept(604,-1,1), 603);
});

test('alternating gestures share one spread sequence despite delayed React commits', () => {
  const turns = new MushafPageTurns(57, 2);
  assert.equal(turns.accept(57, 1, 1), 59);
  assert.equal(turns.accept(59, 1, 2), 61);
  assert.equal(turns.accept(61, -1, 3), 59);
  assert.equal(turns.accept(59, -1, 4), 57);

  // A gesture on either leaf must advance this same canonical spread anchor.
  assert.equal(turns.accept(58, 1, 5), null);
  assert.equal(turns.accept(57, 1, 4), null);
  assert.equal(turns.request(59), null);
  assert.equal(turns.request(61), null);
  assert.equal(turns.page, 57);
  assert.equal(turns.sequence, 4);
  assert.equal(turns.request(57), 4);
  assert.equal(turns.accept(57, 1, 5), 59);
});

test('first and last spreads reject outward turns without consuming a sequence', () => {
  const first = new MushafPageTurns(1, 2);
  assert.equal(first.accept(1, -1, 1), null);
  assert.equal(first.accept(1, 1, 1), 3);
  assert.equal(first.accept(3, -1, 2), 1);
  assert.equal(first.accept(1, -1, 3), null);
  assert.equal(first.page, 1);
  assert.equal(first.sequence, 2);

  const last = new MushafPageTurns(603, 2);
  assert.equal(last.accept(603, 1, 1), null);
  assert.equal(last.accept(603, -1, 1), 601);
  assert.equal(last.accept(601, 1, 2), 603);
  assert.equal(last.accept(603, 1, 3), null);
  assert.equal(last.page, 603);
  assert.equal(last.sequence, 2);
});

test('spread navigation rejects messages from the previous book position', () => {
  const turns = new MushafPageTurns(1, 2);
  assert.equal(turns.accept(1, 1, 1), 3);
  assert.equal(turns.request(603), 1);
  assert.equal(turns.accept(3, 1, 2), null);
  assert.equal(turns.accept(603, -1, 2), 601);
  assert.equal(turns.request(601), 2);
});
