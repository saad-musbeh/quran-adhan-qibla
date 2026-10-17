import assert from 'node:assert/strict';
import test from 'node:test';
import { nativeModuleRegistry } from './test-support/stubs/expo.ts';
import * as expoLocation from './test-support/stubs/expo-location.ts';
import { Platform } from './test-support/stubs/react-native.ts';

const position = { coords: { latitude: 24.7136, longitude: 46.6753, accuracy: 100 }, timestamp: 42 };
Platform.OS = 'android';

const nativeModule = {
  getCurrentPositionAsync: async () => position,
};
nativeModuleRegistry.set('SystemDeviceLocation', nativeModule);

function setCurrent(error?: { message: string; code: string }) {
  nativeModule.getCurrentPositionAsync = error
    ? (() => { throw Object.assign(new Error(error.message), { code: error.code }); })
    : (async () => position);
}

const { getSystemDeviceLocation, hasSystemDeviceLocation } = await import('./system-device-location.ts');

test('the native module is detected when it exposes a position method', () => {
  assert.equal(hasSystemDeviceLocation, true);
});

test('a native fix passes through unchanged', async () => {
  assert.deepEqual(await getSystemDeviceLocation(), position);
});

test('a native denial resolves exactly like the expo permission path', async () => {
  const denied = { message: 'denied', code: 'ERR_LOCATION_DENIED' };
  setCurrent(denied);

  expoLocation.state.permissions = { granted: false, canAskAgain: false, status: 'granted', ios: { status: 0, allowsSound: false } };
  await assert.rejects(getSystemDeviceLocation(), (error: { reason: string }) => error.reason === 'blocked');

  expoLocation.state.permissions = { granted: false, canAskAgain: true, status: 'granted', ios: { status: 0, allowsSound: false } };
  await assert.rejects(getSystemDeviceLocation(), (error: { reason: string }) => error.reason === 'denied');

  expoLocation.state.permissions = { granted: true, canAskAgain: false, status: 'granted', ios: { status: 2, allowsSound: true } };
  await assert.rejects(getSystemDeviceLocation(), (error: { reason: string }) => error.reason === 'denied');
});

test('an unreadable permission state falls back to a plain denial', async () => {
  setCurrent({ message: 'denied', code: 'ERR_LOCATION_DENIED' });
  expoLocation.state.permissionsFailure = 'module unavailable';
  await assert.rejects(getSystemDeviceLocation(), (error: { reason: string }) => error.reason === 'denied');
  expoLocation.state.permissionsFailure = null;
});

test('services-disabled and timeout errors keep one consistent reason each', async () => {
  for (const [code, reason] of [
    ['ERR_LOCATION_SERVICES_DISABLED', 'servicesDisabled'],
    ['ERR_LOCATION_TIMEOUT', 'timeout'],
    ['ERR_LOCATION_PROVIDER', 'locationError'],
  ] as const) {
    setCurrent({ message: code, code });
    await assert.rejects(getSystemDeviceLocation(), (error: { reason: string }) => error.reason === reason, code);
  }
});
