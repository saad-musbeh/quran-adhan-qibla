import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createQuranBooks, readQuranBooks, readLegacyQuranBooks, LEGACY_QURAN_KEYS, QURAN_BOOKS_KEY } from './domain/quran-books';

/** A failed read must never turn the initial empty shelf into a storage write. */
export function useQuranBooks() {
  const [books, setBooks] = useState(createQuranBooks);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const writes = useRef(Promise.resolve());
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    let alive = true;
    setLoadFailed(false);
    void (async () => {
      const json = await AsyncStorage.getItem(QURAN_BOOKS_KEY);
      // A stored library takes precedence over pre-library reading data.
      let restored;
      if (json !== null) restored = readQuranBooks(json);
      else {
        const legacy = await AsyncStorage.multiGet([...LEGACY_QURAN_KEYS]);
        restored = readLegacyQuranBooks(legacy[0][1], legacy[1][1], legacy[2][1]);
      }
      if (!alive) return;
      setBooks(restored);
      setReady(true);
    })().catch(() => { if (alive) setLoadFailed(true); });
    return () => { alive = false; };
  }, [attempt]);
  useEffect(() => {
    if (!ready) return;
    const json = JSON.stringify(books);
    writes.current = writes.current.catch(() => undefined).then(() => AsyncStorage.setItem(QURAN_BOOKS_KEY, json));
    void writes.current.catch(() => undefined);
  }, [books, ready]);
  return { books, setBooks, ready, loadFailed, retry };
}
