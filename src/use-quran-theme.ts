import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getQuranTheme,
  readQuranThemePreference,
  type QuranThemeId,
  type QuranThemeMode,
  type QuranThemePreference,
} from './domain/quran-theme';

const STORAGE_KEY = 'quran-reader-theme-v2';
const LEGACY_STORAGE_KEY = 'quran-reader-theme-v1';

export function useQuranTheme() {
  const [preference, setPreference] = useState<QuranThemePreference>(() => readQuranThemePreference(null));
  const current = useRef(preference);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const pendingChoice = useRef<Partial<QuranThemePreference>>({});
  const writes = useRef<Promise<void>>(Promise.resolve());

  const persist = useCallback((value: QuranThemePreference) => {
    writes.current = writes.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value)));
    void writes.current.catch(() => undefined);
  }, []);

  useEffect(() => {
    let live = true;
    const applyStored = (stored: string | null, legacy: string | null) => {
      if (!live) return;
      const pending = pendingChoice.current;
      const chosen = { ...readQuranThemePreference(stored, legacy), ...pending };
      const changedBeforeLoad = Object.keys(pending).length > 0;
      pendingChoice.current = {};
      current.current = chosen;
      readyRef.current = true;
      setPreference(chosen);
      setReady(true);
      if (changedBeforeLoad || (stored === null && legacy !== null)) persist(chosen);
    };

    void AsyncStorage.multiGet([STORAGE_KEY, LEGACY_STORAGE_KEY])
      .then(values => applyStored(values[0][1], values[1][1])).catch(() => applyStored(null, null));
    return () => { live = false; };
  }, [persist]);

  const update = useCallback((change: Partial<QuranThemePreference>) => {
    const chosen = { ...current.current, ...change };
    current.current = chosen;
    setPreference(chosen);
    if (!readyRef.current) {
      pendingChoice.current = { ...pendingChoice.current, ...change };
      return;
    }
    persist(chosen);
  }, [persist]);
  const setThemeId = useCallback((themeId: QuranThemeId) => update({ themeId }), [update]);
  const setMode = useCallback((mode: QuranThemeMode) => update({ mode }), [update]);

  const theme = useMemo(() => getQuranTheme(preference.themeId, preference.mode), [preference.themeId, preference.mode]);
  return { ...preference, theme, setThemeId, setMode, ready };
}
