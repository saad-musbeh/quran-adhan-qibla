import { createContext, useContext, useMemo } from 'react';
import { getQuranTheme, type QuranTheme, type QuranThemeId } from './domain/quran-theme';

export const QuranThemeContext = createContext({
  themeId: 'blue' as QuranThemeId, theme: getQuranTheme('blue'),
  setThemeId: (_id: QuranThemeId) => {},
});
export const useReaderTheme = () => useContext(QuranThemeContext);

/** Maps the shared app palette while leaving geometry and semantic status colors intact. */
export function useReaderStyles<T extends Record<string, object>>(base: T) {
  const { theme: colors } = useReaderTheme();
  const styles = useMemo(() => tintReaderStyles(base, colors), [base, colors]);
  return { colors, styles };
}
function tintReaderStyles<T extends Record<string, object>>(base: T, theme: QuranTheme): T {
  const map: Record<string, string> = {
    '#18334A': theme.background, '#14293C': theme.deep, '#FAF7EF': theme.lightPaper,
    '#DBAB68': theme.accent, '#BD8744': theme.accent, '#25465E': theme.deep,
    '#25465D': theme.deep, '#31516A': theme.background,
    '#516C80': theme.border, '#BCD0DF': theme.lightPaper,
    '#526A7B': theme.muted, '#536D7F': theme.muted,
    '#E5EDF2': theme.pale, '#D4DBE0': theme.pale,
    'rgba(24,51,74,.96)': theme.background,
    // App chrome, cards, and the illustrated Qibla scene share the saved theme.
    '#0B211D': theme.appBackground, '#102A25': theme.appBackground,
    '#15342E': theme.appSurface, '#193A32': theme.appSurface,
    '#193D36': theme.background, '#285146': theme.appRaised,
    '#28483E': theme.appRaised, '#23443B': theme.appSurface,
    '#18382F': theme.appBackground, '#35544B': theme.appBorder,
    '#35564C': theme.appBorder, '#2B4B41': theme.appBorder,
    '#29463E': theme.appBorder, '#284C40': theme.appRaised,
    '#73988D': theme.appMuted, '#A8C1B8': theme.appMuted,
    '#B8CDC4': theme.appMuted, '#BDD4CB': theme.appMuted,
    '#C1D1CA': theme.appMuted, '#4A7267': theme.appBorder,
    '#5E8276': theme.appBorder, '#806E42': theme.appBorder,
    '#0B211DCC': `${theme.appBackground}CC`,
    '#0B211D99': `${theme.appBackground}99`,
    '#0B211DD9': `${theme.appBackground}D9`,
  };
  return Object.fromEntries(Object.entries(base).map(([name, style]) => [name,
      Object.fromEntries(Object.entries(style).map(([key, value]) => [key,
      typeof value === 'string'
        ? key === 'color' && value === '#102A25' ? theme.appAccentInk
          : key === 'color' && value === '#18382F' ? theme.appAccentInk
            : map[value] ?? value
        : value])),
  ])) as T;
}
