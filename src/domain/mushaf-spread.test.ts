import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MushafPageTurns, mushafSpreadPages } from './mushaf-page-turns.ts';

test('opening landscape from either leaf includes the selected page in its book spread', () => {
  for (let page = 1; page <= 604; page++) {
    const pages = mushafSpreadPages(page, true);
    assert.equal(pages.length, 2);
    assert.equal(pages[0] % 2, 1);
    assert.equal(pages[1], pages[0] + 1);
    assert.ok(pages.includes(page), `selected page ${page} disappeared on rotation`);
    assert.deepEqual(mushafSpreadPages(page, false), [page]);
  }
  assert.deepEqual(mushafSpreadPages(1, true), [1, 2]);
  assert.deepEqual(mushafSpreadPages(2, true), [1, 2]);
  assert.deepEqual(mushafSpreadPages(603, true), [603, 604]);
  assert.deepEqual(mushafSpreadPages(604, true), [603, 604]);
});

test('turning the whole book visits every Mushaf page once and reaches page 604', () => {
  const turns = new MushafPageTurns(1, 2);
  const visited: number[] = [];
  for (let spread = 0; spread < 302; spread++) {
    visited.push(...mushafSpreadPages(turns.page, true));
    if (spread < 301) {
      assert.equal(turns.accept(turns.page, 1, spread + 1), 3 + spread * 2);
    }
  }
  assert.deepEqual(visited, Array.from({ length: 604 }, (_, index) => index + 1));
  assert.equal(turns.accept(603, 1, 302), null);
  assert.equal(turns.request(603), 301);

  for (let spread = 301; spread > 0; spread--) {
    const nextSequence = turns.sequence + 1;
    assert.equal(turns.accept(turns.page, -1, nextSequence), 2 * spread - 1);
  }
  assert.deepEqual(mushafSpreadPages(turns.page, true), [1, 2]);
  assert.equal(turns.accept(1, -1, turns.sequence + 1), null);
});

test('switching orientation keeps adjacent turns contiguous at both ends of the book', () => {
  for (const selectedPage of [1, 2, 3, 4, 601, 602, 603, 604]) {
    const [anchor] = mushafSpreadPages(selectedPage, true);
    const landscape = new MushafPageTurns(anchor, 2);
    const delta = anchor === 603 ? -1 : 1;
    const target = landscape.accept(anchor, delta, 1);
    assert.notEqual(target, null);
    const spread = mushafSpreadPages(target!, true);
    for (const leaf of spread) {
      const portrait = new MushafPageTurns(leaf);
      assert.deepEqual(mushafSpreadPages(portrait.page, false), [leaf]);
      const portraitDelta = leaf === 604 ? -1 : 1;
      assert.equal(portrait.accept(leaf, portraitDelta, 1), leaf + portraitDelta);
    }
  }
});
