import assert from 'node:assert/strict';
import test from 'node:test';
import { isFacingTarget, magneticToTrueHeading, relativeBearing, smoothHeading, usableTrueHeading } from './heading.ts';

test('accepts true heading only with the highest calibration tier', () => {
  assert.equal(usableTrueHeading({ trueHeading: 124.5, magHeading: 128, accuracy: 3 }), 124.5);
  assert.equal(usableTrueHeading({ trueHeading: 124.5, magHeading: 128, accuracy: 2 }), null);
  assert.equal(usableTrueHeading({ trueHeading: -1, magHeading: 128, accuracy: 3 }), null);
  assert.equal(usableTrueHeading({ trueHeading: 360, magHeading: 128, accuracy: 3 }), null);
  assert.equal(usableTrueHeading({ trueHeading: Number.NaN, magHeading: 128, accuracy: 3 }), null);
  assert.equal(usableTrueHeading({ trueHeading: 124.5, magHeading: 128, accuracy: Number.NaN }), null);
});

test('computes shortest turns across north in either direction', () => {
  assert.equal(relativeBearing(5, 355), 10);
  assert.equal(relativeBearing(355, 5), -10);
  assert.equal(relativeBearing(180, 0), -180);
});

test('smooths compass samples across the north boundary', () => {
  assert.equal(smoothHeading(359, 1, 0.5), 0);
  assert.equal(smoothHeading(1, 359, 0.5), 0);
});

test('marks aligned only inside the configured tolerance', () => {
  assert.equal(isFacingTarget(8), true);
  assert.equal(isFacingTarget(-8), true);
  assert.equal(isFacingTarget(8.01), false);
});

test('corrects calibrated magnetic heading with east-positive declination', () => {
  assert.equal(magneticToTrueHeading({ trueHeading: -1, magHeading: 355, accuracy: 3 }, 10), 5);
  assert.equal(magneticToTrueHeading({ trueHeading: -1, magHeading: 5, accuracy: 3 }, -10), 355);
  assert.equal(magneticToTrueHeading({ trueHeading: -1, magHeading: 90, accuracy: 2 }, 4), null);
  assert.equal(magneticToTrueHeading({ trueHeading: -1, magHeading: 360, accuracy: 3 }, 4), null);
  assert.equal(magneticToTrueHeading({ trueHeading: -1, magHeading: 90, accuracy: 3 }, null), null);
});
