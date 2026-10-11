import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import type { LocationSubscription, LocationHeadingObject } from 'expo-location';
import { magneticToTrueHeading, smoothHeading, usableTrueHeading } from './domain/heading';
import { magneticDeclination } from '../modules/islamic-core';

export type HeadingStatus = 'idle' | 'loading' | 'ready' | 'calibrating' | 'unavailable';
export type HeadingUnavailableReason = 'permission' | 'calibration' | 'sensor' | 'timeout' | 'error' | null;
type HeadingState = { heading: number | null; status: HeadingStatus; reason: HeadingUnavailableReason };

const initial: HeadingState = { heading: null, status: 'idle', reason: null };
const FIRST_SAMPLE_TIMEOUT_MS = 8_000;

/**
 * Watches a calibrated heading only while enabled and foregrounded. If the
 * platform has no valid true heading, it corrects calibrated magnetic heading
 * with offline WMM2025 at the selected device coordinates. It never requests
 * or watches a position itself.
 */
export function useHeading(enabled: boolean, coordinates?: { latitude: number; longitude: number }) {
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [state, setState] = useState<HeadingState>(initial);
  const previousHeading = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => setForeground(next === 'active'));
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!enabled || !foreground) {
      previousHeading.current = null;
      setState(initial);
      return;
    }

    let cancelled = false;
    let failed = false;
    let nativeSubscription: LocationSubscription | null = null;
    setState({ heading: null, status: 'loading', reason: null });

    const timer = setTimeout(() => {
      if (!cancelled) setState({ heading: null, status: 'unavailable', reason: 'timeout' });
    }, FIRST_SAMPLE_TIMEOUT_MS);

    const onHeading = (sample: LocationHeadingObject) => {
      if (cancelled || failed) return;
      clearTimeout(timer);
      let heading = usableTrueHeading(sample);
      if (heading === null && coordinates) {
        const now = new Date();
        const declination = magneticDeclination(coordinates.latitude, coordinates.longitude, [
          now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(),
        ]);
        heading = magneticToTrueHeading(sample, declination);
      }
      if (heading === null) {
        previousHeading.current = null;
        setState({ heading: null, status: 'calibrating', reason: 'calibration' });
        return;
      }
      const smooth = previousHeading.current === null ? heading : smoothHeading(previousHeading.current, heading);
      previousHeading.current = smooth;
      setState({ heading: smooth, status: 'ready', reason: null });
    };

    const start = async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        if (!permission.granted) {
          clearTimeout(timer);
          setState({ heading: null, status: 'unavailable', reason: 'permission' });
          return;
        }
        const next = await Location.watchHeadingAsync(onHeading, () => {
          failed = true;
          previousHeading.current = null;
          if (!cancelled) {
            clearTimeout(timer);
            setState({ heading: null, status: 'unavailable', reason: 'sensor' });
          }
          void nativeSubscription?.remove();
        });
        if (cancelled || failed) {
          void next.remove();
        } else {
          nativeSubscription = next;
        }
      } catch {
        clearTimeout(timer);
        if (!cancelled) setState({ heading: null, status: 'unavailable', reason: 'error' });
      }
    };

    void start();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      void nativeSubscription?.remove();
    };
  }, [enabled, foreground, coordinates?.latitude, coordinates?.longitude]);

  return state;
}
