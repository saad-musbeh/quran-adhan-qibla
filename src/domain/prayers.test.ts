import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculationFlags, decodePrayerTimes, localCalendarDate, nextLocalCalendarDate, nextPrayer, nextPrayerOccurrence } from './prayers.ts';

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

test('next Adhan changes at prayer boundaries and crosses to the calculated Fajr after Isha', () => {
  const today = decodePrayerTimes([100, 200, 300, 400, 500, 600]);
  const tomorrow = decodePrayerTimes([1000, 1100, 1200, 1300, 1400, 1500]);
  assert.deepEqual(nextPrayerOccurrence(today, tomorrow, new Date(99_000)), { name: 'fajr', time: today[0], tomorrow: false });
  assert.deepEqual(nextPrayerOccurrence(today, tomorrow, new Date(100_000)), { name: 'dhuhr', time: today[2], tomorrow: false });
  assert.deepEqual(nextPrayerOccurrence(today, tomorrow, new Date(600_000)), { name: 'fajr', time: tomorrow[0], tomorrow: true });
  assert.equal(nextPrayerOccurrence(today, null, new Date(600_000)), null);
  assert.equal(nextPrayerOccurrence(today, tomorrow, new Date(1000_000)), null);
});

test('tomorrow advances across midnight, month/year ends, and 23/25-hour local dates', () => {
  const before = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    assert.deepEqual(nextLocalCalendarDate(new Date(2026, 2, 8, 23, 30)), [2026, 3, 9]);
    assert.deepEqual(nextLocalCalendarDate(new Date(2026, 9, 31, 23, 30)), [2026, 11, 1]);
    assert.deepEqual(nextLocalCalendarDate(new Date(2026, 10, 1, 23, 30)), [2026, 11, 2]);
    assert.deepEqual(nextLocalCalendarDate(new Date(2026, 11, 31, 23, 30)), [2027, 1, 1]);
    const today = [5, 6, 12, 15, 18, 20].map(hour => new Date(2026, 9, 31, hour));
    const tomorrow = [5, 6, 12, 15, 18, 20].map(hour => new Date(2026, 10, 1, hour));
    const next = nextPrayerOccurrence(today, tomorrow, new Date(2026, 9, 31, 23, 30));
    assert.deepEqual(next, { name: 'fajr', time: tomorrow[0], tomorrow: true });
    assert.equal(tomorrow[0].getTime() - today[0].getTime(), 25 * 60 * 60 * 1000);
    assert.deepEqual(nextPrayerOccurrence(tomorrow, null, new Date(2026, 10, 1, 0)), { name: 'fajr', time: tomorrow[0], tomorrow: false });
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
});
