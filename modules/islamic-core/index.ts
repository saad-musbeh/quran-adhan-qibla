import { requireOptionalNativeModule } from 'expo';

type IslamicCoreModule = {
  qiblaBearing(latitude: number, longitude: number): number;
};

const core = requireOptionalNativeModule<IslamicCoreModule>('IslamicCore');

export const isQiblaAvailable = core !== null;

export function qiblaBearing(latitude: number, longitude: number): number {
  if (!core) throw new Error('The native calculation module requires a development build.');
  const bearing = core.qiblaBearing(latitude, longitude);
  if (!Number.isFinite(bearing)) throw new RangeError('No valid Qibla bearing at these coordinates.');
  return bearing;
}
