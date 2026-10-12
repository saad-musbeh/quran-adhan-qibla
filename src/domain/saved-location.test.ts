import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_SAVED_LOCATION_LABEL_LENGTH, validateSavedLocation } from './saved-location.ts';

const valid = { latitude: 90, longitude: -180, source: 'city', label: 'Makkah', timestamp: 100 } as const;

test('validates persisted coordinates, allowed sources, and timestamps', () => {
  assert.deepEqual(validateSavedLocation(valid, 100), valid);
  for (const patch of [
    { latitude: NaN }, { latitude: 90.01 }, { longitude: Infinity }, { longitude: -180.01 },
    { source: 'gps' }, { timestamp: Infinity }, { timestamp: 101 }, { timestamp: -1 },
  ]) assert.equal(validateSavedLocation({ ...valid, ...patch }, 100), null);
  for (const source of ['device', 'city', 'map', 'manual']) {
    assert.equal(validateSavedLocation({ ...valid, source }, 100)?.source, source);
  }
});

test('bounds labels and rejects malformed optional metadata', () => {
  const normalized = validateSavedLocation({ ...valid, label: `  ${'x'.repeat(200)}  `, accuracy: 0 }, 100);
  assert.equal(normalized?.label?.length, MAX_SAVED_LOCATION_LABEL_LENGTH);
  assert.equal(normalized?.accuracy, 0);
  assert.equal(validateSavedLocation({ ...valid, label: 3 }, 100), null);
  assert.equal(validateSavedLocation({ ...valid, accuracy: -1 }, 100), null);
  assert.equal(validateSavedLocation({ ...valid, accuracy: Infinity }, 100), null);
  assert.equal(validateSavedLocation({ ...valid, accuracy: null }, 100)?.accuracy, null);
});

test('rejects non-record payloads', () => {
  assert.equal(validateSavedLocation(null, 100), null);
  assert.equal(validateSavedLocation([], 100), null);
  assert.equal(validateSavedLocation('location', 100), null);
});
