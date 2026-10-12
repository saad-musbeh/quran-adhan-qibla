import type { Language } from './domain/languages.ts';
import c0 from './locales/en.json' with { type: 'json' };
import c1 from './locales/id.json' with { type: 'json' };
import c2 from './locales/ur.json' with { type: 'json' };
import c3 from './locales/bn.json' with { type: 'json' };
import c4 from './locales/tr.json' with { type: 'json' };
import c5 from './locales/fr.json' with { type: 'json' };
import c6 from './locales/fa.json' with { type: 'json' };
import c7 from './locales/ms.json' with { type: 'json' };
import c8 from './locales/hi.json' with { type: 'json' };
import c9 from './locales/pa-Arab.json' with { type: 'json' };
import c10 from './locales/ha.json' with { type: 'json' };
import c11 from './locales/sw.json' with { type: 'json' };
import c12 from './locales/ps.json' with { type: 'json' };
import c13 from './locales/ru.json' with { type: 'json' };
import c14 from './locales/uz.json' with { type: 'json' };
import c15 from './locales/so.json' with { type: 'json' };
import c16 from './locales/ckb.json' with { type: 'json' };
import c17 from './locales/az.json' with { type: 'json' };
import c18 from './locales/ml.json' with { type: 'json' };
import c19 from './locales/ta.json' with { type: 'json' };
import c20 from './locales/ff.json' with { type: 'json' };
import c21 from './locales/de.json' with { type: 'json' };
import c22 from './locales/es.json' with { type: 'json' };
import c23 from './locales/zh-Hans.json' with { type: 'json' };
import c24 from './locales/jv.json' with { type: 'json' };
import c25 from './locales/su.json' with { type: 'json' };
import c26 from './locales/yo.json' with { type: 'json' };
import c27 from './locales/sd.json' with { type: 'json' };
import c28 from './locales/am.json' with { type: 'json' };
import c29 from './locales/kk.json' with { type: 'json' };
import c30 from './locales/ky.json' with { type: 'json' };
import c31 from './locales/tg.json' with { type: 'json' };
import c32 from './locales/sq.json' with { type: 'json' };
import c33 from './locales/bs.json' with { type: 'json' };

export const catalogs: Record<Exclude<Language, 'ar'>, Record<string, string>> = {
  'en': c0,
  'id': c1,
  'ur': c2,
  'bn': c3,
  'tr': c4,
  'fr': c5,
  'fa': c6,
  'ms': c7,
  'hi': c8,
  'pa-Arab': c9,
  'ha': c10,
  'sw': c11,
  'ps': c12,
  'ru': c13,
  'uz': c14,
  'so': c15,
  'ckb': c16,
  'az': c17,
  'ml': c18,
  'ta': c19,
  'ff': c20,
  'de': c21,
  'es': c22,
  'zh-Hans': c23,
  'jv': c24,
  'su': c25,
  'yo': c26,
  'sd': c27,
  'am': c28,
  'kk': c29,
  'ky': c30,
  'tg': c31,
  'sq': c32,
  'bs': c33,
};
const messageIds = new Map(Object.entries(c0).map(([id, text]) => [text, id]));

export function message(language: Language, english: string, values: Record<string, string | number> = {}): string {
  const id = messageIds.get(english);
  const text = id ? (catalogs[language === 'ar' ? 'en' : language]?.[id] ?? english) : english;
  return text.replace(/\{(\w+)\}/g, (token, key: string) => values[key] === undefined ? token : String(values[key]));
}
/** Keep existing reviewed Arabic copy; other locales share the English message catalogue. */
export function bilingual(language: Language, arabic: string, english: string, values: Record<string, string | number> = {}): string {
  if (language !== 'ar') return message(language, english, values);
  return arabic.replace(/\{(\w+)\}/g, (token, key: string) => values[key] === undefined ? token : String(values[key]));
}
export function localizeCopy<T extends Record<string, string> | readonly string[]>(language: Language, copies: { en: T; ar: unknown }): T {
  if (language === 'ar') return copies.ar as T;
  if (Array.isArray(copies.en)) return copies.en.map(text => message(language, text)) as unknown as T;
  return Object.fromEntries(Object.entries(copies.en).map(([key, text]) => [key, message(language, text)])) as T;
}
