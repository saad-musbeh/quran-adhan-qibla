import type { QuranTheme } from './quran-theme.ts';

/** The compass uses readable guidance colors against both dial surfaces. */
export function qiblaSceneColors(theme: QuranTheme) {
  const light = theme.mode === 'light';
  return {
    face: theme.appSurface,
    inner: theme.appBackground,
    tick: theme.appMuted,
    direction: light ? '#166C57' : '#F4E1A4',
    marker: light ? '#167F70' : '#49C9C0',
    markerBorder: light ? '#FFFFFF' : '#D8F6EF',
    gold: '#D6BA7A',
  };
}
