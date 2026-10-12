import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_QURAN_THEME_ID,
  getQuranTheme,
  isQuranThemeId,
  type QuranThemeId,
} from './domain/quran-theme';

const STORAGE_KEY = 'quran-reader-theme-v1';

export function useQuranTheme() {
  const [themeId, setThemeIdState] = useState<QuranThemeId>(DEFAULT_QURAN_THEME_ID);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const pendingChoice = useRef<QuranThemeId | null>(null);
  const writes = useRef<Promise<void>>(Promise.resolve());

  const persist = useCallback((id: QuranThemeId) => {
    writes.current = writes.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(STORAGE_KEY, id));
    void writes.current.catch(() => undefined);
  }, []);

  useEffect(() => {
    let live = true;
    const applyStored = (stored: string | null) => {
      if (!live) return;
      const pending = pendingChoice.current;
      const chosen = pending ?? (isQuranThemeId(stored) ? stored : DEFAULT_QURAN_THEME_ID);
      pendingChoice.current = null;
      readyRef.current = true;
      setThemeIdState(chosen);
      setReady(true);
      if (pending) persist(pending);
    };

    void AsyncStorage.getItem(STORAGE_KEY).then(applyStored).catch(() => applyStored(null));
    return () => { live = false; };
  }, [persist]);

  const setThemeId = useCallback((id: QuranThemeId) => {
    setThemeIdState(id);
    if (!readyRef.current) {
      pendingChoice.current = id;
      return;
    }
    persist(id);
  }, [persist]);

  return { themeId, theme: getQuranTheme(themeId), setThemeId, ready };
}
