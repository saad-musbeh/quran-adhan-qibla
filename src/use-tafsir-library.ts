import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { getSurah, surahs } from './domain/quran';
import { downloadSurahsConcurrently, indexTafsirRecords, isValidTafsirEnvelope, isValidSurahResult, verifyQuranEncRelease, type SourceTafsirRecord, type TafsirBookEnvelope } from './domain/tafsir-download';
import { isValidRangeTafsirSurah, indexRangeTafsir, type RangeTafsirRecord, type TafsirText } from './domain/range-tafsir';
import { TAFSIR_BOOKS, type TafsirBook } from './data/tafsir';

const STORAGE_KEY = '@quran-adhan-qibla/tafsir-selected-book-v1';
const ROOT = `${FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? ''}tafsir-library/`;
const REQUEST_TIMEOUT_MS = 30_000;
const fileFor = (book: TafsirBook) => `${ROOT}${encodeURIComponent(book.id)}.json`;
const counts = surahs.map(surah => surah.verseCount);
const sourceRecords = (payload: unknown, surah: number) => {
  const result = payload && typeof payload === 'object' ? (payload as {result?:unknown}).result : undefined;
  const chapter = getSurah(surah);
  if (!chapter || !isValidSurahResult(result, surah, chapter.verseCount)) throw new Error(`Tafsir source returned incomplete or out-of-order verses for surah ${surah}.`);
  return result;
};
const envelopeFor = (book:TafsirBook,records:SourceTafsirRecord[]):TafsirBookEnvelope => ({schema:1,book:{id:book.id,title:book.title,publisher:book.publisher,version:book.version,url:book.url},records});
type RangeEnvelope = {schema:2;book:TafsirBookEnvelope['book'];chapters:RangeTafsirRecord[][];downloadToken?:string};
type BookEnvelope = TafsirBookEnvelope | RangeEnvelope;
function validEnvelope(value:unknown, book:TafsirBook):value is BookEnvelope {
  if(book.apiKind!=='tafsir')return isValidTafsirEnvelope(value,book,counts);
  if(!value||typeof value!=='object')return false;
  const e=value as Partial<RangeEnvelope>, b=e.book;
  return e.schema===2&&Boolean(b&&b.id===book.id&&b.title===book.title&&b.publisher===book.publisher&&b.version===book.version&&b.url===book.url)&&Array.isArray(e.chapters)&&e.chapters.length===114&&e.chapters.every((rows,i)=>isValidRangeTafsirSurah(rows,i+1,counts[i]));
}
function indexEnvelope(e:BookEnvelope):Map<string,TafsirText>{return e.schema===2?indexRangeTafsir(e.chapters):indexTafsirRecords(e.records)}
async function fetchWithTimeout<T>(url:string,parentSignal:AbortSignal,read:(response:Response)=>Promise<T>):Promise<T>{
  const local=new AbortController();let timedOut=false;
  const abort=()=>local.abort();parentSignal.addEventListener('abort',abort,{once:true});if(parentSignal.aborted)local.abort();
  const timer=setTimeout(()=>{timedOut=true;local.abort()},REQUEST_TIMEOUT_MS);
  try{return await read(await fetch(url,{headers:{Accept:'application/json, text/html'},signal:local.signal}));}
  catch(cause){if(timedOut){const error=new Error('QuranEnc did not respond in time. Please retry.');error.name='TimeoutError';throw error}throw cause}
  finally{clearTimeout(timer);parentSignal.removeEventListener('abort',abort)}
}
async function verifyRelease(book:TafsirBook,signal:AbortSignal){
  const html=await fetchWithTimeout('https://quranenc.com/ar/home',signal,async response=>{if(!response.ok)throw new Error(`Could not verify the QuranEnc release (HTTP ${response.status}).`);return response.text()});
  verifyQuranEncRelease(book,html);
}

export function useTafsirLibrary() {
  const [requested,setRequested]=useState(false);
  const openLibrary=useCallback(()=>setRequested(true),[]);
  const [downloadedIds,setDownloadedIds]=useState<string[]>([]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [loaded,setLoaded]=useState<Map<string,TafsirText>|null>(null);
  const [isDownloading,setIsDownloading]=useState<string|null>(null);
  const [progress,setProgress]=useState(0);
  const [error,setError]=useState<string|null>(null);
  const [ready,setReady]=useState(false);
  const mounted=useRef(true), controller=useRef<AbortController|null>(null), cancelled=useRef(false), temporary=useRef<string|null>(null), available=useRef(new Set<string>()), downloadLock=useRef(false);
  const selectedIdRef=useRef<string|null>(null),selectionRevision=useRef(0),downloadingIdRef=useRef<string|null>(null),selectionWrites=useRef(Promise.resolve());
  const persistSelection=(id:string|null)=>{selectionWrites.current=selectionWrites.current.catch(()=>undefined).then(()=>id?AsyncStorage.setItem(STORAGE_KEY,id):AsyncStorage.removeItem(STORAGE_KEY));return selectionWrites.current};
  const bookById=useMemo(()=>new Map(TAFSIR_BOOKS.map(book=>[book.id,book])),[]);

  const loadBook=useCallback(async(id:string):Promise<Map<string,TafsirText>|null>=>{
    const book=bookById.get(id);if(!book||!available.current.has(id))return null;
    const json=await FileSystem.readAsStringAsync(fileFor(book));
    const envelope=JSON.parse(json) as unknown;
    if(!validEnvelope(envelope,book)){
      await FileSystem.deleteAsync(fileFor(book),{idempotent:true});available.current.delete(id);if(mounted.current)setDownloadedIds([...available.current]);return null;
    }
    return indexEnvelope(envelope);
  },[bookById]);

  useEffect(()=>{
    if(!requested)return;
    mounted.current=true;
    const startupRevision=selectionRevision.current;
    void (async()=>{
      try {
        await FileSystem.makeDirectoryAsync(ROOT,{intermediates:true});
        const files=await FileSystem.readDirectoryAsync(ROOT).catch(()=>[] as string[]);
        await Promise.all(files.filter(name=>name.endsWith('.part')).map(name=>FileSystem.deleteAsync(`${ROOT}${name}`,{idempotent:true}).catch(()=>undefined)));
        const ids:string[]=[];
        for(const book of TAFSIR_BOOKS){
          try{const json=await FileSystem.readAsStringAsync(fileFor(book));const envelope=JSON.parse(json) as unknown;
            if(validEnvelope(envelope,book)){ids.push(book.id);available.current.add(book.id)}
            else await FileSystem.deleteAsync(fileFor(book),{idempotent:true});
          }catch{const info=await FileSystem.getInfoAsync(fileFor(book)).catch(()=>({exists:false} as FileSystem.FileInfo));if(info.exists)await FileSystem.deleteAsync(fileFor(book),{idempotent:true}).catch(()=>undefined);/* Missing or corrupt downloads stay unavailable. */}
        }
        const stored=await AsyncStorage.getItem(STORAGE_KEY), chosen=stored&&ids.includes(stored)?stored:ids[0]??null;
        if(chosen&&startupRevision===selectionRevision.current){const records=await loadBook(chosen);if(records&&mounted.current&&startupRevision===selectionRevision.current){selectedIdRef.current=chosen;setLoaded(records);setSelectedId(chosen);if(stored!==chosen)await persistSelection(chosen)}}
        else if(!chosen&&stored&&startupRevision===selectionRevision.current)await persistSelection(null);
        if(mounted.current){setDownloadedIds(ids);setReady(true)}
      }catch(cause){if(mounted.current){setError(cause instanceof Error?cause.message:'Could not open the offline tafsir library.');setReady(true)}}
    })();
    return()=>{mounted.current=false;cancelled.current=true;controller.current?.abort();};
  },[loadBook,requested]);

  const selectBook=useCallback(async(id:string)=>{
    const revision=++selectionRevision.current;setError(null);const book=bookById.get(id);if(!book){if(revision===selectionRevision.current)setError('This tafsir edition is unavailable.');return}
    selectedIdRef.current=id;setSelectedId(id);setLoaded(null);
    try{
      const records=available.current.has(id)?await loadBook(id):null;
      if(!mounted.current||revision!==selectionRevision.current)return;
      setLoaded(records);await persistSelection(id);
    }catch(cause){if(mounted.current&&revision===selectionRevision.current)setError(cause instanceof Error?cause.message:'Could not open this tafsir edition.')}
  },[bookById,loadBook]);

  const downloadBook=useCallback(async(id:string)=>{
    const book=bookById.get(id);if(!book||downloadLock.current)return;
    if(available.current.has(id)){setError(null);setProgress(100);if(selectedIdRef.current===id){const revision=selectionRevision.current,records=await loadBook(id);if(mounted.current&&revision===selectionRevision.current&&selectedIdRef.current===id)setLoaded(records)}return}
    downloadLock.current=true;downloadingIdRef.current=id;cancelled.current=false;const aborter=new AbortController();controller.current=aborter;
    const temp=`${fileFor(book)}.${Date.now()}-${Math.random().toString(36).slice(2)}.part`,downloadToken=`${Date.now()}-${Math.random().toString(36).slice(2)}`;temporary.current=temp;setError(null);setIsDownloading(id);setProgress(0);
    try{
      await verifyRelease(book,aborter.signal);
      const records=await downloadSurahsConcurrently<SourceTafsirRecord[]|RangeTafsirRecord[]>(114,3,aborter.signal,async(surah,signal)=>{
      const endpoint=`https://quranenc.com/api/v1/${book.apiKind??'translation'}/sura/${encodeURIComponent(book.apiKey)}/${surah}`;
      return await fetchWithTimeout(endpoint,signal,async response=>{if(!response.ok)throw new Error(`Tafsir download failed at surah ${surah} (HTTP ${response.status}).`);const payload=await response.json() as {result?:unknown};if(book.apiKind==='tafsir'){if(!isValidRangeTafsirSurah(payload.result,surah,counts[surah-1]))throw new Error(`Incomplete tafsir passages for surah ${surah}.`);return payload.result}return sourceRecords(payload,surah)});
    },completed=>{if(mounted.current)setProgress(Math.floor(100*completed/114))});
      if(cancelled.current||aborter.signal.aborted){const abortError=new Error('Download cancelled');abortError.name='AbortError';throw abortError;}
      const envelope:BookEnvelope=book.apiKind==='tafsir'
        ?{schema:2,book:{id:book.id,title:book.title,publisher:book.publisher,version:book.version,url:book.url},chapters:records as RangeTafsirRecord[][],downloadToken}
        :{...envelopeFor(book,(records as SourceTafsirRecord[][]).flat()),downloadToken};
      if(!validEnvelope(envelope,book))throw new Error('Downloaded tafsir did not pass complete Quran validation.');
      await FileSystem.writeAsStringAsync(temp,JSON.stringify(envelope));
      if(cancelled.current||aborter.signal.aborted||!mounted.current){const abortError=new Error('Download cancelled');abortError.name='AbortError';throw abortError;}
      await FileSystem.moveAsync({from:temp,to:fileFor(book)});temporary.current=null;
      if(cancelled.current||aborter.signal.aborted||!mounted.current){try{const saved=JSON.parse(await FileSystem.readAsStringAsync(fileFor(book))) as {downloadToken?:string};if(saved.downloadToken===downloadToken)await FileSystem.deleteAsync(fileFor(book),{idempotent:true})}catch{/* Preserve any unrelated final file. */}return;}
      available.current.add(id);
      const ids=[...available.current];setDownloadedIds(ids);setProgress(100);
      if(selectedIdRef.current===id){setLoaded(indexEnvelope(envelope))}
      else if(selectedIdRef.current===null){selectedIdRef.current=id;setSelectedId(id);setLoaded(indexEnvelope(envelope));selectionRevision.current+=1;await persistSelection(id)}
    }catch(cause){
      if(!cancelled.current&&!(cause instanceof Error&&cause.name==='AbortError')&&mounted.current){controller.current?.abort();setError(cause instanceof Error?cause.message:'Tafsir download failed. Retry to continue.')}
    }finally{
      if(temporary.current===temp){await FileSystem.deleteAsync(temp,{idempotent:true}).catch(()=>undefined);temporary.current=null}
      if(controller.current===aborter)controller.current=null;downloadLock.current=false;downloadingIdRef.current=null;
      if(mounted.current)setIsDownloading(null);
    }
  },[bookById,loadBook]);

  const cancelDownload=useCallback(()=>{if(!controller.current)return;cancelled.current=true;controller.current.abort();setError(null);},[]);
  const deleteBook=useCallback(async(id:string)=>{
    const book=bookById.get(id);if(!book||id===downloadingIdRef.current)return;
    await FileSystem.deleteAsync(fileFor(book),{idempotent:true});available.current.delete(id);
    const ids=[...available.current];setDownloadedIds(ids);
    if(selectedIdRef.current===id){const revision=++selectionRevision.current,next=ids[0]??null;selectedIdRef.current=next;setSelectedId(next);setLoaded(null);const records=next?await loadBook(next):null;if(revision===selectionRevision.current){setLoaded(records);await persistSelection(next)}}
  },[bookById,loadBook]);
  const getTafsir=useCallback((surah:number,ayah:number)=>loaded?.get(`${surah}:${ayah}`),[loaded]);
  return {openLibrary,books:TAFSIR_BOOKS,downloadedIds,selectedId,selectedBook:selectedId?bookById.get(selectedId)??null:null,isDownloading,progress,error,selectBook,downloadBook,cancelDownload,deleteBook,getTafsir,ready} as const;
}
