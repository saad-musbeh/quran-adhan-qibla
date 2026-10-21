import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPrayerNotificationSchedule, isPrayerNotificationOwned, isPrayerTestNotification, PRAYER_NOTIFICATION_NAMESPACE } from './prayer-notifications.ts';

function timesForDate([year, month, day]: [number, number, number]): Date[] {
  // Synthetic local-time fixture for testing scheduling, not prayer calculations.
  const base = new Date(year, month - 1, day, 4).getTime();
  return [0, 1, 2, 3, 4, 5].map(hours => new Date(base + hours * 3_600_000));
}

test('schedule excludes sunrise and already-passed prayers, and keeps the seven local dates', () => {
  const now = new Date(2026, 2, 7, 5, 30);
  const schedule = buildPrayerNotificationSchedule(now, timesForDate);
  assert.deepEqual(new Set(schedule.map(item => item.prayer)), new Set(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']));
  assert.equal(schedule.every(item => item.at > now), true);
  assert.equal(new Set(schedule.map(item => item.date.join('-'))).size, 7);
  assert.equal(schedule.find(item => item.date[2] === 7)?.prayer, 'dhuhr');
});

test('local date stepping preserves dates across the spring DST transition', () => {
  const previousTz = process.env.TZ;
  process.env.TZ = 'America/New_York';
  try {
    const now = new Date(2026, 2, 7, 23, 30);
    const dates: string[] = [];
    const schedule = buildPrayerNotificationSchedule(now, date => { dates.push(date.join('-')); return timesForDate(date); }, 3);
    assert.deepEqual(dates, ['2026-3-7', '2026-3-8', '2026-3-9']);
    assert.deepEqual(schedule.filter(item => item.prayer === 'fajr').map(item => item.at.toISOString()),
      ['2026-03-08T08:00:00.000Z', '2026-03-09T08:00:00.000Z']);
  } finally {
    if (previousTz === undefined) delete process.env.TZ; else process.env.TZ = previousTz;
  }
});

test('ownership filtering only matches this prayer namespace', () => {
  assert.equal(isPrayerNotificationOwned({ content: { data: { namespace: PRAYER_NOTIFICATION_NAMESPACE } } }), true);
  assert.equal(isPrayerNotificationOwned({ content: { data: { namespace: 'other.app' } } }), false);
  assert.equal(isPrayerNotificationOwned({ content: { data: null } }), false);
});

test('five-second test alerts are excluded from recurring reconciliation', () => {
  assert.equal(isPrayerTestNotification({ content: { data: { namespace: PRAYER_NOTIFICATION_NAMESPACE, test: true } } }), true);
  assert.equal(isPrayerTestNotification({ content: { data: { namespace: PRAYER_NOTIFICATION_NAMESPACE, test: false } } }), false);
  assert.equal(isPrayerTestNotification({ content: { data: { namespace: PRAYER_NOTIFICATION_NAMESPACE } } }), false);
  assert.equal(isPrayerTestNotification({ content: { data: { namespace: 'someone.else', test: true } } }), false);
  assert.equal(isPrayerTestNotification({ content: { } }), false);
});
