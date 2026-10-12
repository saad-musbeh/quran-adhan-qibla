import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isLanguage, type Language } from './domain/languages';
import type { PrayerSettings } from './domain/prayers';

type Preferences = {
  language: Language; prayer: PrayerSettings; compassMode: 'live' | 'north'; prayerNotifications: boolean;
  reader: { fontSize: number; nightMode: boolean };
};
const initial: Preferences = {
  language: 'ar', prayer: { method: 0, hanafi: false, ramadan: false },
  compassMode: 'live', prayerNotifications: false, reader: { fontSize: 22, nightMode: false },
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
        language: isLanguage(value.language) ? value.language : 'ar',
        compassMode: value.compassMode === 'north' ? 'north' : 'live',
        prayerNotifications: value.prayerNotifications === true,
        prayer: value.prayer && [0, 1, 2, 3, 4, 5].includes(value.prayer.method) ? {
          method: value.prayer.method, hanafi: value.prayer.hanafi === true, ramadan: value.prayer.ramadan === true,
        } : initial.prayer,
        reader: {
          fontSize: typeof value.reader?.fontSize === 'number' && Number.isFinite(value.reader.fontSize)
            ? Math.min(32, Math.max(16, value.reader.fontSize)) : initial.reader.fontSize,
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
