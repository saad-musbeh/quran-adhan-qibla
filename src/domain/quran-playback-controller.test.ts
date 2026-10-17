import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import ts from 'typescript';
import type { QuranAudioController, QuranAudioTiming } from '../use-quran-audio';

const require = createRequire(import.meta.url);
(globalThis as typeof globalThis & { require: NodeRequire; IS_REACT_ACT_ENVIRONMENT: boolean }).require = require;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const modules = Object.fromEntries(await Promise.all(['quran','quran-audio','quran-audio-queue','audio-downloads','surah-audio']
  .map(async name => [`./domain/${name}`, await import(`./${name}.ts`)])));
modules['./data/reciters'] = await import('../data/reciters.ts');
modules['./data/surah-recitations'] = await import('../data/surah-recitations.ts');
const compiled = ts.transpileModule(readFileSync(new URL('../use-quran-audio.ts',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true},
}).outputText;

/** Run the production hook with real React lifecycle and controlled native IO. */
async function playerHarness(localFiles: string[] = [], timingRows: unknown = []) {
  const files = new Set(localFiles);
  const tracks: string[] = [], requested: string[] = [];
  let status = {currentTime:0,duration:0,currentIndex:0,trackCount:0,isLoaded:false,isBuffering:false,playing:false,didJustFinish:false};
  let plays = 0;
  let trackEnds: Record<string, number> = {};
  let errorListener: (message:string,uri?:string,time?:number)=>void = ()=>{};
  let remoteListener: (command:string,nativeHandled:boolean)=>void = ()=>{};
  const playlist = {
    playbackRate:1,loop:'none',
    pause(){ status={...status,playing:false}; },
    clear(){ tracks.length=0; status={...status,trackCount:0,currentTime:0,didJustFinish:false,isLoaded:false}; },
    add(source:{uri:string}){ tracks.push(source.uri); status={...status,trackCount:tracks.length}; },
    play(){ plays++; },
    skipTo(index:number){ status={...status,currentIndex:index,currentTime:0}; },
    async seekTo(time:number){ status={...status,currentTime:time,didJustFinish:false}; },
    next(){},previous(){},remove(){},
  };
  const fs = {
    documentDirectory:'file:///private/',
    async getInfoAsync(uri:string){ return {exists:files.has(uri),size:files.has(uri)?100:0}; },
    async readAsStringAsync(){ throw Error('No cached metadata'); },
    async makeDirectoryAsync(){},async writeAsStringAsync(){},
    async deleteAsync(uri:string){files.delete(uri);},
    async moveAsync({from,to}:{from:string;to:string}){ files.delete(from);files.add(to); },
    createDownloadResumable(uri:string,destination:string){
      requested.push(uri);
      return {async downloadAsync(){ files.add(destination);return {uri:destination,status:200,mimeType:'audio/mpeg',headers:{}}; },async cancelAsync(){}};
    },
  };
  const mocks: Record<string,unknown> = {
    ...modules,
    react:require('react'),
    '@react-native-async-storage/async-storage':{async multiGet(){return [['preferences',JSON.stringify({reciter:'ghamdi',surahEnd:'next',playbackRate:1.25})],['downloads',null]];},async setItem(){}},
    'expo-audio':{useAudioPlaylist:()=>playlist,useAudioPlaylistStatus:()=>status,async setAudioModeAsync(){}},
    'expo-file-system/legacy':fs,
    'expo-network':{async getNetworkStateAsync(){return {isConnected:true,isInternetReachable:true};},addNetworkStateListener:()=>({remove(){}})},
    'react-native':{AppState:{addEventListener:()=>({remove(){}})}},
    './quran-audio-controls':{quranAudioControls:{available:false,attach(_playlist:unknown,_titles:unknown,_reciter:unknown,ends:Record<string,number>){trackEnds=ends;},detach(){},updateTitles(){},updateMetadata(){},updatePlaybackRate(){},
      addPlaybackErrorListener(fn:typeof errorListener){errorListener=fn;return {remove(){}};},
      addRemoteCommandListener(fn:typeof remoteListener){remoteListener=fn;return {remove(){}};}}},
  };
  const output={exports:{} as {useQuranAudio:()=>QuranAudioController & QuranAudioTiming}};
  new Function('require','module','exports',compiled)((name:string)=>{
    if (!(name in mocks)) throw Error(`Unexpected native import: ${name}`);
    return mocks[name];
  },output,output.exports);
  let controller!: QuranAudioController & QuranAudioTiming;
  function Probe(){controller=output.exports.useQuranAudio();return null;}
  let root!: ReactTestRenderer;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async ()=>({ok:true,async json(){return timingRows;}} as unknown as Response);
  await act(async()=>{root=create(createElement(Probe));});
  return {
    get controller(){return controller;},get plays(){return plays;},get time(){return status.currentTime;},get trackEnds(){return trackEnds;},get loop(){return playlist.loop;},tracks,requested,files,fs,
    async command(fn:()=>unknown){ await act(async()=>{await fn();}); },
    async tick(next:Partial<typeof status>){await act(async()=>{status={...status,...next};root.update(createElement(Probe));});},
    async fail(message:string,time:number){await act(async()=>{errorListener(message,tracks[status.currentIndex],time);});},
    async remote(command:string){await act(async()=>{remoteListener(command,false);});},
    async close(){await act(async()=>root.unmount());globalThis.fetch=previousFetch;},
  };
}

test('starting at ayah one uses a full-surah file, ignores saved Next, resumes, and stops at its end', async()=>{
  const h=await playerHarness();
  try {
    assert.equal(h.controller.surahEnd,'stop');
    await h.command(()=>h.controller.playVerse(112,1));
    assert.deepEqual(h.tracks,['https://cdn.mp3quran.net/audio/saad-ghamdi/r1/112.mp3']);
    assert.equal(h.controller.fullSurah,112);
    assert.equal(h.controller.currentVerseKey,null); // No invented timing/highlight.
    await h.tick({playing:true,isLoaded:true,duration:17,currentTime:8});
    assert.equal(h.controller.status,'playing');
    await h.command(()=>h.controller.pause());
    assert.equal(h.controller.status,'paused');
    await h.command(()=>h.controller.togglePlayback());
    assert.equal(h.tracks.length,1);
    await h.tick({playing:false,isLoaded:true,currentTime:17,didJustFinish:true});
    assert.equal(h.controller.status,'idle');
    assert.equal(h.tracks.length,1);
    const plays=h.plays;
    await h.tick({currentTime:17,didJustFinish:false});
    assert.equal(h.plays,plays);
    await h.command(()=>h.controller.togglePlayback());
    assert.equal(h.controller.fullSurah,112);
    assert.equal(h.tracks.length,1);
  } finally {await h.close();}
});

test('Ghamdi Fatiha uses the audited native end for streams, downloads, repeats and Next', async()=>{
  const local='file:///private/quran-audio/ghamdi/001/surah.mp3';
  for (const cached of [false,true]) {
    const h=await playerHarness(cached?[local]:[]);
    try {
      await h.command(()=>h.controller.playSurah(1));
      const source=cached?local:'https://cdn.mp3quran.net/audio/saad-ghamdi/r1/001.mp3';
      assert.deepEqual(h.trackEnds,{[source]:42});
      await h.tick({playing:true,isLoaded:true,duration:48.091417,currentTime:40});
      assert.equal(h.controller.duration,42);
      await h.command(()=>h.controller.seekBy(15));
      assert.equal(h.time,42);
      await h.tick({playing:false,currentTime:42});
      assert.equal(h.controller.status,'idle');
      await h.command(()=>h.controller.setSurahEnd('repeat'));
      assert.deepEqual(h.trackEnds,{[source]:42});
      assert.equal(h.loop,'all');
      await h.command(()=>h.controller.setSurahEnd('next'));
      assert.deepEqual(h.trackEnds,{[source]:42});
      assert.equal(h.tracks.length,114);
      await h.command(()=>h.controller.playRange(1,7,7));
      assert.deepEqual(h.trackEnds,{}); // Do not apply a full-recording offset to an ayah MP3.
      await h.command(()=>h.controller.setReciter('alafasy'));
      await h.command(()=>h.controller.playSurah(1));
      assert.deepEqual(h.trackEnds,{}); // No guessed cutoff for another voice.
    } finally {await h.close();}
  }
});

test('Shuraym uses independent full and final-ayah ends on streams and saved ranges', async()=>{
  const local='file:///private/quran-audio/shuraym/001/001007.mp3';
  for (const cached of [false,true]) {
    const h=await playerHarness(cached?[local]:[]);
    try {
      await h.command(()=>h.controller.setReciter('shuraym'));
      await h.command(()=>h.controller.playSurah(1));
      assert.equal(Object.values(h.trackEnds)[0],35.25);
      await h.command(()=>h.controller.playRange(1,6,7));
      const source=cached?local:h.tracks[1];
      assert.deepEqual(h.trackEnds,{[source]:11.95});
      assert.equal(h.loop,'all');
      await h.tick({currentIndex:1,playing:true,isLoaded:true,currentTime:10,duration:14});
      assert.equal(h.controller.duration,11.95);
      await h.command(()=>h.controller.seekBy(15));
      assert.equal(h.time,11.95);
      await h.command(()=>h.controller.playVerse(1,6));
      assert.deepEqual(h.trackEnds,{[source]:11.95});
      await h.command(()=>h.controller.playSurah(112));
      assert.deepEqual(h.trackEnds,{});
    } finally {await h.close();}
  }
});

test('whole-surah retry retains its source and time; an explicit Next queues full recordings only', async()=>{
  const h=await playerHarness();
  try {
    await h.command(()=>h.controller.playSurah(112));
    await h.tick({playing:true,isLoaded:true,duration:17,currentTime:8});
    await h.fail('Network connection failed',8);
    assert.equal(h.controller.status,'error');
    await h.command(()=>h.controller.retryPlayback());
    assert.equal(h.tracks.length,1);
    assert.match(h.tracks[0],/\/112\.mp3$/);
    assert.equal(h.time,8);
    await h.command(()=>h.controller.setSurahEnd('next'));
    assert.deepEqual(h.tracks.map(uri=>uri.split('/').at(-1)),['112.mp3','113.mp3','114.mp3']);
    await h.command(()=>h.controller.setSurahEnd('stop'));
    assert.equal(h.tracks.length,1);
    await h.command(()=>h.controller.playRange(112,2,3));
    assert.equal(h.controller.fullSurah,null);
    assert.deepEqual(h.tracks.map(uri=>uri.split('/').at(-1)),['112002.mp3','112003.mp3']);
  } finally {await h.close();}
});

test('Stop while source resolution is pending cannot start playback afterward', async()=>{
  const h=await playerHarness();
  try {
    const original=h.fs.getInfoAsync;
    let release!: ()=>void;
    const wait=new Promise<void>(resolve=>{release=resolve;});
    h.fs.getInfoAsync=async uri=>{await wait;return original(uri);};
    let loading!: Promise<void>;
    await h.command(()=>{loading=h.controller.playSurah(112);});
    await h.command(()=>h.controller.stop());
    await h.command(async()=>{release();await loading;});
    assert.equal(h.plays,0);
    assert.equal(h.controller.status,'idle');
    assert.equal(h.controller.fullSurah,null);
    assert.equal(h.tracks.length,0);
  } finally {await h.close();}
});

test('upgrading older downloads fetches only the missing full recording and plays that local file', async()=>{
  const prefix='file:///private/quran-audio/ghamdi/112/';
  const h=await playerHarness([1,2,3,4].map(verse=>`${prefix}11200${verse}.mp3`));
  try {
    await h.command(()=>h.controller.downloadSurah(112));
    assert.deepEqual(h.requested,['https://cdn.mp3quran.net/audio/saad-ghamdi/r1/112.mp3']);
    assert.ok(h.files.has(`${prefix}surah.mp3`));
    await h.command(()=>h.controller.playSurah(112));
    assert.deepEqual(h.tracks,[`${prefix}surah.mp3`]);
  } finally {await h.close();}
});


test('source timings highlight and navigate ayahs within the same continuous recording', async()=>{
  const rows=[{ayah:1,start_time:6111,end_time:8358},{ayah:2,start_time:8358,end_time:10479},
    {ayah:3,start_time:10479,end_time:13251},{ayah:4,start_time:13251,end_time:16506}];
  const h=await playerHarness([],rows);
  try {
    await h.command(()=>h.controller.playSurah(112));
    await h.tick({playing:true,isLoaded:true,duration:17,currentTime:7});
    assert.equal(h.controller.currentVerseKey,'112:1');
    await h.command(()=>h.controller.nextVerse());
    assert.equal(h.time,8.358);
    assert.equal(h.controller.fullSurah,112);
    assert.equal(h.tracks.length,1);
    await h.tick({playing:true,currentTime:11});
    assert.equal(h.controller.currentVerseKey,'112:3');
    await h.command(()=>h.controller.previousVerse());
    assert.equal(h.time,8.358);
    assert.equal(h.tracks.length,1);
    await h.command(()=>h.controller.setSurahEnd('repeat'));
    assert.equal(h.tracks.length,1);
    await h.command(()=>h.controller.playRange(112,1,2));
    assert.equal(h.controller.fullSurah,null);
    await h.command(()=>h.controller.playSurah(112));
    assert.equal(h.controller.repeatRange,null);
    assert.equal(h.controller.fullSurah,112);
  } finally {await h.close();}
});
