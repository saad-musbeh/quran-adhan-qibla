import { isRTL, type Language } from './languages.ts';
export type { Language } from './languages.ts';

export type Tab = 'quran' | 'adhan' | 'qibla';

export const TABS: readonly Tab[] = ['quran', 'adhan', 'qibla'];

/** Deliberate horizontal drags only; short, vertical, diagonal, or multi-touch gestures stay with children. */
export function isDeliberateTabSwipe(dx: number, dy: number, activeTouches: number): boolean {
  return Number.isFinite(dx) && Number.isFinite(dy) && activeTouches === 1 &&
    Math.abs(dx) >= 48 && Math.abs(dy) <= 70 && Math.abs(dx) >= Math.abs(dy) * 1.5;
}

/** Return the adjacent tab reached by this physical swipe, or null when the gesture is invalid or at an edge. */
export function neighborForSwipe(tab: Tab, dx: number, dy: number, language: Language): Tab | null {
  if (!isDeliberateTabSwipe(dx, dy, 1) || dx === 0) return null;
  const index = TABS.indexOf(tab);
  const logicalStep = isRTL(language) ? Math.sign(dx) : -Math.sign(dx);
  return TABS[index + logicalStep] ?? null;
}
