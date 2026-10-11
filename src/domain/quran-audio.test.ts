import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

(globalThis as typeof globalThis & { require: NodeRequire }).require = createRequire(import.meta.url);
const { audioCacheKey, createAudioRange, isValidAudioDownloadResponse, nextVersePosition, previousPositionInRange, previousVersePosition } = await import('./quran-audio.ts');

test('audio ranges validate boundaries and advance across their end by looping to the start', () => {
  const range = createAudioRange(2, 3, 5);
  assert.deepEqual(nextVersePosition({ surah: 2, verse: 4 }, range), { surah: 2, verse: 5 });
  assert.deepEqual(nextVersePosition({ surah: 2, verse: 5 }, range), { surah: 2, verse: 3 });
  assert.deepEqual(previousPositionInRange({ surah: 2, verse: 3 }, range), { surah: 2, verse: 5 });
  assert.deepEqual(nextVersePosition({ surah: 2, verse: 9 }, createAudioRange(2, 9, 9)), { surah: 2, verse: 9 });
  assert.throws(() => createAudioRange(2, 4, 3), RangeError);
  assert.throws(() => createAudioRange(2, 1, 287), RangeError);
});

test('whole-Quran queue crosses surah boundaries and ends after An-Nas', () => {
  assert.deepEqual(nextVersePosition({ surah: 1, verse: 7 }, null), { surah: 2, verse: 1 });
  assert.deepEqual(nextVersePosition({ surah: 114, verse: 6 }, null), null);
  assert.deepEqual(previousVersePosition({ surah: 2, verse: 1 }), { surah: 1, verse: 7 });
  assert.deepEqual(previousVersePosition({ surah: 1, verse: 1 }), null);
});

test('audio cache keys include reciter and zero-padded verse identity', () => {
  assert.equal(audioCacheKey('alafasy', 2, 9), 'quran-audio-v1/alafasy/002009.mp3');
  assert.notEqual(audioCacheKey('husary', 2, 9), audioCacheKey('alafasy', 2, 9));
});

test('download validation rejects HTML error pages even when they return a success status', () => {
  assert.equal(isValidAudioDownloadResponse(200, 'audio/mpeg', {}), true);
  assert.equal(isValidAudioDownloadResponse(200, null, { 'Content-Type': 'audio/mpeg; charset=binary' }), true);
  assert.equal(isValidAudioDownloadResponse(200, 'application/octet-stream', {}), true);
  assert.equal(isValidAudioDownloadResponse(200, 'text/html', {}), false);
  assert.equal(isValidAudioDownloadResponse(404, 'audio/mpeg', {}), false);
  assert.equal(isValidAudioDownloadResponse(206, 'audio/mpeg', {}), false);
});
