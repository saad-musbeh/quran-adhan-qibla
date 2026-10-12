/** User-facing language choices. Quran source text stays Arabic in every locale. */
export const LANGUAGES = [
  { id: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true, locale: 'ar-SA' },
  { id: 'en', name: 'English', nativeName: 'English', rtl: false, locale: 'en' },
  { id: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', rtl: false, locale: 'id' },
  { id: 'ur', name: 'Urdu', nativeName: 'اردو', rtl: true, locale: 'ur' },
  { id: 'bn', name: 'Bengali', nativeName: 'বাংলা', rtl: false, locale: 'bn' },
  { id: 'tr', name: 'Turkish', nativeName: 'Türkçe', rtl: false, locale: 'tr' },
  { id: 'fr', name: 'French', nativeName: 'Français', rtl: false, locale: 'fr' },
  { id: 'fa', name: 'Persian', nativeName: 'فارسی', rtl: true, locale: 'fa' },
  { id: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', rtl: false, locale: 'ms' },
  { id: 'hi', name: 'Hindi', nativeName: 'हिन्दी', rtl: false, locale: 'hi' },
  { id: 'pa-Arab', name: 'Punjabi', nativeName: 'پنجابی', rtl: true, locale: 'pa-Arab-PK' },
  { id: 'ha', name: 'Hausa', nativeName: 'Hausa', rtl: false, locale: 'ha' },
  { id: 'sw', name: 'Swahili', nativeName: 'Kiswahili', rtl: false, locale: 'sw' },
  { id: 'ps', name: 'Pashto', nativeName: 'پښتو', rtl: true, locale: 'ps' },
  { id: 'ru', name: 'Russian', nativeName: 'Русский', rtl: false, locale: 'ru' },
  { id: 'uz', name: 'Uzbek', nativeName: 'Oʻzbekcha', rtl: false, locale: 'uz-Latn' },
  { id: 'so', name: 'Somali', nativeName: 'Soomaali', rtl: false, locale: 'so' },
  { id: 'ckb', name: 'Kurdish (Sorani)', nativeName: 'سۆرانی', rtl: true, locale: 'ckb' },
  { id: 'az', name: 'Azerbaijani', nativeName: 'Azərbaycanca', rtl: false, locale: 'az-Latn' },
  { id: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', rtl: false, locale: 'ml' },
  { id: 'ta', name: 'Tamil', nativeName: 'தமிழ்', rtl: false, locale: 'ta' },
  { id: 'ff', name: 'Fulfulde', nativeName: 'Fulfulde', rtl: false, locale: 'ff-Latn' },
  { id: 'de', name: 'German', nativeName: 'Deutsch', rtl: false, locale: 'de' },
  { id: 'es', name: 'Spanish', nativeName: 'Español', rtl: false, locale: 'es' },
  { id: 'zh-Hans', name: 'Chinese (Simplified)', nativeName: '简体中文', rtl: false, locale: 'zh-Hans' },
  { id: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', rtl: false, locale: 'jv' },
  { id: 'su', name: 'Sundanese', nativeName: 'Basa Sunda', rtl: false, locale: 'su' },
  { id: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', rtl: false, locale: 'yo' },
  { id: 'sd', name: 'Sindhi', nativeName: 'سنڌي', rtl: true, locale: 'sd' },
  { id: 'am', name: 'Amharic', nativeName: 'አማርኛ', rtl: false, locale: 'am' },
  { id: 'kk', name: 'Kazakh', nativeName: 'Қазақша', rtl: false, locale: 'kk' },
  { id: 'ky', name: 'Kyrgyz', nativeName: 'Кыргызча', rtl: false, locale: 'ky' },
  { id: 'tg', name: 'Tajik', nativeName: 'Тоҷикӣ', rtl: false, locale: 'tg' },
  { id: 'sq', name: 'Albanian', nativeName: 'Shqip', rtl: false, locale: 'sq' },
  { id: 'bs', name: 'Bosnian', nativeName: 'Bosanski', rtl: false, locale: 'bs' },
] as const;
export type Language = typeof LANGUAGES[number]['id'];
export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGES.some(item => item.id === value);
}
export function isRTL(language: Language): boolean {
  return LANGUAGES.find(item => item.id === language)?.rtl ?? false;
}
export function localeFor(language: Language): string {
  // Prayer dates remain Gregorian in Persian, Arabic, and every other locale.
  return `${LANGUAGES.find(item => item.id === language)?.locale ?? 'en'}-u-ca-gregory`;
}
export function searchLanguages(query: string) {
  const normalized = query.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
  return LANGUAGES.filter(item => `${item.name} ${item.nativeName} ${item.id}`.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase().includes(normalized));
}
