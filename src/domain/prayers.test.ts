import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculationFlags, decodePrayerTimes, localCalendarDate, nextPrayer } from './prayers.ts';

test('uses local calendar components across UTC midnight and DST', () => {
  const before = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Riyadh';
    assert.deepEqual(localCalendarDate(new Date('2026-10-10T22:00:00Z')), [2026, 10, 11]);
    process.env.TZ = 'America/New_York';
    assert.deepEqual(localCalendarDate(new Date('2026-03-08T04:30:00Z')), [2026, 3, 7]);
    assert.deepEqual(localCalendarDate(new Date('2026-03-08T07:30:00Z')), [2026, 3, 8]);
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
});

test('Ramadan interval applies only to Umm al-Qura, alongside Asr preference', () => {
  assert.equal(calculationFlags({ method: 0, hanafi: true, ramadan: true }), 48);
  assert.equal(calculationFlags({ method: 1, hanafi: false, ramadan: true }), 1);
});

test('rejects missing, invalid, unordered, and duplicate native times', () => {
  for (const times of [[], [1, 2, 3, 4, 5], [1, 2, 3, NaN, 5, 6], [1, 2, 3, 3, 5, 6], [1, 2, 3, 5, 4, 6]]) {
    assert.throws(() => decodePrayerTimes(times), RangeError);
  }
});

test('sunrise is not an obligatory prayer and no stale next-prayer appears after Isha', () => {
  const times = decodePrayerTimes([100, 200, 300, 400, 500, 600]);
  assert.equal(nextPrayer(times, new Date(150_000)), 'dhuhr');
  assert.equal(nextPrayer(times, new Date(600_000)), null);
});
