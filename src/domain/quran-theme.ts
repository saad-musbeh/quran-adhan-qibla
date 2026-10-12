export type QuranThemeId = 'green' | 'maroon' | 'blue' | 'black' | 'brown';

export type QuranTheme = {
  id: QuranThemeId;
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
  /** Dark app chrome and cards complement the selected Quran theme. */
  appBackground: string;
  appSurface: string;
  appRaised: string;
  appBorder: string;
  appMuted: string;
  appAccentInk: string;
};

export const QURAN_THEMES: readonly QuranTheme[] = [
  {
    id: 'green', arabicName: 'أخضر', name: 'Green',
    background: '#214D3B', deep: '#17382B', surface: '#FAF7EF', border: '#DBAB68',
    muted: '#526F60', accent: '#DBAB68', ink: '#17382B', lightPaper: '#FAF7EF', pale: '#E5EEE8',
    appBackground: '#17382B', appSurface: '#214638', appRaised: '#284C40', appBorder: '#35544B', appMuted: '#A8C1B8', appAccentInk: '#17382B',
  },
  {
    id: 'maroon', arabicName: 'عنابي', name: 'Maroon',
    background: '#5B2938', deep: '#401C28', surface: '#FAF7EF', border: '#DBAB68',
    muted: '#73515B', accent: '#DBAB68', ink: '#4A2330', lightPaper: '#FAF7EF', pale: '#F1E6E9',
    appBackground: '#401C28', appSurface: '#532532', appRaised: '#683445', appBorder: '#714657', appMuted: '#D8BAC3', appAccentInk: '#401C28',
  },
  {
    id: 'blue', arabicName: 'أزرق', name: 'Blue',
    background: '#18334A', deep: '#14293C', surface: '#FAF7EF', border: '#DBAB68',
    muted: '#536D7F', accent: '#DBAB68', ink: '#18334A', lightPaper: '#FAF7EF', pale: '#E5EDF2',
    appBackground: '#14293C', appSurface: '#1D3B53', appRaised: '#28465A', appBorder: '#35516A', appMuted: '#BCD0DF', appAccentInk: '#14293C',
  },
  {
    id: 'black', arabicName: 'أسود', name: 'Black',
    background: '#292C2F', deep: '#191B1D', surface: '#FAF7EF', border: '#DBAB68',
    muted: '#646B70', accent: '#DBAB68', ink: '#24272A', lightPaper: '#FAF7EF', pale: '#E9E8E4',
    appBackground: '#191B1D', appSurface: '#292C2F', appRaised: '#373B3F', appBorder: '#484C50', appMuted: '#C1C4C5', appAccentInk: '#191B1D',
  },
  {
    id: 'brown', arabicName: 'بني', name: 'Brown',
    background: '#67482F', deep: '#493321', surface: '#FAF7EF', border: '#DBAB68',
    muted: '#80654D', accent: '#DBAB68', ink: '#4E3726', lightPaper: '#FAF7EF', pale: '#F1E9DD',
    appBackground: '#493321', appSurface: '#5D402B', appRaised: '#755435', appBorder: '#806348', appMuted: '#D6C3AE', appAccentInk: '#493321',
  },
];

export const DEFAULT_QURAN_THEME_ID: QuranThemeId = 'blue';

export function isQuranThemeId(value: unknown): value is QuranThemeId {
  return typeof value === 'string' && QURAN_THEMES.some(theme => theme.id === value);
}

export function getQuranTheme(id: QuranThemeId): QuranTheme {
  return QURAN_THEMES.find(theme => theme.id === id) ?? QURAN_THEMES[2];
}
