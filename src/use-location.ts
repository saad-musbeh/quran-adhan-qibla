import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { LocationAccessError, requestDeviceLocation, shouldRefreshLocation, type Coordinates, type DeviceLocation, type LocationFailure, type LocationProvider, type LocationSource } from './domain/location';

export type SelectedLocation = Coordinates & { source: LocationSource; label?: string; accuracy?: number | null; timestamp: number };
function provider(allowPrompt: boolean): LocationProvider {
  return {
    getPermission: () => Location.getForegroundPermissionsAsync(),
    requestPermission: () => Location.requestForegroundPermissionsAsync(),
    servicesEnabled: () => Location.hasServicesEnabledAsync(),
    currentPosition: () => Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      mayShowUserSettingsDialog: allowPrompt,
    }),
  };
}

export function useLocation(enabled: boolean) {
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LocationFailure | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const lastAttempt = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const locate = useCallback(async (allowPrompt = true) => {
    if (pending.current) return;
    pending.current = true;
    lastAttempt.current = Date.now();
    setLoading(true);
    setError(null);
    try {
      const fix: DeviceLocation = await requestDeviceLocation(provider(allowPrompt), 30_000, allowPrompt);
      if (mounted.current) setLocation({ ...fix, source: 'device' });
    } catch (failure) {
      if (mounted.current) {
        const reason = failure instanceof LocationAccessError ? failure.reason : 'locationError';
        setError(reason);
        // Do not keep showing a device location after permission is revoked.
        if (reason === 'denied' || reason === 'blocked') {
          setLocation(previous => previous?.source === 'device' ? null : previous);
        }
      }
    } finally {
      pending.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    function refreshIfDue() {
      if (enabled && AppState.currentState === 'active' &&
          shouldRefreshLocation(location?.source, lastAttempt.current, Date.now())) {
        void locate(false);
      }
    }
    refreshIfDue();
    const interval = setInterval(refreshIfDue, 60 * 60 * 1000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshIfDue();
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [enabled, location, locate]);

  function useAlternative(coordinates: Coordinates & { source: Exclude<LocationSource, 'device'>; label?: string }) {
    if (pending.current) return;
    setLocation({ ...coordinates, timestamp: Date.now() });
    setError(null);
  }

  return { location, loading, error, locate, useAlternative };
}
