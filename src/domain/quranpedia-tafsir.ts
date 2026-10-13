import type { TafsirBook } from '../data/tafsir';
import type { TafsirText } from './range-tafsir';

export type QuranpediaAyah = {surah:number;ayah:number;content:{textIndex:number;part?:string|number;page?:number;ayahs?:string}[]};
export type QuranpediaDump = {license:{source:string;version:string};book:{id:number;language:{code:string}};schema:'quranpedia-text-v1'|'tafsir-text-v1';source:{url:string;sha256:string;version:string};texts:string[];ayahs:QuranpediaAyah[]};
export function isQuranpediaDump(value:unknown,book:TafsirBook,counts:readonly number[]):value is QuranpediaDump {
  if(!value||typeof value!=='object'||!book.dump)return false;
  const d=value as Partial<QuranpediaDump>;
  if(d.license?.source!==(book.dump.licenseSource??'https://quranpedia.net')||d.license.version!==book.dump.sourceVersion||d.book?.id!==book.dump.bookId||d.book.language?.code!==(book.language??'ar')||d.schema!==(book.apiKind==='archive'?'tafsir-text-v1':'quranpedia-text-v1')||d.source?.url!==book.dump.originalUrl||d.source.sha256!==book.dump.originalSha256||d.source.version!==book.dump.sourceVersion||!Array.isArray(d.texts)||!d.texts.length||!d.texts.every(t=>typeof t==='string')||!Array.isArray(d.ayahs)||d.ayahs.length!==book.dump.rows)return false;
  const seen=new Set<string>();
  return d.ayahs.every(r=>{
    if(!r||!Number.isInteger(r.surah)||r.surah<1||r.surah>114||!Number.isInteger(r.ayah)||r.ayah<1||r.ayah>counts[r.surah-1]||!Array.isArray(r.content)||!r.content.length||!r.content.every(c=>c&&Number.isInteger(c.textIndex)&&c.textIndex>=0&&c.textIndex<d.texts!.length))return false;
    const key=`${r.surah}:${r.ayah}`;if(seen.has(key))return false;seen.add(key);return true;
  });
}
export function indexQuranpediaDump(d:QuranpediaDump):Map<string,TafsirText> {
  const passages=new Map<string,TafsirText>(),result=new Map<string,TafsirText>();
  for(const r of d.ayahs){
    const key=r.content.map(c=>c.textIndex).join(',');let passage=passages.get(key);
    if(!passage){passage={text:r.content.map(c=>d.texts[c.textIndex]).join('\n\n'),footnotes:null};passages.set(key,passage)}
    if(passage.text.trim())result.set(`${r.surah}:${r.ayah}`,passage);
  }
  return result;
}
