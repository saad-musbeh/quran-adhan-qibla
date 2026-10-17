import type { PrayerName } from './prayers';

export const PRAYER_NOTIFICATION_NAMESPACE = 'quran-adhan-qibla.prayer.v1';
/** iOS keeps at most 64 pending notifications; the shared recurring budget leaves room for the
 * test alerts of both reminder families. */
export const IOS_PENDING_NOTIFICATION_LIMIT = 62;
export const NOTIFIABLE_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const satisfies readonly PrayerName[];

export type NotifiablePrayer = typeof NOTIFIABLE_PRAYERS[number];
export type PrayerNotification = {
  key: string;
  prayer: NotifiablePrayer;
  date: [number, number, number];
  at: Date;
};
export type PrayerTimesForDate = (date: [number, number, number]) => Date[];

/** Build seven local Gregorian dates. Date construction and increments use the device timezone,
 * so future entries cross DST boundaries at local midnight. */
export function buildPrayerNotificationSchedule(
  now: Date,
  timesForDate: PrayerTimesForDate,
  days = 7,
): PrayerNotification[] {
  if (!Number.isInteger(days) || days < 1 || days > 31) throw new RangeError('days must be 1..31');
  const first = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const result: PrayerNotification[] = [];
  for (let offset = 0; offset < days; offset++) {
    const localDate = new Date(first.getFullYear(), first.getMonth(), first.getDate() + offset);
    const date: [number, number, number] = [localDate.getFullYear(), localDate.getMonth() + 1, localDate.getDate()];
    const times = timesForDate(date);
    if (times.length !== 6 || times.some(time => !(time instanceof Date) || !Number.isFinite(time.getTime()))) {
      throw new RangeError('A complete prayer schedule is required for every day.');
    }
    for (const prayer of NOTIFIABLE_PRAYERS) {
      const index = prayer === 'fajr' ? 0 : prayer === 'dhuhr' ? 2 : prayer === 'asr' ? 3 : prayer === 'maghrib' ? 4 : 5;
      const at = times[index];
      if (at.getTime() <= now.getTime()) continue;
      const dateKey = `${date[0]}-${String(date[1]).padStart(2, '0')}-${String(date[2]).padStart(2, '0')}`;
      result.push({ key: `${PRAYER_NOTIFICATION_NAMESPACE}:${dateKey}:${prayer}`, prayer, date, at });
    }
  }
  return result.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export type ScheduledNotificationLike = { content: { data?: unknown } };
export function isPrayerNotificationOwned(notification: ScheduledNotificationLike): boolean {
  const data = notification.content.data;
  return !!data && typeof data === 'object'
    && (data as { namespace?: unknown }).namespace === PRAYER_NOTIFICATION_NAMESPACE;
}

/** Five-second user-triggered test alerts live outside every recurring reconcile. */
export function isPrayerTestNotification(notification: ScheduledNotificationLike): boolean {
  if (!isPrayerNotificationOwned(notification)) return false;
  const data = notification.content.data as { test?: unknown } | undefined;
  return data?.test === true;
}
