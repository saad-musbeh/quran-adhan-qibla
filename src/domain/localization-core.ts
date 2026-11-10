import type {Language} from './languages.ts';

/** Shared formatting; native catalogues are fetched lazily by language. */
export function createLocalization(catalogs:Record<Exclude<Language,'ar'>,Record<string,string>>){
const messageIds = new Map(Object.entries(catalogs.en).map(([id, text]) => [text, id]));

function message(language: Language, english: string, values: Record<string, string | number> = {}): string {
  const id = messageIds.get(english);
  const text = id ? (catalogs[language === 'ar' ? 'en' : language]?.[id] ?? english) : english;
  return text.replace(/\{(\w+)\}/g, (token, key: string) => values[key] === undefined ? token : String(values[key]));
}
/** Keep existing reviewed Arabic copy; other locales share the English message catalogue. */
function bilingual(language: Language, arabic: string, english: string, values: Record<string, string | number> = {}): string {
  if (language !== 'ar') return message(language, english, values);
  return arabic.replace(/\{(\w+)\}/g, (token, key: string) => values[key] === undefined ? token : String(values[key]));
}
function localizeCopy<T extends Record<string, string> | readonly string[]>(language: Language, copies: { en: T; ar: unknown }): T {
  if (language === 'ar') return copies.ar as T;
  if (Array.isArray(copies.en)) return copies.en.map(text => message(language, text)) as unknown as T;
  return Object.fromEntries(Object.entries(copies.en).map(([key, text]) => [key, message(language, text)])) as T;
}

return {message,bilingual,localizeCopy};
}
