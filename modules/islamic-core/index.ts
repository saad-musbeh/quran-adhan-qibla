import { requireOptionalNativeModule } from 'expo';
import { calculationFlags, decodePrayerTimes, type PrayerSettings } from '../../src/domain/prayers';

type IslamicCoreModule = {
  qiblaBearing(latitude: number, longitude: number): number;
  prayerTimes(latitude: number, longitude: number, year: number, month: number, day: number, flags: number): number[];
};

const core = requireOptionalNativeModule<IslamicCoreModule>('IslamicCore');

export const isQiblaAvailable = core !== null;
export const isPrayerTimesAvailable = typeof core?.prayerTimes === 'function';

export function qiblaBearing(latitude: number, longitude: number): number {
  if (!core) throw new Error('The native calculation module requires a development build.');
  const bearing = core.qiblaBearing(latitude, longitude);
  if (!Number.isFinite(bearing)) throw new RangeError('No valid Qibla bearing at these coordinates.');
  return bearing;
}

export function prayerTimes(latitude: number, longitude: number, date: [number, number, number], settings: PrayerSettings): Date[] {
  if (!isPrayerTimesAvailable || !core) throw new Error('Prayer times require the updated native build.');
  return decodePrayerTimes(core.prayerTimes(latitude, longitude, ...date, calculationFlags(settings)));
}
