import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMapMessage } from './map-message.ts';

test('accepts finite coordinates within geographic bounds', () => {
  assert.deepEqual(parseMapMessage('{"type":"select","latitude":24.7,"longitude":46.7}'), { latitude: 24.7, longitude: 46.7 });
  assert.deepEqual(parseMapMessage('{"type":"select","latitude":-90,"longitude":180}'), { latitude: -90, longitude: 180 });
});

test('rejects malformed, wrong-shape, non-finite, and out-of-range messages', () => {
  for (const raw of ['nope', '{}', '{"type":"open","url":"https://example.com"}', '{"type":"select","latitude":null,"longitude":0}', '{"type":"select","latitude":91,"longitude":0}', '{"type":"select","latitude":0,"longitude":181}', '{"type":"select","latitude":1e309,"longitude":0}']) {
    assert.equal(parseMapMessage(raw), null, raw);
  }
});
