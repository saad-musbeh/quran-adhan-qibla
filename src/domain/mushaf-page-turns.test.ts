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

test('tablet panels sequence two-page turns without skipping a spread',()=>{
  const left=new MushafPageTurns(57,2),right=new MushafPageTurns(58,2);
  assert.equal(left.accept(57,1,1),59);
  assert.equal(right.accept(58,1,1),60);
  assert.equal(left.accept(59,-1,2),57);
  assert.equal(right.accept(60,-1,2),58);
  assert.equal(left.request(59),null);
  assert.equal(right.request(60),null);
  assert.equal(left.request(57),2);
  assert.equal(right.request(58),2);
  const last=new MushafPageTurns(604,2);
  assert.equal(last.accept(604,1,1),null);
});
