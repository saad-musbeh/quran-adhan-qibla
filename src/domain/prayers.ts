export const prayerNames = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerName = typeof prayerNames[number];
export type CalculationMethod = 0 | 1 | 2 | 3 | 4 | 5;
export const methods: { id: CalculationMethod; label: 'ummAlQura' | 'muslimWorldLeague' | 'northAmerica' | 'egyptian' | 'karachi' | 'moonsighting' }[] = [
  { id: 0, label: 'ummAlQura' }, { id: 1, label: 'muslimWorldLeague' },
  { id: 2, label: 'northAmerica' }, { id: 3, label: 'egyptian' },
  { id: 4, label: 'karachi' }, { id: 5, label: 'moonsighting' },
];

export type HighLatitudeSetting = 'middle' | 'seventh' | 'angle';
export type PolarSetting = 'none' | 'nearest-latitude';
export type PrayerSettings = {
  method: CalculationMethod; hanafi: boolean; ramadan: boolean;
  highLatitudeRule?: HighLatitudeSetting; polarRule?: PolarSetting;
};

/** Old saved preferences retain the previous middle-of-night / no-polar behavior. */
export function normalizePrayerSettings(value: Partial<PrayerSettings> | null | undefined): PrayerSettings {
  return {
    method: value && methods.some(method => method.id === value.method) ? value.method! : 0,
    hanafi: value?.hanafi === true, ramadan: value?.ramadan === true,
    highLatitudeRule: value?.highLatitudeRule === 'seventh' || value?.highLatitudeRule === 'angle' ? value.highLatitudeRule : 'middle',
    polarRule: value?.polarRule === 'nearest-latitude' ? value.polarRule : 'none',
  };
}

export function calculationFlags(settings: PrayerSettings): number {
  const highLatitude = settings.highLatitudeRule === 'seventh' ? 0x40 : settings.highLatitudeRule === 'angle' ? 0x80 : 0;
  return settings.method | (settings.hanafi ? 0x10 : 0) | (settings.method === 0 && settings.ramadan ? 0x20 : 0)
    | highLatitude | (settings.polarRule === 'nearest-latitude' ? 0x100 : 0);
}

export function polarCalculationDisabled(latitude: number, settings: PrayerSettings): boolean {
  return Math.abs(latitude) >= 65 && settings.polarRule !== 'nearest-latitude';
}

/** Local calendar components, never UTC's date when the user's day differs. */
export function localCalendarDate(now: Date): [number, number, number] {
  return [now.getFullYear(), now.getMonth() + 1, now.getDate()];
}

/** Advance the calendar date rather than adding 24 hours across DST changes. */
export function nextLocalCalendarDate(now: Date): [number, number, number] {
  return localCalendarDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
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

export type PrayerOccurrence = { name: Exclude<PrayerName, 'sunrise'>; time: Date; tomorrow: boolean };

/** The next occurrence of an individual salah; sunrise has no Adhan countdown. */
export function prayerOccurrenceFor(name: PrayerName, today: Date[], tomorrow: Date[] | null, now: Date): PrayerOccurrence | null {
  if (name === 'sunrise') return null;
  const index = prayerNames.indexOf(name);
  const todayTime = today[index];
  if (todayTime && todayTime.getTime() > now.getTime()) return {name, time: todayTime, tomorrow: false};
  const tomorrowTime = tomorrow?.[index];
  return tomorrowTime && tomorrowTime.getTime() > now.getTime() ? {name, time: tomorrowTime, tomorrow: true} : null;
}

/** Round up so a future prayer less than a minute away never appears overdue. */
export function countdownMinutes(time: Date, now: Date): number | null {
  const difference = time.getTime() - now.getTime();
  return Number.isFinite(difference) && difference > 0 ? Math.ceil(difference / 60_000) : null;
}

export function countdownParts(time: Date, now: Date): {hours: number; minutes: number} | null {
  const minutes = countdownMinutes(time, now);
  return minutes === null ? null : {hours: Math.floor(minutes / 60), minutes: minutes % 60};
}

/** Re-evaluate on wall-clock minute boundaries, including after resume or clock changes. */
export function nextMinuteDelay(nowMilliseconds: number): number {
  return 60_000 - ((nowMilliseconds % 60_000 + 60_000) % 60_000);
}

/** Tomorrow's Fajr comes from a separately calculated schedule, never today's time + 24h. */
export function nextPrayerOccurrence(today: Date[], tomorrow: Date[] | null, now: Date): PrayerOccurrence | null {
  const name = nextPrayer(today, now);
  if (name && name !== 'sunrise') return { name, time: today[prayerNames.indexOf(name)], tomorrow: false };
  return prayerOccurrenceFor('fajr', today, tomorrow, now);
}
