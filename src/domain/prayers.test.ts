import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculationFlags, countdownMinutes, countdownParts, decodePrayerTimes, localCalendarDate, nextLocalCalendarDate, nextMinuteDelay, nextPrayer, nextPrayerOccurrence, normalizePrayerSettings, polarCalculationDisabled, prayerOccurrenceFor } from './prayers.ts';

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

test('older preferences retain their method and require explicit polar approximation', () => {
  const migrated = normalizePrayerSettings({method: 5, hanafi: true, ramadan: false});
  assert.deepEqual(migrated, {method: 5, hanafi: true, ramadan: false, highLatitudeRule: 'middle', polarRule: 'none'});
  assert.equal(polarCalculationDisabled(64.99, migrated), false);
  assert.equal(polarCalculationDisabled(65, migrated), true);
  assert.equal(polarCalculationDisabled(-70, migrated), true);
  assert.equal(polarCalculationDisabled(70, {...migrated, polarRule: 'nearest-latitude'}), false);
  assert.deepEqual(normalizePrayerSettings(JSON.parse('{"method":99,"highLatitudeRule":"bad","polarRule":"bad"}')),
    normalizePrayerSettings(null));
});

test('twilight and polar flags preserve legacy native bits and remain independent', () => {
  const base = {method: 0, hanafi: true, ramadan: true} as const;
  assert.equal(calculationFlags({...base, highLatitudeRule: 'middle', polarRule: 'none'}), 0x30);
  assert.equal(calculationFlags({...base, highLatitudeRule: 'seventh', polarRule: 'nearest-latitude'}), 0x170);
  assert.equal(calculationFlags({...base, highLatitudeRule: 'angle', polarRule: 'nearest-latitude'}), 0x1b0);
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

test('each salah shows its own remaining time even when it is not the next Adhan', () => {
  const today = decodePrayerTimes([18_000, 21_600, 43_200, 54_000, 64_800, 72_000]);
  const tomorrow = decodePrayerTimes([104_460, 108_000, 129_600, 140_280, 151_200, 158_400]);
  const morning = new Date(28_800_000);
  const asr = prayerOccurrenceFor('asr', today, tomorrow, morning);
  assert.deepEqual(asr, {name: 'asr', time: today[3], tomorrow: false});
  assert.deepEqual(countdownParts(asr!.time, morning), {hours: 7, minutes: 0});
  // Past prayers roll to the matching separately calculated prayer time, not today's clock time.
  assert.deepEqual(prayerOccurrenceFor('fajr', today, tomorrow, morning), {name: 'fajr', time: tomorrow[0], tomorrow: true});
  assert.deepEqual(prayerOccurrenceFor('asr', today, tomorrow, today[3]), {name: 'asr', time: tomorrow[3], tomorrow: true});
  assert.equal(prayerOccurrenceFor('sunrise', today, tomorrow, morning), null);
});

test('after Isha all salah countdowns roll to tomorrow without guessing missing native times', () => {
  const today = decodePrayerTimes([100, 200, 300, 400, 500, 600]);
  const tomorrow = decodePrayerTimes([1001, 1102, 1203, 1304, 1405, 1506]);
  const now = new Date(601_000);
  for (const name of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
    const occurrence = prayerOccurrenceFor(name, today, tomorrow, now);
    const index = { fajr: 0, dhuhr: 2, asr: 3, maghrib: 4, isha: 5 }[name];
    assert.deepEqual(occurrence, { name, time: tomorrow[index], tomorrow: true });
    assert.equal(prayerOccurrenceFor(name, today, null, now), null);
  }
  assert.equal(prayerOccurrenceFor('fajr', today, [], now), null);
  assert.equal(prayerOccurrenceFor('fajr', today, [new Date(NaN)], now), null);
});

test('countdowns round up at minute boundaries and reject due, past, or invalid times', () => {
  const now = new Date(0);
  assert.equal(countdownMinutes(new Date(1), now), 1);
  assert.equal(countdownMinutes(new Date(60_000), now), 1);
  assert.equal(countdownMinutes(new Date(60_001), now), 2);
  assert.deepEqual(countdownParts(new Date(3_660_000), now), {hours: 1, minutes: 1});
  assert.equal(countdownParts(now, now), null);
  assert.equal(countdownMinutes(new Date(-1), now), null);
  assert.equal(countdownMinutes(new Date(NaN), now), null);
  assert.equal(countdownMinutes(new Date(60_000), new Date(NaN)), null);
  assert.equal(nextMinuteDelay(0), 60_000);
  assert.equal(nextMinuteDelay(60_000), 60_000);
  assert.equal(nextMinuteDelay(61_001), 58_999);
  assert.equal(nextMinuteDelay(119_999), 1);
});

test('an individual salah countdown honors real 23/25-hour DST schedules', () => {
  const before = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    for (const [month, day, expectedHours] of [[2, 7, 23], [9, 31, 25]]) {
      const today = [5, 6, 12, 15, 18, 20].map(hour => new Date(2026, month, day, hour));
      const tomorrow = [5, 6, 12, 15, 18, 20].map(hour => new Date(2026, month, day + 1, hour));
      const occurrence = prayerOccurrenceFor('asr', today, tomorrow, today[3]);
      assert.deepEqual(occurrence, {name: 'asr', time: tomorrow[3], tomorrow: true});
      assert.deepEqual(countdownParts(occurrence!.time, today[3]), {hours: expectedHours, minutes: 0});
    }
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
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
