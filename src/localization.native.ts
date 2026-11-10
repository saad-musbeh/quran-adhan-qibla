import {createLocalization} from './domain/localization-core.ts';
import type { Language } from './domain/languages.ts';

const loaders: Record<Exclude<Language, 'ar'>, () => Record<string, string>> = {
  'en':()=>require('./locales/en.json'),
  'id':()=>require('./locales/id.json'),
  'ur':()=>require('./locales/ur.json'),
  'bn':()=>require('./locales/bn.json'),
  'tr':()=>require('./locales/tr.json'),
  'fr':()=>require('./locales/fr.json'),
  'fa':()=>require('./locales/fa.json'),
  'ms':()=>require('./locales/ms.json'),
  'hi':()=>require('./locales/hi.json'),
  'pa-Arab':()=>require('./locales/pa-Arab.json'),
  'ha':()=>require('./locales/ha.json'),
  'sw':()=>require('./locales/sw.json'),
  'ps':()=>require('./locales/ps.json'),
  'ru':()=>require('./locales/ru.json'),
  'uz':()=>require('./locales/uz.json'),
  'so':()=>require('./locales/so.json'),
  'ckb':()=>require('./locales/ckb.json'),
  'az':()=>require('./locales/az.json'),
  'ml':()=>require('./locales/ml.json'),
  'ta':()=>require('./locales/ta.json'),
  'ff':()=>require('./locales/ff.json'),
  'de':()=>require('./locales/de.json'),
  'es':()=>require('./locales/es.json'),
  'zh-Hans':()=>require('./locales/zh-Hans.json'),
  'jv':()=>require('./locales/jv.json'),
  'su':()=>require('./locales/su.json'),
  'yo':()=>require('./locales/yo.json'),
  'sd':()=>require('./locales/sd.json'),
  'am':()=>require('./locales/am.json'),
  'kk':()=>require('./locales/kk.json'),
  'ky':()=>require('./locales/ky.json'),
  'tg':()=>require('./locales/tg.json'),
  'sq':()=>require('./locales/sq.json'),
  'bs':()=>require('./locales/bs.json'),
  'skr':()=>require('./locales/skr.json'),
  'om':()=>require('./locales/om.json'),
  'ku':()=>require('./locales/ku.json'),
  'ug':()=>require('./locales/ug.json'),
  'wo':()=>require('./locales/wo.json'),
};

declare const require:(path:string)=>Record<string,string>;
export const catalogs=Object.defineProperties({},Object.fromEntries(Object.entries(loaders).map(([language,load])=>[language,{enumerable:true,get:load}]))) as Record<Exclude<Language,'ar'>,Record<string,string>>;
export const {message,bilingual,localizeCopy}=createLocalization(catalogs);
