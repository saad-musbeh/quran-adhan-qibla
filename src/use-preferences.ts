import { DEFAULT_TEXT_SIZE, MIN_TEXT_SIZE, MAX_TEXT_SIZE } from './text-size';
import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { restoreLanguagePreferences, type Language } from './domain/languages';
import { normalizePrayerSettings, type PrayerSettings } from './domain/prayers';
import { normalizePrayerSounds, type PrayerSoundSettings } from './domain/adhan-voices';
import { normalizeMainMenuOnPhones } from './domain/app-startup';
import { normalizeDevotionalPreferences, type DevotionalPreferences } from './domain/devotional-reminders';

type Preferences = {
  language: Language; prayer: PrayerSettings; compassMode: 'live' | 'north'; prayerNotifications: boolean;
  reader: { fontSize: number; nightMode: boolean };
  mainMenuOnPhones: boolean;
  testingLanguages: boolean;
  prayerSounds: PrayerSoundSettings;
  devotional: DevotionalPreferences;
};
const initial: Preferences = {
  language: 'ar', testingLanguages: false, prayer: normalizePrayerSettings(null),
  compassMode: 'live', prayerNotifications: false, reader: { fontSize: DEFAULT_TEXT_SIZE, nightMode: false },
  mainMenuOnPhones: true,
  prayerSounds: normalizePrayerSounds(undefined),
  devotional: normalizeDevotionalPreferences(undefined),
};
const key = 'app-preferences-v1';

export function usePreferences() {
  const [preferences, updatePreferences] = useState(initial);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const loaded = useRef(false);
  const writes = useRef(Promise.resolve());
  const setPreferences = useCallback((change: SetStateAction<Preferences>) => {
    // The app's loading/retry screen keeps controls hidden until saved values are known.
    if (loaded.current) updatePreferences(change);
  }, []);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    let alive = true;
    setLoadFailed(false);
    void AsyncStorage.getItem(key).then(raw => {
      if (!alive) return;
      let value: Partial<Preferences> = {};
      try { value = JSON.parse(raw ?? '{}') ?? {}; } catch { /* Replace malformed preferences with validated defaults. */ }
      const restored: Preferences = {
        ...restoreLanguagePreferences(value.language, value.testingLanguages),
        compassMode: value.compassMode === 'north' ? 'north' : 'live',
        prayerNotifications: value.prayerNotifications === true,
        mainMenuOnPhones: normalizeMainMenuOnPhones(value.mainMenuOnPhones),
        prayerSounds: normalizePrayerSounds(value.prayerSounds),
        devotional: normalizeDevotionalPreferences(value.devotional),
        prayer: normalizePrayerSettings(value.prayer),
        reader: {
          fontSize: typeof value.reader?.fontSize === 'number' && Number.isFinite(value.reader.fontSize)
            ? Math.min(MAX_TEXT_SIZE, Math.max(MIN_TEXT_SIZE, value.reader.fontSize)) : initial.reader.fontSize,
          nightMode: value.reader?.nightMode === true,
        },
      };
      loaded.current = true;
      updatePreferences(restored);
      setReady(true);
    }).catch(() => { if (alive) setLoadFailed(true); });
    return () => { alive = false; };
  }, [attempt]);
  useEffect(() => {
    if (!ready) return;
    const json = JSON.stringify(preferences);
    writes.current = writes.current.catch(() => undefined).then(() => AsyncStorage.setItem(key, json));
    void writes.current.catch(() => undefined);
  }, [ready, preferences]);
  return { preferences, setPreferences, ready, loadFailed, retry };
}
