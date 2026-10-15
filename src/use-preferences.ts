import { DEFAULT_TEXT_SIZE, MIN_TEXT_SIZE, MAX_TEXT_SIZE } from './text-size';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { restoreLanguagePreferences, type Language } from './domain/languages';
import { normalizePrayerSettings, type PrayerSettings } from './domain/prayers';
import { normalizePrayerSounds, type PrayerSoundSettings } from './domain/adhan-voices';
import { normalizeMainMenuOnPhones } from './domain/app-startup';

type Preferences = {
  language: Language; prayer: PrayerSettings; compassMode: 'live' | 'north'; prayerNotifications: boolean;
  reader: { fontSize: number; nightMode: boolean };
  mainMenuOnPhones: boolean;
  testingLanguages: boolean;
  prayerSounds: PrayerSoundSettings;
};
const initial: Preferences = {
  language: 'ar', testingLanguages: false, prayer: normalizePrayerSettings(null),
  compassMode: 'live', prayerNotifications: false, reader: { fontSize: DEFAULT_TEXT_SIZE, nightMode: false },
  mainMenuOnPhones: true,
  prayerSounds: normalizePrayerSounds(undefined),
};
const key = 'app-preferences-v1';

export function usePreferences() {
  const [preferences, setPreferences] = useState(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(key).then(raw => {
      if (!raw || !alive) return;
      const value = JSON.parse(raw) as Partial<Preferences>;
      setPreferences({
        ...restoreLanguagePreferences(value.language, value.testingLanguages),
        compassMode: value.compassMode === 'north' ? 'north' : 'live',
        prayerNotifications: value.prayerNotifications === true,
        mainMenuOnPhones: normalizeMainMenuOnPhones(value.mainMenuOnPhones),
        prayerSounds: normalizePrayerSounds(value.prayerSounds),
        prayer: normalizePrayerSettings(value.prayer),
        reader: {
          fontSize: typeof value.reader?.fontSize === 'number' && Number.isFinite(value.reader.fontSize)
            ? Math.min(MAX_TEXT_SIZE, Math.max(MIN_TEXT_SIZE, value.reader.fontSize)) : initial.reader.fontSize,
          nightMode: value.reader?.nightMode === true,
        },
      });
    }).catch(() => {}).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (ready) void AsyncStorage.setItem(key, JSON.stringify(preferences)).catch(() => {});
  }, [ready, preferences]);
  return { preferences, setPreferences, ready };
}
