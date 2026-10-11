export const prayerNames = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerName = typeof prayerNames[number];
export type CalculationMethod = 0 | 1 | 2 | 3 | 4 | 5;
export const methods: { id: CalculationMethod; label: 'ummAlQura' | 'muslimWorldLeague' | 'northAmerica' | 'egyptian' | 'karachi' | 'moonsighting' }[] = [
  { id: 0, label: 'ummAlQura' }, { id: 1, label: 'muslimWorldLeague' },
  { id: 2, label: 'northAmerica' }, { id: 3, label: 'egyptian' },
  { id: 4, label: 'karachi' }, { id: 5, label: 'moonsighting' },
];

export type PrayerSettings = { method: CalculationMethod; hanafi: boolean; ramadan: boolean };

export function calculationFlags(settings: PrayerSettings): number {
  return settings.method | (settings.hanafi ? 0x10 : 0) | (settings.method === 0 && settings.ramadan ? 0x20 : 0);
}

/** Local calendar components, never UTC's date when the user's day differs. */
export function localCalendarDate(now: Date): [number, number, number] {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()];
}

export function decodePrayerTimes(seconds: number[]): Date[] {
  if (seconds.length !== 6 || seconds.some((time, index) => !Number.isFinite(time)
    || !Number.isFinite(new Date(time * 1000).getTime()) || (index > 0 && time <= seconds[index - 1]))) {
    throw new RangeError('No complete prayer schedule is available.');
  }
  return seconds.map(time => new Date(time * 1000));
}

/** Sunrise is displayed in the schedule, but never called the next prayer. */
export function nextPrayer(times: Date[], now: Date): PrayerName | null {
  return prayerNames.find((name, index) => name !== 'sunrise' && times[index].getTime() > now.getTime()) ?? null;
}
