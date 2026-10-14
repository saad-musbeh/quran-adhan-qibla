import { Text, useTextScale } from '../text-size';
import { bilingual, localizeCopy, message, isRTL, localeFor, type Language } from '../i18n';
import type { QuranTheme } from '../domain/quran-theme';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { decodeMushafPage } from '../domain/mushaf-compression';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { Verse } from '../domain/quran';
import { MUSHAF_PAGE_ASSETS } from '../data/mushaf-assets';
import { printedPageVerses, chapterNames, juzArabic } from '../domain/quran-reader';
import { mushafLabels, buildMushafDocument } from './mushaf-document';
import { MushafPageTurns } from '../domain/mushaf-page-turns';

type Props = {
  theme?:QuranTheme;
  page: number; asset: number; verses: readonly Verse[]; surahNames: string; juzName: string;
  language: Language; dark: boolean; activeKey: string | null; zoom?: number;
  pageStep?: 1 | 2;
  onTap: () => void; onPlayVerse: (key: string) => void; onPageSwipe: (delta: number, page: number) => void;
  loopPickMode?: 'start'|'end'|null; loopStartKey?:string|null; loopEndKey?:string|null; onLoopStart?:(key:string)=>void; onLoopEnd?:(key:string)=>void; onLoopPick?:(key:string)=>void;
  onTafsirVerse?: (key: string) => void; onBookmarkVerse?: (key: string) => void; bookmarkedKeys?: readonly string[];
};
const decodedPages = new Map<number, Promise<string>>();
let metadataFont: Promise<string> | undefined;
async function readAsset(module: number, base64 = false) {
  const asset = Asset.fromModule(module);
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error('Bundled Mushaf artwork unavailable');
  return FileSystem.readAsStringAsync(asset.localUri, { encoding: base64 ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8 });
}
export function preloadMushafPage(module: number): Promise<string> {
  let pending = decodedPages.get(module);
  if (!pending) {
    pending = readAsset(module, true).then(encoded => decodeMushafPage(Uint8Array.from(atob(encoded), character => character.charCodeAt(0))));
    pending.catch(() => { if (decodedPages.get(module) === pending) decodedPages.delete(module); });
  }
  decodedPages.delete(module); decodedPages.set(module, pending);
  while (decodedPages.size > 7) decodedPages.delete(decodedPages.keys().next().value!);
  return pending;
}
export function preloadMushafResources(module:number):Promise<{svg:string;font:string}> {
  if (!metadataFont) {
    metadataFont=readAsset(require('../../assets/quran/AmiriQuran.ttf'),true);
    metadataFont.catch(()=>{metadataFont=undefined;});
  }
  return Promise.all([preloadMushafPage(module),metadataFont]).then(([svg,font])=>({svg,font}));
}
function pageDescriptor(page: number) {
  const verses = printedPageVerses(page);
  return {page, asset:MUSHAF_PAGE_ASSETS[page], verses, surahNames:chapterNames(verses), juzName:juzArabic(verses[0]?.juz??1)};
}

export function MushafPageView(props: Props) {
  const textScale = useTextScale();
  const latestTextScale = useRef(textScale); latestTextScale.current = textScale;
  const web = useRef<WebView>(null);
  const latest = useRef(props); latest.current = props;
  const cached = useRef(new Set<number>());
  const turns = useRef(new MushafPageTurns(props.page,props.pageStep??1));
  const [html, setHtml] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const state = () => ({ textScale:latestTextScale.current, language:latest.current.language, ui:mushafLabels(latest.current.language), dark:latest.current.dark, theme:latest.current.theme, activeKey:latest.current.activeKey, bookmarkedKeys:latest.current.bookmarkedKeys??[],loopPickMode:latest.current.loopPickMode??null,loopStartKey:latest.current.loopStartKey??null,loopEndKey:latest.current.loopEndKey??null });
  useEffect(() => {
    let alive = true;
    const initial = latest.current;
    turns.current = new MushafPageTurns(initial.page,initial.pageStep??1);
    setError(false); setReady(false); setHtml(null); cached.current.clear();
    void (async () => {
      const {svg,font} = await preloadMushafResources(initial.asset);
      const companion = initial.pageStep === 2 ? {...pageDescriptor(initial.page + 1), svg:await preloadMushafPage(MUSHAF_PAGE_ASSETS[initial.page + 1])} : undefined;
      if (alive) setHtml(buildMushafDocument({...initial,companion,textScale:latestTextScale.current}, svg, font));
    })().catch(() => { if (alive) setError(true); });
    return () => { alive=false; };
  }, [attempt, props.pageStep]);
  useEffect(() => {
    // Balanced swipes may finish on the original prop without reloading pages.
    if (ready && props.page === turns.current.page) turns.current.request(props.page);
  });
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const page = props.page;
    const activate = () => {
      const sequence=turns.current.request(page);
      if(sequence!==null)web.current?.injectJavaScript(`window.activatePage(${page},${JSON.stringify(state())},true,${sequence});true;`);
    };
    const prepare = async (n: number) => {
      if (cached.current.has(n)) return;
      const info = n===page ? {...pageDescriptor(n),asset:props.asset,verses:props.verses,surahNames:props.surahNames,juzName:props.juzName} : pageDescriptor(n);
      const svg = await preloadMushafPage(info.asset);
      const companion = props.pageStep === 2 ? {...pageDescriptor(n + 1), svg:await preloadMushafPage(MUSHAF_PAGE_ASSETS[n + 1])} : undefined;
      if (!alive) return;
      web.current?.injectJavaScript(`window.cachePage(${JSON.stringify({...info,svg,companion})});true;`);
    };
    void (async () => {
      try {
        await prepare(page);
        if (!alive) return;
        activate();
      } catch { if (alive) setError(true); return; }
      const step=props.pageStep??1;
      for (const offset of [-step,step,-2*step,2*step]) {
        const n=page+offset;
        if (!alive) break;
        if (n<1||n>604) continue;
        try { await prepare(n); } catch { /* Neighbor failures never hide the current page. */ }
        // Let the current page paint and accept input between SVG preparations.
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    })();
    return () => { alive=false; };
  }, [ready, props.page, props.asset, props.pageStep]);
  useEffect(() => { if (ready) web.current?.injectJavaScript(`window.updateState(${JSON.stringify(state())});true;`); }, [ready, props.activeKey, props.bookmarkedKeys, props.language, props.dark, props.theme, props.loopPickMode, props.loopStartKey, props.loopEndKey, textScale]);
  useEffect(() => { if (ready) web.current?.injectJavaScript(`window.zoomPage(${props.zoom??1});true;`); }, [ready, props.zoom]);
  const message = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?:string; key?:string; delta?:number; page?:number; pages?:unknown; turn?:number };
      if (data.type==='ready') { setReady(true); return; }
      if (data.type==='cache' && Array.isArray(data.pages) && data.pages.length<=5 && data.pages.every(n=>Number.isInteger(n)&&n>=1&&n<=604)) {
        cached.current=new Set(data.pages as number[]); return;
      }
      const current=latest.current;
      if(data.type==='swipe'&&Number.isInteger(data.page)&&Number.isInteger(data.turn)&&(data.delta===1||data.delta===-1)){
        const target=turns.current.accept(data.page!,data.delta,data.turn!);
        if(target!==null)current.onPageSwipe(data.delta,target);
        return;
      }
      if (data.page!==current.page) return;
      if (data.type==='tap') current.onTap();
      else if (['play','tafsir','bookmark','loopstart','loopend','looppick'].includes(data.type??'') && [...current.verses,...(current.pageStep===2?printedPageVerses(current.page+1):[])].some(v=>`${v.surah}:${v.number}`===data.key)) {
        if(data.type==='play')current.onPlayVerse(data.key!);
        else if(data.type==='tafsir')current.onTafsirVerse?.(data.key!);
        else if(data.type==='bookmark')current.onBookmarkVerse?.(data.key!);
        else if(data.type==='loopstart')current.onLoopStart?.(data.key!);
        else if(data.type==='loopend')current.onLoopEnd?.(data.key!);
        else if(current.loopPickMode)current.onLoopPick?.(data.key!);
      }
    } catch { /* Ignore malformed or stale reader messages. */ }
  };
  const paper = props.dark ? (props.theme?.deep ?? '#14293C') : (props.theme?.lightPaper ?? '#FAF7EF');
  return <View style={[styles.root,{backgroundColor:paper}]}>
    {html ? <WebView testID="mushaf-page" key={attempt} ref={web} source={{html}} originWhitelist={['about:blank']} onShouldStartLoadWithRequest={r=>r.url==='about:blank'} onMessage={message} onLoadEnd={()=>web.current?.injectJavaScript(`requestAnimationFrame(()=>window.zoomPage(${latest.current.zoom??1}));true;`)} style={[styles.web,{backgroundColor:props.dark?(props.theme?.deep??'#14293C'):(props.theme?.lightPaper??'#FAF7EF')}]} scrollEnabled={(props.zoom??1)>1} bounces={false} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} allowFileAccess={false} allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false} setSupportMultipleWindows={false} onError={()=>setError(true)}/> : !error && <ActivityIndicator style={styles.loading} color="#BD8744"/>}
    {error && <Pressable accessibilityRole="button" onPress={()=>setAttempt(v=>v+1)} style={styles.retry}><Text style={styles.retryText}>{bilingual(props.language, 'تعذر فتح الصفحة. إعادة المحاولة', 'Could not open this page. Retry')}</Text></Pressable>}
  </View>;
}
const styles=StyleSheet.create({root:{flex:1,minHeight:0,overflow:'hidden',borderRadius:6},web:{flex:1},loading:{flex:1},retry:{position:'absolute',bottom:8,left:8,right:8,alignItems:'center',justifyContent:'center',padding:16,backgroundColor:'#FAF7EF',borderRadius:12},retryText:{color:'#18334A'}});
