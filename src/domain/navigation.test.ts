import assert from 'node:assert/strict';
import test from 'node:test';
import { isDeliberateTabSwipe, neighborForSwipe } from './navigation.ts';

test('tab gesture recognizer ignores taps, vertical/diagonal drags, and multi-touch', () => {
  assert.equal(isDeliberateTabSwipe(8, 2, 1), false);
  assert.equal(isDeliberateTabSwipe(28, 0, 1), false);
  assert.equal(isDeliberateTabSwipe(80, 0, 2), false);
  assert.equal(isDeliberateTabSwipe(28, 24, 1), false);
  assert.equal(isDeliberateTabSwipe(4, 60, 1), false);
  assert.equal(isDeliberateTabSwipe(Number.NaN, 0, 1), false);
  assert.equal(isDeliberateTabSwipe(Number.POSITIVE_INFINITY, 0, 1), false);
  assert.equal(isDeliberateTabSwipe(48, 20, 1), true);
});

test('swipes advance through tabs in the visible LTR and reversed RTL orders, clamping at edges', () => {
  assert.equal(neighborForSwipe('quran', -80, 4, 'en'), 'adhan');
  assert.equal(neighborForSwipe('adhan', -80, 4, 'en'), 'qibla');
  assert.equal(neighborForSwipe('quran', 80, 4, 'en'), null);

  assert.equal(neighborForSwipe('quran', 80, 4, 'ar'), 'adhan');
  assert.equal(neighborForSwipe('adhan', 80, 4, 'ar'), 'qibla');
  assert.equal(neighborForSwipe('qibla', 80, 4, 'ar'), 'adhkar');
  assert.equal(neighborForSwipe('quran', -80, 4, 'ar'), null);
});

test('the adhkar tab is reachable and clamps at the fourth-tab edge',()=>{assert.equal(neighborForSwipe('qibla',-80,0,'en'),'adhkar');assert.equal(neighborForSwipe('adhkar',-80,0,'en'),null);assert.equal(neighborForSwipe('adhkar',80,0,'ar'),null);assert.equal(neighborForSwipe('adhkar',-80,0,'ar'),'qibla');});
