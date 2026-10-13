export type QuranThemeId = 'green' | 'maroon' | 'blue' | 'black' | 'brown';
export type QuranThemeMode = 'light' | 'dark';

export type QuranTheme = {
  id: QuranThemeId;
  mode: QuranThemeMode;
  arabicName: string;
  name: string;
  background: string;
  deep: string;
  surface: string;
  border: string;
  muted: string;
  accent: string;
  ink: string;
  lightPaper: string;
  pale: string;
  /** App chrome is independent from Quran paper and night-reading colors. */
  appText: string;
  appBackground: string;
  appSurface: string;
  appRaised: string;
  appBorder: string;
  appMuted: string;
  appAccentInk: string;
};

export const QURAN_THEMES: readonly QuranTheme[] = [
  {
    id: 'green', mode: 'dark', appText: '#FAF7EF', arabicName: 'أخضر', name: 'Green',
    background: '#214D3B', deep: '#17382B', surface: '#FAF7EF', border: '#DBAB68',
    muted: '#526F60', accent: '#DBAB68', ink: '#17382B', lightPaper: '#FAF7EF', pale: '#E5EEE8',
    appBackground: '#17382B', appSurface: '#214638', appRaised: '#284C40', appBorder: '#35544B', appMuted: '#A8C1B8', appAccentInk: '#17382B',
  },
  {
    id: 'maroon', mode: 'dark', appText: '#FAF7EF', arabicName: 'عنابي', name: 'Maroon',
    background: '#5B2938', deep: '#401C28', surface: '#FAF7EF', border: '#DBAB68',
    muted: '#73515B', accent: '#DBAB68', ink: '#4A2330', lightPaper: '#FAF7EF', pale: '#F1E6E9',
    appBackground: '#401C28', appSurface: '#532532', appRaised: '#683445', appBorder: '#714657', appMuted: '#D8BAC3', appAccentInk: '#401C28',
  },
  {
    id: 'blue', mode: 'dark', appText: '#FAF7EF', arabicName: 'أزرق', name: 'Blue',
    background: '#18334A', deep: '#14293C', surface: '#FAF7EF', border: '#DBAB68',
    muted: '#536D7F', accent: '#DBAB68', ink: '#18334A', lightPaper: '#FAF7EF', pale: '#E5EDF2',
    appBackground: '#14293C', appSurface: '#1D3B53', appRaised: '#28465A', appBorder: '#35516A', appMuted: '#BCD0DF', appAccentInk: '#14293C',
  },
  {
    id: 'black', mode: 'dark', appText: '#FAF7EF', arabicName: 'أسود', name: 'Black',
    background: '#292C2F', deep: '#191B1D', surface: '#FAF7EF', border: '#DBAB68',
    muted: '#646B70', accent: '#DBAB68', ink: '#24272A', lightPaper: '#FAF7EF', pale: '#E9E8E4',
    appBackground: '#191B1D', appSurface: '#292C2F', appRaised: '#373B3F', appBorder: '#484C50', appMuted: '#C1C4C5', appAccentInk: '#191B1D',
  },
  {
    id: 'brown', mode: 'dark', appText: '#FAF7EF', arabicName: 'بني', name: 'Brown',
    background: '#67482F', deep: '#493321', surface: '#FAF7EF', border: '#DBAB68',
    muted: '#80654D', accent: '#DBAB68', ink: '#4E3726', lightPaper: '#FAF7EF', pale: '#F1E9DD',
    appBackground: '#493321', appSurface: '#5D402B', appRaised: '#755435', appBorder: '#806348', appMuted: '#D6C3AE', appAccentInk: '#493321',
  },
];

export const DEFAULT_QURAN_THEME_ID: QuranThemeId = 'blue';

export function isQuranThemeId(value: unknown): value is QuranThemeId {
  return typeof value === 'string' && QURAN_THEMES.some(theme => theme.id === value);
}

export function getQuranTheme(id: QuranThemeId, mode: QuranThemeMode = 'dark'): QuranTheme {
  const theme = QURAN_THEMES.find(theme => theme.id === id) ?? QURAN_THEMES[2];
  if (mode === 'dark') return theme;
  return {
    ...theme, mode,
    appBackground: theme.pale, appSurface: theme.lightPaper, appRaised: '#FFFFFF',
    appText: theme.ink, appMuted: theme.muted, appBorder: theme.muted,
    accent: theme.ink, appAccentInk: theme.lightPaper,
  };
}

export type QuranThemePreference = { themeId: QuranThemeId; mode: QuranThemeMode };
export function readQuranThemePreference(raw: string | null, legacyId: string | null = null): QuranThemePreference {
  const defaults: QuranThemePreference = { themeId: isQuranThemeId(legacyId) ? legacyId : DEFAULT_QURAN_THEME_ID, mode: 'dark' };
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return defaults;
    const stored = value as Partial<QuranThemePreference>;
    return {
      themeId: isQuranThemeId(stored.themeId) ? stored.themeId : defaults.themeId,
      mode: stored.mode === 'light' ? 'light' : 'dark',
    };
  } catch { return defaults; }
}
