import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { LocationAccessError, requestDeviceLocation, shouldRefreshLocation, type Coordinates, type DeviceLocation, type LocationFailure, type LocationProvider, type LocationSource } from './domain/location';
import { SAVED_LOCATION_KEY, validateSavedLocation } from './domain/saved-location';

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
  const [ready, setReady] = useState(false);
  const locationRef = useRef<SelectedLocation | null>(null);
  const pending = useRef(false);
  const mounted = useRef(true);
  const lastAttempt = useRef(0);
  const userSelected = useRef(false);
  const permissionCheck = useRef(false);
  const writes = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const save = useCallback((value: SelectedLocation | null) => {
    writes.current = writes.current.catch(() => undefined).then(() => value
      ? AsyncStorage.setItem(SAVED_LOCATION_KEY, JSON.stringify(value))
      : AsyncStorage.removeItem(SAVED_LOCATION_KEY)).catch(() => undefined);
  }, []);

  const selectLocation = useCallback((value: SelectedLocation | null) => {
    locationRef.current = value;
    setLocation(value);
  }, []);

  useEffect(() => {
    let live = true;
    void (async () => {
      let raw: string | null = null;
      let readSucceeded = false;
      try {
        raw = await AsyncStorage.getItem(SAVED_LOCATION_KEY);
        readSucceeded = true;
      } catch { /* Keep the in-memory default if storage is temporarily unavailable. */ }

      let restored: SelectedLocation | null = null;
      let storedWasValid = false;
      if (raw !== null) {
        try {
          const parsed: unknown = JSON.parse(raw);
          restored = validateSavedLocation(parsed) as SelectedLocation | null;
          storedWasValid = restored !== null;
        } catch { /* Malformed storage is cleared below. */ }
      }

      // A saved device fix is useful only while foreground location access remains granted.
      if (restored?.source === 'device') {
        try {
          const permission = await Location.getForegroundPermissionsAsync();
          if (!permission.granted) restored = null;
        } catch { /* Keep the cached fix if permission state cannot be read right now. */ }
      }
      if (!live || !mounted.current) return;
      if (!userSelected.current) {
        selectLocation(restored);
        lastAttempt.current = restored?.source === 'device' ? restored.timestamp : 0;
        if (readSucceeded && (raw !== null && (!storedWasValid || restored === null))) save(null);
      }
      setReady(true);
    })();
    return () => { live = false; };
  }, [save, selectLocation]);

  const locate = useCallback(async (allowPrompt = true) => {
    if (allowPrompt) userSelected.current = true;
    if (pending.current) return;
    pending.current = true;
    lastAttempt.current = Date.now();
    setLoading(true);
    setError(null);
    try {
      const fix: DeviceLocation = await requestDeviceLocation(provider(allowPrompt), 30_000, allowPrompt);
      const saved = validateSavedLocation({ ...fix, source: 'device' }) as SelectedLocation | null;
      if (!saved) throw new LocationAccessError('locationError');
      if (mounted.current) {
        selectLocation(saved);
        save(saved);
      }
    } catch (failure) {
      if (mounted.current) {
        const reason = failure instanceof LocationAccessError ? failure.reason : 'locationError';
        setError(reason);
        // Do not keep or persist a device location after its permission is revoked.
        if (reason === 'denied' || reason === 'blocked') {
          if (locationRef.current?.source === 'device') {
            selectLocation(null);
            save(null);
          }
        }
      }
    } finally {
      pending.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [save, selectLocation]);

  useEffect(() => {
    if (!ready) return;
    let active = true;
    async function refreshIfDue() {
      if (!active || !enabled || AppState.currentState !== 'active') return;
      const selected = locationRef.current;
      if (selected?.source !== 'device') return;
      if (permissionCheck.current) return;
      permissionCheck.current = true;
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!active || !enabled) return;
        if (!permission.granted) {
          if (locationRef.current === selected) {
            selectLocation(null);
            setError(permission.canAskAgain ? 'denied' : 'blocked');
            save(null);
          }
          return;
        }
      } catch { /* The regular location refresh can report provider failures. */ }
      finally { permissionCheck.current = false; }
      if (shouldRefreshLocation(selected.source, lastAttempt.current, Date.now())) void locate(false);
    }
    void refreshIfDue();
    const interval = setInterval(() => { void refreshIfDue(); }, 60 * 60 * 1000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refreshIfDue();
    });
    return () => { active = false; clearInterval(interval); subscription.remove(); };
  }, [enabled, location, ready, locate, save, selectLocation]);

  function useAlternative(coordinates: Coordinates & { source: Exclude<LocationSource, 'device'>; label?: string }) {
    if (pending.current) return;
    userSelected.current = true;
    const saved = validateSavedLocation({ ...coordinates, timestamp: Date.now() }) as SelectedLocation | null;
    if (!saved) return;
    selectLocation(saved);
    save(saved);
    setError(null);
  }

  return { location, loading, error, locate, useAlternative, ready };
}
