import { requireOptionalNativeModule } from 'expo-modules-core';
import * as ExpoLocation from 'expo-location';
import { Platform } from 'react-native';
import { LocationAccessError, nativeLocationFailure, type LocationProvider } from './domain/location.ts';

const native=Platform.OS==='android'?requireOptionalNativeModule<{
  getCurrentPositionAsync(timeoutMs:number):ReturnType<LocationProvider['currentPosition']>;
}>('SystemDeviceLocation'):null;

async function deniedOrBlocked():Promise<LocationAccessError> {
  const code='ERR_LOCATION_DENIED';
  let permission=null;
  try { permission=await ExpoLocation.getForegroundPermissionsAsync(); } catch { /* fall back to plain denial */ }
  return new LocationAccessError(nativeLocationFailure(code, permission));
}

export const hasSystemDeviceLocation=typeof native?.getCurrentPositionAsync==='function';
export async function getSystemDeviceLocation():ReturnType<LocationProvider['currentPosition']> {
  if (!native) throw new LocationAccessError('locationError');
  try { return await native.getCurrentPositionAsync(28_000); }
  catch (cause) {
    const code=(cause as {code?:string})?.code;
    // TODO(native): SystemDeviceLocation cannot report canAskAgain yet, so denial resolution
    // still consults the OS permission state here.
    if (code==='ERR_LOCATION_DENIED') throw await deniedOrBlocked();
    throw new LocationAccessError(nativeLocationFailure(code));
  }
}
