import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

(globalThis as typeof globalThis & { require: NodeRequire }).require = createRequire(import.meta.url);
const { fullSurahUri, fullSurahQueue, parseAyahTimings, ayahAtTime } = await import('./surah-audio.ts');
const { RECITERS } = await import('../data/reciters.ts');

test('normal playback uses exactly one complete recording and never queues the following surah', () => {
  for (let surah = 1; surah <= 114; surah++) {
    for (const end of ['stop', 'repeat'] as const) {
      assert.deepEqual(fullSurahQueue(surah,end),[{surah,verse:1}]);
    }
    for (const voice of RECITERS) {
      assert.match(fullSurahUri(voice.id,surah),new RegExp(`/r[13]/${String(surah).padStart(3,'0')}\\.mp3$`));
    }
  }
});

test('only explicit Next queues subsequent full-surah recordings and An-Nas never wraps', () => {
  assert.deepEqual(fullSurahQueue(112,'next'),[{surah:112,verse:1},{surah:113,verse:1},{surah:114,verse:1}]);
  assert.deepEqual(fullSurahQueue(114,'next'),[{surah:114,verse:1}]);
  assert.deepEqual(fullSurahQueue(0,'stop'),[]);
  assert.throws(()=>fullSurahUri('ghamdi',115),RangeError);
});

// Provider timing rows for Ghamdi's full Al-Ikhlas (read 30), checked 2026-10-17.
const rows = [
  {ayah:1,start_time:6111,end_time:8358},
  {ayah:2,start_time:8358,end_time:10479},
  {ayah:3,start_time:10479,end_time:13251},
  {ayah:4,start_time:13251,end_time:16506},
];

test('highlighting follows source milliseconds and leaves introductions and gaps unhighlighted', () => {
  const timings = parseAyahTimings(rows,112);
  assert.equal(ayahAtTime(timings,0),null);
  assert.equal(ayahAtTime(timings,6.111),1);
  assert.equal(ayahAtTime(timings,8.358),2);
  assert.equal(ayahAtTime(timings,13.251),4);
  assert.equal(ayahAtTime(timings,16.506),null);
  assert.equal(ayahAtTime([],9),null);
});

test('missing, mismatched, overlapping or malformed timing data cannot invent highlights', () => {
  for (const value of [null,{},[],rows.slice(0,3),[...rows,{ayah:5,start_time:17000,end_time:18000}],
    rows.map(row=>({...row,start_time:'6111'})),rows.map(row=>({...row,end_time:Infinity})),
    rows.map(row=>({...row,start_time:0})),[...rows].reverse()]) {
    assert.deepEqual(parseAyahTimings(value,112),[]);
  }
  assert.deepEqual(parseAyahTimings(rows,113),[]);
  assert.equal(parseAyahTimings([{ayah:0,start_time:0,end_time:6111},...rows],112).length,4);
});
