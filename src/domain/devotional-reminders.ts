import type { NotifiablePrayer } from './prayer-notifications.ts';

export const DEVOTIONAL_NAMESPACE = 'quran-adhan-qibla.devotional.v1';
export const DEVOTIONAL_SOUNDS = { spoken: { android: 'reminder_salawat.ogg', ios: 'reminder_salawat.wav' }, tone: { android: 'reminder_chime.ogg', ios: 'reminder_chime.wav' } } as const;
export type ReminderKind = 'salawat' | 'morning' | 'evening';
export type ReminderStyle = 'spoken' | 'silent' | 'tone';
export type ReminderMode = 'times' | 'interval' | 'prayers';
export type DevotionalPreferences = {
  salawat: { enabled: boolean; times: string[]; style: ReminderStyle; mode: ReminderMode; intervalMinutes: number; start: string; end: string };
  morning: { enabled: boolean; time: string };
  evening: { enabled: boolean; time: string };
  testing: { counters: boolean; single: boolean; styles: boolean; schedules: boolean };
};

export function parseClock(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const ascii = value.trim().replace(/[٠-٩۰-۹]/g, char => String(char.charCodeAt(0) - (char <= '٩' ? 0x660 : 0x6f0)));
  const match = /^(\d{1,2}):(\d{2})$/.exec(ascii);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const clock = (value: unknown, fallback: string) => { const minute = parseClock(value); return minute === null ? fallback : formatClock(minute); };

export function normalizeDevotionalPreferences(value: unknown): DevotionalPreferences {
  const saved = record(value), salawat = record(saved.salawat), morning = record(saved.morning), evening = record(saved.evening), testing = record(saved.testing);
  const times = Array.isArray(salawat.times) ? [...new Set(salawat.times.map(parseClock).filter((time): time is number => time !== null))].sort((a,b)=>a-b).slice(0,6).map(formatClock) : [];
  const styles = testing.styles === true, schedules = testing.schedules === true;
  return {
    salawat: { enabled: salawat.enabled === true, times: times.length ? times : ['09:00'],
      style: styles && (salawat.style === 'silent' || salawat.style === 'tone') ? salawat.style : 'spoken',
      mode: schedules && (salawat.mode === 'interval' || salawat.mode === 'prayers') ? salawat.mode : 'times',
      intervalMinutes: [60,120,180].includes(Number(salawat.intervalMinutes)) ? Number(salawat.intervalMinutes) : 120,
      start: clock(salawat.start, '09:00'), end: clock(salawat.end, '21:00') },
    morning: { enabled: morning.enabled === true, time: clock(morning.time, '07:00') },
    evening: { enabled: evening.enabled === true, time: clock(evening.time, '18:00') },
    testing: { counters: testing.counters === true, single: testing.single === true, styles, schedules },
  };
}

/** At most sixteen daily slots leaves room for prayer alerts and test notifications on iOS. */
export function salawatMinutes(value: DevotionalPreferences['salawat']): number[] {
  if (value.mode === 'prayers') return [];
  if (value.mode === 'times') return [...new Set(value.times.map(parseClock).filter((time): time is number => time !== null))].sort((a,b)=>a-b).slice(0,6);
  const start = parseClock(value.start), end = parseClock(value.end);
  if (start === null || end === null || start > end || ![60,120,180].includes(value.intervalMinutes)) return [];
  const minutes: number[] = [];
  for (let time = start; time <= end; time += value.intervalMinutes) minutes.push(time);
  return minutes.length <= 16 ? minutes : [];
}

export type DevotionalAlert = { kind: ReminderKind; minute: number } | { kind: 'salawat'; at: Date; prayer: NotifiablePrayer };

export function devotionalSchedule(settings: DevotionalPreferences, prayers: readonly { at: Date; prayer: NotifiablePrayer }[] = []): DevotionalAlert[] {
  const daily: DevotionalAlert[] = [];
  if (settings.morning.enabled) daily.push({ kind: 'morning', minute: parseClock(settings.morning.time)! });
  if (settings.evening.enabled) daily.push({ kind: 'evening', minute: parseClock(settings.evening.time)! });
  if (!settings.salawat.enabled) return daily;
  if (settings.salawat.mode === 'prayers') return [...daily, ...prayers.slice().sort((a,b)=>a.at.getTime()-b.at.getTime()).slice(0,18-daily.length).map(prayer => ({ ...prayer, kind: 'salawat' as const }))];
  return [...daily, ...salawatMinutes(settings.salawat).map(minute => ({ kind: 'salawat' as const, minute }))];
}

export function isDevotionalNotification(value: { content?: { data?: Record<string, unknown> } }): boolean {
  return value.content?.data?.namespace === DEVOTIONAL_NAMESPACE || value.content?.data?.namespace === `${DEVOTIONAL_NAMESPACE}.test`;
}
