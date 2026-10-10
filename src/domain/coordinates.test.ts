import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseCoordinate } from './coordinates.ts';

test('supports signed decimal degrees and Arabic locale input', () => {
  assert.equal(parseCoordinate(' -33.8688 ', 'latitude'), -33.8688);
  assert.equal(parseCoordinate('٢٤٫٧١٣٦', 'latitude'), 24.7136);
  assert.equal(parseCoordinate('۴۶,۶۷۵۳', 'longitude'), 46.6753);
  assert.equal(parseCoordinate('180', 'longitude'), 180);
  assert.equal(parseCoordinate('-90', 'latitude'), -90);
});

test('rejects empty, nondecimal, nonfinite, and out-of-range input', () => {
  for (const value of ['', ' ', '0x20', 'Infinity', 'NaN', '1e3', '12x', '١٢٫٣٫٤', '91', '-91']) {
    assert.equal(parseCoordinate(value, 'latitude'), null, value);
  }
  assert.equal(parseCoordinate('181', 'longitude'), null);
  assert.equal(parseCoordinate('-181', 'longitude'), null);
});
