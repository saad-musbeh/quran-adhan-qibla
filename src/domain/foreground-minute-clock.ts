import {nextMinuteDelay} from './prayers.ts';

type ClockRuntime<Timer> = {
  foreground: boolean;
  now: () => Date;
  schedule: (callback: () => void, delay: number) => Timer;
  cancel: (timer: Timer) => void;
  subscribe: (onForeground: (foreground: boolean) => void) => () => void;
};

/** Start only for a visible screen; dispose when hidden even though it stays mounted. */
export function startForegroundMinuteClock<Timer>(runtime: ClockRuntime<Timer>, onTick: (now: Date) => void): () => void {
  let live = true;
  let foreground = runtime.foreground;
  let timer: Timer | undefined;
  const cancel = () => {
    if (timer !== undefined) runtime.cancel(timer);
    timer = undefined;
  };
  const tick = () => {
    cancel();
    if (!live || !foreground) return;
    const now = runtime.now();
    onTick(now);
    timer = runtime.schedule(tick, nextMinuteDelay(now.getTime()));
  };
  const unsubscribe = runtime.subscribe(next => {
    if (!live) return;
    foreground = next;
    if (foreground) tick();
    else cancel();
  });
  tick();
  return () => {live = false; cancel(); unsubscribe();};
}
