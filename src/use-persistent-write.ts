import { useCallback, useEffect, useRef, useState } from 'react';

/** Keep writes ordered and retain the latest snapshot for a non-destructive retry. */
export function usePersistentWrite<T>(write: (value: T) => Promise<void>) {
  const [saveFailed, setSaveFailed] = useState(false);
  const writer = useRef(write);
  writer.current = write;
  const latest = useRef<{ value: T } | null>(null);
  const queue = useRef(Promise.resolve());
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const enqueue = useCallback((snapshot: { value: T }) => {
    queue.current = queue.current.then(async () => {
      try {
        await writer.current(snapshot.value);
        if (mounted.current && latest.current === snapshot) setSaveFailed(false);
      } catch {
        if (mounted.current && latest.current === snapshot) setSaveFailed(true);
      }
    });
  }, []);
  const save = useCallback((value: T) => {
    const snapshot = { value };
    latest.current = snapshot;
    enqueue(snapshot);
  }, [enqueue]);
  const retrySave = useCallback(() => {
    if (latest.current) enqueue(latest.current);
  }, [enqueue]);
  return { save, saveFailed, retrySave };
}
