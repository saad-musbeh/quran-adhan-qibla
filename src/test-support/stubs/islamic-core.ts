export const isQiblaAvailable = true;
export const isPrayerTimesAvailable = true;
export const isMagneticDeclinationAvailable = true;
export const state = { declinationDegrees: 3 };
export const prayerTimes = (_latitude: number, _longitude: number, date: [number, number, number], _settings?: unknown): Date[] => {
  const base = new Date(date[0], date[1] - 1, date[2], 4).getTime();
  return [0, 1, 2, 3, 4, 5].map(hours => new Date(base + hours * 3_600_000));
};
export const magneticDeclination = (): number => isMagneticDeclinationAvailable ? state.declinationDegrees : null as unknown as number;
export const qiblaBearing = (): number => 58.5;
