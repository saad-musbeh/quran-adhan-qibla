import { bilingual, type Language } from './i18n';
import { useState } from 'react';
import { Alert } from 'react-native';
import { createQuranLoopRange } from './domain/quran-loop';
import type { AudioRange, QuranAudioController } from './use-quran-audio';

export function useVerseLoopPicker(language:Language,audio:QuranAudioController) {
  const [pickMode,setPickMode]=useState<'start'|'end'|null>(null);
  const [startKey,setStartKey]=useState<string|null>(null);
  const [endKey,setEndKey]=useState<string|null>(null);
  const [initialRange,setInitialRange]=useState<AudioRange|null>(null);
  const [visible,setVisible]=useState(false);
  const pause=()=>{if(audio.status==='playing'||audio.status==='loading')audio.pause()};
  const startAt=(key:string)=>{const result=createQuranLoopRange(key);if(!result.ok)return;const end=result.end;setStartKey(key);setEndKey(`${result.surah}:${end}`);setInitialRange({surah:result.surah,start:result.start,end});setVisible(false);setPickMode('end');void audio.playRange(result.surah,result.start,end).catch(()=>undefined)};
  const endAt=(key:string)=>{
    const first=startKey??(audio.repeatRange?`${audio.repeatRange.surah}:${audio.repeatRange.start}`:null);
    if(!first){startAt(key);return}
    const result=createQuranLoopRange(first,key);
    if(!result.ok){
      Alert.alert(bilingual(language, 'نطاق التكرار', 'Loop range'),result.error==='different-surah'
        ? bilingual(language,'اختر آية النهاية من السورة نفسها.','Choose the ending ayah in the same surah.')
        : bilingual(language,'اختر آية النهاية بعد آية البداية أو اختر الآية نفسها.','Choose the same ayah or an ayah after the starting ayah.'),
        [{text:bilingual(language,'حسنًا','OK')}]);
      return;
    }
    pause();setStartKey(first);setEndKey(key);setInitialRange({surah:result.surah,start:result.start,end:result.end});setPickMode(null);setVisible(true);
  };
  const cancel=()=>{setPickMode(null);setStartKey(null);setEndKey(null);setInitialRange(null)};
  return {pickMode,startKey,endKey,initialRange,visible,startAt,endAt,
    pick:(key:string)=>{if(pickMode==='start')startAt(key);else if(pickMode==='end')endAt(key)},
    beginPicking:()=>{pause();cancel();setVisible(false);setPickMode('start')},
    open:()=>{cancel();setVisible(true)},close:()=>{setVisible(false);cancel()},cancel,
  };
}
