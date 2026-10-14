import {useEffect, useState} from 'react';
import {AppState} from 'react-native';
import {startForegroundMinuteClock} from './domain/foreground-minute-clock';

/** Screens remain mounted: keep countdown work limited to the visible foreground screen. */
export function useForegroundMinuteClock(active: boolean, scheduleNow: Date): Date {
  const [now, setNow] = useState(scheduleNow);
  useEffect(() => {
    if (!active) return;
    return startForegroundMinuteClock({
      foreground: AppState.currentState === 'active',
      now: () => new Date(),
      schedule: (callback, delay) => setTimeout(callback, delay),
      cancel: timer => clearTimeout(timer),
      subscribe: onForeground => {
        const subscription = AppState.addEventListener('change', state => onForeground(state === 'active'));
        return () => subscription.remove();
      },
    }, setNow);
  }, [active, scheduleNow]);
  return now;
}
