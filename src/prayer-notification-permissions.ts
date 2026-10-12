import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
type NativePermissions = { canScheduleExactAlarms(): boolean };
const native = Platform.OS === 'android' ? requireOptionalNativeModule<NativePermissions>('PrayerNotificationPermissions') : null;
export function canScheduleExactAlarms(): boolean {
  return Platform.OS === 'android' && (native?.canScheduleExactAlarms() ?? false);
}
