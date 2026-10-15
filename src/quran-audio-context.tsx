import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuranAudio, type QuranAudioController, type QuranAudioTiming } from './use-quran-audio';

const ControllerContext = createContext<QuranAudioController | null>(null);
const TimingContext = createContext<QuranAudioTiming>({ currentTime: 0, duration: 0 });

/** Keep native playback alive across tabs, with clock updates confined to time labels. */
export function QuranAudioProvider({ children }: { children: ReactNode }) {
  const { currentTime, duration, ...controller } = useQuranAudio();
  // The controller has a fixed set/order of fields. Native position ticks must
  // not invalidate its context when no controls or playback state changed.
  const stableController = useMemo(() => controller, Object.values(controller));
  const timing = useMemo(() => ({ currentTime, duration }), [currentTime, duration]);
  return <ControllerContext.Provider value={stableController}>
    <TimingContext.Provider value={timing}>{children}</TimingContext.Provider>
  </ControllerContext.Provider>;
}

export function useQuranAudioController() {
  const controller = useContext(ControllerContext);
  if (!controller) throw new Error('QuranAudioProvider is required');
  return controller;
}

export const useQuranAudioTiming = () => useContext(TimingContext);
