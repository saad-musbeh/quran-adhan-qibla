import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { LocationAccessError, type LocationProvider } from './domain/location';

const native=Platform.OS==='android'?requireOptionalNativeModule<{
  getCurrentPositionAsync(timeoutMs:number):ReturnType<LocationProvider['currentPosition']>;
}>('SystemDeviceLocation'):null;

export const hasSystemDeviceLocation=typeof native?.getCurrentPositionAsync==='function';
export async function getSystemDeviceLocation():ReturnType<LocationProvider['currentPosition']> {
  if (!native) throw new LocationAccessError('locationError');
  try { return await native.getCurrentPositionAsync(28_000); }
  catch (cause) {
    const code=(cause as {code?:string})?.code;
    throw new LocationAccessError(code==='ERR_LOCATION_DENIED'?'denied':code==='ERR_LOCATION_SERVICES_DISABLED'?'servicesDisabled':code==='ERR_LOCATION_TIMEOUT'?'timeout':'locationError');
  }
}
