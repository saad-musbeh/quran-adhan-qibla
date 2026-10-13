import { parseLocalizedInteger } from '../domain/localized-number';
import { bilingual, localizeCopy, message, isRTL, localeFor, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { getSurah, getVerse, surahs, verses, type Verse } from '../domain/quran';
import { normalizeQuranSearch, searchQuran } from '../domain/quran-search';
import { MushafPageView } from './MushafPageView';
import { TafsirSheet } from './TafsirSheet';
import { RepeatRangeSheet } from './RepeatRangeSheet';
import { VerseRangeIcon } from './VerseRangeIcon';
import { useVerseLoopPicker } from '../use-verse-loop-picker';
import { DownloadManager } from './DownloadManager';
import { useTafsirLibrary } from '../use-tafsir-library';
import { printedPageVerses, chapterNames, juzArabic } from '../domain/quran-reader';
import type { QuranBook } from '../domain/quran-books';
import { MUSHAF_PAGE_ASSETS } from '../data/mushaf-assets';
import { getMushafPageVerses, getMushafVersePage } from '../data/mushaf';
import { RECITERS, type QuranAudioController } from '../use-quran-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';

export type QuranReaderSettings = { fontSize: number; nightMode: boolean };
type Props = { tafsirLibrary: ReturnType<typeof useTafsirLibrary>; book: QuranBook; onBookChange:(change:(book:QuranBook)=>QuranBook)=>void; onCloseBook:()=>void; active?: boolean; language: Language; audio: QuranAudioController; settings: QuranReaderSettings; onSettingsChange?:(settings:QuranReaderSettings)=>void; onReadingChromeChange?:(visible:boolean)=>void };
type Picker = 'surah' | 'juz' | 'page' | 'search' | 'bookmarks' | null;
const PAGE_COUNT = 604;
const labels = {
  ar: { page:'الصفحة', pagePart:'الجزء المعروض', previous:'السابق', next:'التالي', previousPage:'الصفحة السابقة', nextPage:'الصفحة التالية', bookmark:'إضافة إشارة مرجعية', saved:'إزالة الإشارة المرجعية', openBook:'فتح المصحف', bookTitle:'قراءة المصحف', surah:'السورة', juz:'الجزء', search:'بحث في القرآن', bookmarks:'الإشارات المرجعية', close:'إغلاق', choose:'اختر', empty:'لا توجد نتائج', play:'تشغيل', pause:'إيقاف مؤقت', audioControls:'أدوات التلاوة', prevVerse:'الآية السابقة', nextVerse:'الآية التالية', replay:'إعادة الآية', stop:'إيقاف', reciter:'القارئ', speed:'سرعة التلاوة', repeat:'تكرار نطاق الآيات', font:'حجم النص المكبّر', autoFit:'يُضبط النص تلقائياً ليلائم الصفحة؛ كبّر النص لقراءته عن قرب.', decreaseFont:'تصغير الخط', increaseFont:'تكبير الخط', night:'الوضع الليلي', downloads:'تنزيل السور للاستماع دون اتصال', download:'تنزيل', delete:'حذف التنزيل', confirmDelete:'هل تريد حذف التسجيل المحفوظ لهذه السورة؟', cancel:'إلغاء التنزيل', online:'التنزيل يحتاج إلى اتصال بالإنترنت.', offline:'لا يوجد اتصال. التنزيلات المحفوظة متاحة دون اتصال.', progress:'التنزيل جارٍ', range:'النطاق: سورة، من آية إلى آية', from:'من', to:'إلى', apply:'تطبيق', clear:'مسح التكرار', listening:'استمع إلى القرآن', unknown:'البيانات الصوتية غير متاحة حالياً', pageOf:'من', invalidRange:'تحقق من رقم السورة ونطاق الآيات.', activeRange:'نطاق التكرار النشط', retry:'إعادة المحاولة', attribution:'نص القرآن: تنزيل — tanzil.net', audioAttribution:'التلاوات الصوتية: EveryAyah', downloadFailed:'تعذر تنزيل السورة.', deleteFailed:'تعذر حذف التنزيل.', playbackFailed:'تعذّر تشغيل التلاوة.', retryConnection:'تحقق من الاتصال وحاول مجدداً.' },
  en: { page:'Page', pagePart:'Displayed part', previous:'Previous part', next:'Next part', previousPage:'Previous page', nextPage:'Next page', bookmark:'Bookmark this page', saved:'Remove bookmark', openBook:'Open book reader', bookTitle:'Quran reading', close:'Close', surah:'Surah', juz:'Juz', search:'Search the Quran', bookmarks:'Bookmarks', choose:'Choose', empty:'No results', play:'Play', pause:'Pause', audioControls:'Audio controls', prevVerse:'Previous verse', nextVerse:'Next verse', replay:'Replay verse', stop:'Stop', reciter:'Reciter', speed:'Recitation speed', repeat:'Repeat verse range', font:'Zoomed text size', autoFit:'Page text fits automatically; increase zoom to inspect it.', decreaseFont:'Decrease text size', increaseFont:'Increase text size', night:'Night reading', downloads:'Download surahs for offline listening', download:'Download', delete:'Delete download', confirmDelete:'Delete the saved audio for this surah?', cancel:'Cancel download', online:'Downloads require an internet connection.', offline:'You are offline. Saved downloads remain available.', progress:'Downloading', range:'Range: surah, from verse to verse', from:'From', to:'To', apply:'Apply', clear:'Clear repeat', listening:'Listen to the Quran', unknown:'Audio data is temporarily unavailable', pageOf:'of', invalidRange:'Check the surah and verse range.', activeRange:'Active repeat range', retry:'Retry', attribution:'Quran text: Tanzil — tanzil.net', audioAttribution:'Recitations: EveryAyah', downloadFailed:'Could not download this surah.', deleteFailed:'Could not delete this download.', playbackFailed:'Could not play this recitation.', retryConnection:'Check your connection and try again.' },
};

export function QuranScreen({ tafsirLibrary, book, onBookChange, onCloseBook, active: readerActive = true, language, audio, settings, onSettingsChange, onReadingChromeChange }: Props) { const {colors,styles}=useReaderStyles(baseStyles);
  const [quranFontLoaded] = useFonts({ AmiriQuran: require('../../assets/quran/AmiriQuran.ttf') });
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const c = localizeCopy(language, labels); const rtl = isRTL(language);
  const {page,bookmarks,verseBookmarks}=book;
  const setPage=(page:number)=>onBookChange(book=>({...book,page}));
  const setBookmarks=(change:(values:number[])=>number[])=>onBookChange(book=>({...book,bookmarks:change(book.bookmarks)}));
  const setVerseBookmarks=(change:(values:string[])=>string[])=>onBookChange(book=>({...book,verseBookmarks:change(book.verseBookmarks)}));
  const [bookVisible,setBookVisible]=useState(false); const [audioVisible,setAudioVisible]=useState(false);
  const [chromeVisible,setChromeVisible]=useState(false);
  const [lastInteraction, setLastInteraction] = useState(0);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [readerSize, setReaderSize] = useState({ width: windowWidth, height: windowHeight });
  const [picker, setPicker] = useState<Picker>(null);
  const [query, setQuery] = useState('');
  const [tafsirKey, setTafsirKey] = useState<string | null>(null);
  const loop = useVerseLoopPicker(language,audio);
  const versesOnPage = useMemo(() => printedPageVerses(page), [page]);
  const active = parseVerseKey(audio.currentVerseKey);
  const pageChapterNames = chapterNames(versesOnPage);
  const dark = settings.nightMode;
  useEffect(()=>{if(!readerActive)return;const back=BackHandler.addEventListener('hardwareBackPress',()=>{onCloseBook();return true});return()=>back.remove();},[readerActive,onCloseBook]);
  useEffect(() => { if (!readerActive) setChromeVisible(false); }, [readerActive]);
  useEffect(()=>{if(loop.pickMode)setChromeVisible(false)},[loop.pickMode]);
  useEffect(() => { onReadingChromeChange?.(chromeVisible); }, [chromeVisible, onReadingChromeChange]);
  useEffect(() => { onReadingChromeChange?.(false); return () => onReadingChromeChange?.(false); }, []);
  useEffect(() => {
    let alive = true;
    const update = (enabled: boolean) => { if (alive) { setScreenReaderEnabled(enabled); if (enabled) setChromeVisible(true); } };
    void AccessibilityInfo.isScreenReaderEnabled().then(update);
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', update);
    return () => { alive = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (!chromeVisible || screenReaderEnabled || picker || audioVisible || bookVisible || loop.visible) return;
    const timer = setTimeout(() => setChromeVisible(false), 6000);
    return () => clearTimeout(timer);
  }, [chromeVisible, screenReaderEnabled, lastInteraction, picker, audioVisible, bookVisible, loop.visible]);
  useEffect(() => {
    if (readerActive && !bookVisible && !loop.pickMode && active && audio.status === 'playing') {
      const playingVerse = getVerse(active.surah, active.verse);
      if (playingVerse) {
        const target = getMushafVersePage(playingVerse.surah, playingVerse.number);
        if (target && !getMushafPageVerses(page).includes(audio.currentVerseKey!)) setPage(target);
      }
    }
  }, [audio.currentVerseKey, audio.status]);
  const toggleVerseBookmark = (key: string) => setVerseBookmarks(values => values.includes(key) ? values.filter(value => value !== key) : [...values, key]);
  const go = (n: number) => setPage(Math.min(PAGE_COUNT, Math.max(1, n)));
  const toggleBookmark = (targetPage=page) => setBookmarks(xs => xs.includes(targetPage) ? xs.filter(x => x !== targetPage) : [...xs, targetPage].sort((a,b) => a-b));
  const onSelectVerse = (v: Verse) => { void audio.playVerse(v.surah, v.number); };
  const setPickerAndReset = (value: Picker) => { setQuery(''); setPicker(value); };
  const pageHeight = Math.max(1, Math.min(readerSize.height - 8, (readerSize.width - 4) / 0.644));
  const pageWidth = Math.min(readerSize.width - 4, pageHeight * 0.644);
  return <View testID="quran-reader" style={[styles.immersiveRoot,{backgroundColor:colors.appBackground}]} onTouchStart={() => setLastInteraction(Date.now())}>
    <View style={styles.immersiveSpread} onLayout={event => {
      const { width, height } = event.nativeEvent.layout;
      setReaderSize(current => current.width === width && current.height === height ? current : { width, height });
    }}>
      <View style={[styles.immersivePaperFrame, { width: pageWidth, height: pageHeight }]}>
        <MushafPageView theme={colors} {...loopPageProps(loop,audio)} page={page} asset={MUSHAF_PAGE_ASSETS[page]} verses={versesOnPage} surahNames={pageChapterNames} juzName={juzArabic(versesOnPage[0]?.juz??1)} language={language} dark={dark} activeKey={audio.currentVerseKey} bookmarkedKeys={verseBookmarks} onTafsirVerse={key=>{tafsirLibrary.openLibrary();setChromeVisible(false);setTafsirKey(key);}} onBookmarkVerse={toggleVerseBookmark} onTap={()=>{if(!loop.pickMode)setChromeVisible(value=>!value)}} onPlayVerse={key=>playKey(audio,key)} onPageSwipe={(_delta,target)=>{go(target);setChromeVisible(false);}}/>
      </View>
    <VerseLoopPrompt loop={loop} language={language}/>
    {chromeVisible&&!loop.pickMode&&<View pointerEvents="box-none" style={styles.chromeLayer}>
      <View style={[styles.immersiveTopControls,rtl&&styles.reverse]}>
        <Pressable accessibilityRole="button" testID="reader-library" accessibilityLabel={bilingual(language,"العودة إلى مكتبتي القرآنية","Back to my Quran library")} style={styles.chromeButton} onPress={onCloseBook}><Ionicons name="library-outline" size={22} color={colors.accent}/></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={c.bookmarks} style={styles.chromeButton} onPress={()=>setPickerAndReset('bookmarks')}><Ionicons name="bookmark-outline" size={23} color={colors.lightPaper}/></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={c.search} style={styles.immersiveSearch} onPress={()=>setPickerAndReset('search')}><Ionicons name="search" size={19} color={colors.accent}/><Text style={[styles.immersiveSearchLabel,rtl&&styles.rtl]}>{c.search}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={c.surah} style={styles.chromeButton} onPress={()=>setPickerAndReset('surah')}><Ionicons name="list" size={24} color={colors.lightPaper}/></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={c.juz} style={styles.chromeButton} onPress={()=>setPickerAndReset('juz')}><Text style={styles.chromeJuz}>جزء</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={screenReaderEnabled?(bilingual(language, 'إخفاء أدوات القراءة', 'Hide reader tools')):c.night} style={styles.chromeButton} onPress={()=>screenReaderEnabled?setChromeVisible(false):onSettingsChange?.({...settings,nightMode:!dark})}><Ionicons name={screenReaderEnabled?'close':dark?'sunny':'moon'} size={23} color={colors.lightPaper}/></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={c.openBook} style={styles.chromeButton} onPress={()=>setBookVisible(true)}><Ionicons name="book-outline" size={21} color={colors.lightPaper}/></Pressable>
      </View>
      <View style={[styles.immersiveBottomControls,rtl&&styles.reverse]}>
        <Pressable accessibilityRole="button" accessibilityLabel={c.previousPage} disabled={page<=1} style={styles.chromeButton} onPress={()=>go(page-1)}><Ionicons name={rtl?'chevron-forward':'chevron-back'} size={23} color={colors.lightPaper}/></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${c.page} ${page}`} style={styles.chromePage} onPress={()=>setPickerAndReset('page')}><Text testID="reader-page-number" style={styles.chromePageText}>{localDigits(page,language)} / {localDigits(PAGE_COUNT,language)}</Text></Pressable>
        <Pressable accessibilityRole="button" testID="reader-next-page" accessibilityLabel={c.nextPage} disabled={page>=PAGE_COUNT} style={styles.chromeButton} onPress={()=>go(page+1)}><Ionicons name={rtl?'chevron-back':'chevron-forward'} size={23} color={colors.lightPaper}/></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={c.bookmark} accessibilityState={{selected:bookmarks.includes(page)}} style={styles.chromeButton} onPress={()=>toggleBookmark()}><Ionicons name={bookmarks.includes(page)?'bookmark':'bookmark-outline'} size={22} color={colors.accent}/></Pressable>
      </View>
    </View>}
    </View>
    <ReaderAudioBar language={language} audio={audio} part={versesOnPage} onOpen={()=>setAudioVisible(true)} onRepeat={loop.open}/>
    <ReaderPicker language={language} visible={picker !== null} type={picker} query={query} setQuery={setQuery} page={page} quranFontLoaded={quranFontLoaded} onClose={() => setPicker(null)} onChoosePage={go} onChooseSurah={n => go(getMushafVersePage(n,1) ?? 1)} onChooseVerse={v => { go(getMushafVersePage(v.surah,v.number) ?? 1); onSelectVerse(v); }} bookmarks={bookmarks} verseBookmarks={verseBookmarks} onChooseBookmark={v=>go(getMushafVersePage(v.surah,v.number)??1)} onRemoveVerseBookmark={toggleVerseBookmark} />
    <TafsirSheet library={tafsirLibrary} verseKey={tafsirKey} language={language} dark={dark} quranFontLoaded={quranFontLoaded} onClose={()=>setTafsirKey(null)}/>
    <RepeatRangeSheet initialRange={loop.initialRange} onChooseOnPage={loop.beginPicking} visible={!bookVisible&&loop.visible} language={language} audio={audio} initialVerseKey={audio.currentVerseKey??(versesOnPage[0]?`${versesOnPage[0].surah}:${versesOnPage[0].number}`:null)} onClose={loop.close}/>
    <AudioDock language={language} audio={audio} part={versesOnPage} visible={audioVisible} onClose={()=>setAudioVisible(false)} />
    <BookReaderModal loop={loop} tafsirLibrary={tafsirLibrary} language={language} visible={bookVisible} page={page} bookmarks={bookmarks} settings={settings} audio={audio} onClose={()=>setBookVisible(false)} onNavigate={setPage} onToggleBookmark={toggleBookmark} verseBookmarks={verseBookmarks} onToggleVerseBookmark={toggleVerseBookmark} quranFontLoaded={quranFontLoaded} />
  </View>;
}

function ReaderAudioBar({language,audio,part,onOpen,onRepeat}:{language:Language;audio:QuranAudioController;part:readonly Verse[];onOpen:()=>void;onRepeat:()=>void}) {
 const {colors,styles}=useReaderStyles(baseStyles);
 const c=localizeCopy(language,labels), rtl=isRTL(language);
 const current=parseVerseKey(audio.currentVerseKey), shown=(current?getVerse(current.surah,current.verse):undefined)??part[0];
 const playing=audio.status==='playing'||audio.status==='loading';
 const invoke=(fn:()=>void|Promise<void>)=>{try{void Promise.resolve(fn()).catch(()=>undefined);}catch{/* The controller reports playback errors. */}};
 return <View testID="reader-audio-bar" style={styles.readerAudioBar}>
  <View style={[styles.readerAudioMeta,rtl&&styles.reverse]}>
   <Text testID="reader-audio-reference" numberOfLines={1} style={[styles.audioMeta,styles.flex,rtl&&styles.rtl]}>{audio.error?localizePlaybackError(audio.error,c):audio.status==='loading'?bilingual(language,'جارٍ تحميل التلاوة…','Buffering recitation…'):shown?`${getSurah(shown.surah)?.arabicName} · ${localDigits(shown.number,language)}`:c.listening}</Text>
   <Text testID="reader-audio-time" style={styles.audioMeta}>{formatTime(audio.currentTime)} / {formatTime(audio.duration)}</Text>
  </View>
  <View style={[styles.audioControls,rtl&&styles.reverse]}>
   <AudioButton compact testID="reader-audio-previous" label={c.prevVerse} icon={rtl?'play-skip-forward':'play-skip-back'} disabled={!current||(!audio.repeatRange&&current.surah===1&&current.verse===1)} onPress={()=>invoke(audio.previousVerse)}/>
   <AudioButton compact testID="reader-audio-replay" label={c.replay} icon="refresh" onPress={()=>shown&&invoke(()=>current?audio.replayVerse():audio.playVerse(shown.surah,shown.number))}/>
   <AudioButton compact testID="reader-audio-play-pause" label={playing?c.pause:audio.status==='error'?c.retry:c.play} icon={playing?'pause':'play'} primary onPress={()=>togglePagePlayback(audio,part)}/>
   <AudioButton compact testID="reader-audio-next" label={c.nextVerse} icon={rtl?'play-skip-back':'play-skip-forward'} disabled={!current} onPress={()=>invoke(audio.nextVerse)}/>
   <AudioButton compact testID="reader-audio-stop" label={c.stop} icon="stop" disabled={!current} onPress={audio.stop}/>
   <Pressable accessibilityRole="button" testID="reader-audio-repeat" accessibilityLabel={c.repeat} accessibilityState={{selected:Boolean(audio.repeatRange)}} style={styles.chromeButton} onPress={onRepeat}><VerseRangeIcon color={audio.repeatRange?colors.accent:colors.lightPaper}/></Pressable>
   <AudioButton compact testID="reader-audio-controls" label={c.audioControls} icon="ellipsis-horizontal" onPress={onOpen}/>
  </View>
 </View>;
}


type VerseLoopController = ReturnType<typeof useVerseLoopPicker>;
function loopPageProps(loop:VerseLoopController,audio:QuranAudioController){
 return {loopPickMode:loop.pickMode,loopStartKey:loop.startKey??(audio.repeatRange?`${audio.repeatRange.surah}:${audio.repeatRange.start}`:null),loopEndKey:loop.startKey?loop.endKey:(audio.repeatRange?`${audio.repeatRange.surah}:${audio.repeatRange.end}`:null),onLoopStart:loop.startAt,onLoopEnd:loop.endAt,onLoopPick:loop.pick};
}
function VerseLoopPrompt({loop,language,book=false}:{loop:VerseLoopController;language:Language;book?:boolean}){ const {colors,styles}=useReaderStyles(baseStyles);
 if(!loop.pickMode)return null;
 const ar=isRTL(language);const first=loop.startKey?.split(':').map(Number);
 const title=bilingual(language, (loop.pickMode==='start'?'اضغط على آية البداية':'اضغط على آية النهاية إن أردت'), (loop.pickMode==='start'?'Tap the starting ayah':'Tap an ending ayah to shorten the loop'));
 return <View style={[styles.loopPrompt,{top:book?64:12}]}>
  <View style={{flex:1,gap:3}}><Text accessibilityLiveRegion="polite" style={[styles.loopPromptText,ar&&styles.rtl]}>{title}</Text>{first?<Text style={[styles.loopPromptReference,ar&&styles.rtl]}>{getSurah(first[0])?.arabicName} · {localDigits(first[1],language)}</Text>:null}</View>
  <Pressable accessibilityRole="button" accessibilityLabel={loop.pickMode==='end'?(bilingual(language, 'استخدام نهاية السورة', 'Use end of surah')):(bilingual(language, 'إلغاء اختيار الآيات', 'Cancel ayah selection'))} onPress={loop.cancel} style={[styles.chromeButton,loop.pickMode==='end'&&{width:104}]}>{loop.pickMode==='end'?<Text style={{color:colors.ink,fontWeight:'600',fontSize:13}}>{bilingual(language, 'نهاية السورة', 'Surah end')}</Text>:<Ionicons name="close" size={22} color={colors.ink}/>}</Pressable>
 </View>;
}

type PickerProps = { language: Language; visible: boolean; type: Picker; query: string; setQuery: (s:string)=>void; page:number; quranFontLoaded:boolean; onClose:()=>void; onChoosePage:(n:number)=>void; onChooseSurah:(n:number)=>void; onChooseVerse:(v:Verse)=>void; bookmarks:number[]; verseBookmarks:string[]; onChooseBookmark:(v:Verse)=>void; onRemoveVerseBookmark:(key:string)=>void };
function ReaderPicker({ language, visible, type, query, setQuery, page, quranFontLoaded, onClose, onChoosePage, onChooseSurah, onChooseVerse, bookmarks, verseBookmarks, onChooseBookmark, onRemoveVerseBookmark }: PickerProps) { const {colors,styles}=useReaderStyles(baseStyles);
  const c=localizeCopy(language, labels); const rtl=isRTL(language); const [number,setNumber]=useState('1'); const insets=useSafeAreaInsets();
  useEffect(()=>{setNumber(type==='page'?String(page):'1');},[type,page]);
  const normalizedQuery=normalizeQuranSearch(query);
  const filteredSurahs = surahs.filter(s => normalizeQuranSearch(`${s.arabicName} ${s.englishName} ${s.transliteration}`).includes(normalizedQuery));
  const results = type==='search' ? searchQuran(query,verses,surahs,40) : [];
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={[styles.modalRoot,{paddingTop:insets.top,paddingBottom:insets.bottom}]}>
      <View style={[styles.modalHeader,rtl&&styles.reverse]}><Text style={styles.modalTitle}>{type==='surah'?c.surah:type==='juz'?'الجزء / Juz':type==='page'?c.page:type==='search'?c.search:c.bookmarks}</Text><Pressable accessibilityRole="button" accessibilityLabel={c.close} style={styles.close} onPress={onClose}><Text style={styles.gold}>×</Text></Pressable></View>
      {(type==='search'||type==='surah') && <TextInput value={query} onChangeText={setQuery} placeholder={c.search} placeholderTextColor="#BCD0DF" style={[styles.search,rtl&&styles.rtl]} autoFocus={type==='search'} />}
      {(type==='page'||type==='juz') && <View style={[styles.numberRow,rtl&&styles.reverse]}><TextInput value={number} onChangeText={setNumber} keyboardType="number-pad" style={styles.numberInput} /><Pressable accessibilityRole="button" style={styles.chooseButton} onPress={()=>{const n=parseLocalizedInteger(number);if(n!==null){ if(type==='page')onChoosePage(n);else {const verse=verses.find(v=>v.juz===n);if(verse)onChoosePage(getMushafVersePage(verse.surah,verse.number) ?? 1);} onClose();}}}><Text style={styles.chooseText}>{c.choose}</Text></Pressable></View>}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
        {type==='surah'&&filteredSurahs.map(s=><Pressable key={s.number} style={[styles.listItem,rtl&&styles.reverse]} onPress={()=>{onChooseSurah(s.number);onClose();}}><Text style={styles.listMain}>{s.arabicName}</Text><Text style={styles.listSub}>{s.number}</Text></Pressable>)}
        {type==='search'&&results.map(v=><VerseRow key={`${v.surah}:${v.number}`} v={v} language={language} quranFontLoaded={quranFontLoaded} onPress={()=>{onChooseVerse(v);onClose();}}/>)}
        {type==='bookmarks'&&verseBookmarks.map(key=>{const [s,a]=key.split(':').map(Number);const verse=getVerse(s,a);return verse?<View key={key} style={[styles.verseBookmarkRow,rtl&&styles.reverse]}><View style={styles.flex}><VerseRow v={verse} language={language} quranFontLoaded={quranFontLoaded} onPress={()=>{onChooseBookmark(verse);onClose();}}/></View><Pressable accessibilityRole="button" accessibilityLabel={bilingual(language, 'إزالة إشارة الآية', 'Remove verse bookmark')} style={styles.close} onPress={()=>onRemoveVerseBookmark(key)}><Ionicons name="bookmark" size={22} color={colors.accent}/></Pressable></View>:null;})}
        {type==='bookmarks'&&!bookmarks.length&&!verseBookmarks.length&&<Text style={styles.note}>{bilingual(language, 'لا توجد إشارات مرجعية بعد', 'No bookmarks yet')}</Text>}
        {type==='bookmarks'&&bookmarks.map(n=><Pressable key={n} style={styles.listItem} onPress={()=>{onChoosePage(n);onClose();}}><Text style={styles.listMain}>{c.page} {n}</Text></Pressable>)}
        {type==='juz'&&Array.from({length:30},(_,i)=><Pressable key={i} style={styles.listItem} onPress={()=>{const v=verses.find(x=>x.juz===i+1);if(v)onChoosePage(getMushafVersePage(v.surah,v.number) ?? 1);onClose();}}><Text style={styles.listMain}>{c.juz} {i+1}</Text></Pressable>)}
        {((type==='search'&&query.trim()&&!results.length)||(type==='surah'&&query&&!filteredSurahs.length))&&<Text style={styles.note}>{c.empty}</Text>}
      </ScrollView>
    </View>
  </Modal>;
}
function VerseRow({v,language,quranFontLoaded,onPress}:{v:Verse;language:Language;quranFontLoaded:boolean;onPress:()=>void}) { const {colors,styles}=useReaderStyles(baseStyles); const s=getSurah(v.surah);return <Pressable style={styles.listItem} onPress={onPress}><Text style={[styles.listMain,quranFontLoaded&&styles.quranSearchText]} numberOfLines={2}>{v.text}</Text><Text style={styles.listSub}>{s?.arabicName} · {v.number}</Text></Pressable>; }

function AudioDock({language,audio,part,visible,onClose}:{language:Language;audio:QuranAudioController;part:readonly Verse[];visible:boolean;onClose:()=>void}) {
 const {colors,styles}=useReaderStyles(baseStyles);
 const [choosingReciter,setChoosingReciter]=useState(false);
 const c=localizeCopy(language, labels), rtl=isRTL(language), insets=useSafeAreaInsets();
 const current=parseVerseKey(audio.currentVerseKey);
 const shown=(current?getVerse(current.surah,current.verse):undefined)??part[0];
 const playing=audio.status==='playing'||audio.status==='loading';
 const reciter=RECITERS.find(r=>r.id===audio.reciter)!;
 const invoke=(fn:()=>void|Promise<void>)=>{try{void Promise.resolve(fn()).catch(()=>undefined);}catch{/* The controller reports playback errors. */}};
 useEffect(()=>{if(!visible)setChoosingReciter(false)},[visible]);
 return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
   <View accessibilityViewIsModal style={[styles.audioOverlay,{paddingTop:insets.top,paddingBottom:Math.max(12,insets.bottom)}]}>
    <Pressable accessibilityRole="button" accessibilityLabel={c.close} style={StyleSheet.absoluteFill} onPress={onClose}/>
    <View style={styles.audioPanel}>
     <View style={[styles.modalHeader,rtl&&styles.reverse]}>
      <Text style={[styles.modalTitle,{flex:1}]}>{shown?`${getSurah(shown.surah)?.arabicName} · ${localDigits(shown.number,language)}`:c.listening}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={c.close} style={styles.close} onPress={onClose}><Ionicons name="close" color={colors.accent} size={25}/></Pressable>
     </View>
     <Pressable accessibilityRole="button" accessibilityLabel={`${c.reciter}: ${rtl?reciter.arabicName:reciter.name}`} accessibilityState={{expanded:choosingReciter}} onPress={()=>setChoosingReciter(v=>!v)} style={[styles.reciterPicker,rtl&&styles.reverse]}>
      <Ionicons name="mic-outline" size={20} color={colors.accent}/>
      <View style={styles.flex}><Text style={[styles.settingNote,rtl&&styles.rtl]}>{c.reciter}</Text><Text style={[styles.settingText,rtl&&styles.rtl]}>{rtl?reciter.arabicName:reciter.name}</Text></View>
      <Ionicons name={choosingReciter?'chevron-up':'chevron-down'} size={19} color={colors.accent}/>
     </Pressable>
     {choosingReciter&&<ScrollView style={styles.reciterList} contentContainerStyle={{gap:6,paddingVertical:8}}>
      <ReciterChoices language={language} audio={audio} onChoose={()=>setChoosingReciter(false)}/>
     </ScrollView>}
     <View style={[styles.audioControls,rtl&&styles.reverse]}>
      <AudioButton testID="audio-previous" label={c.prevVerse} icon={rtl?'play-skip-forward':'play-skip-back'} disabled={!current||(!audio.repeatRange&&current.surah===1&&current.verse===1)} onPress={()=>invoke(audio.previousVerse)}/>
      <AudioButton testID="audio-replay" label={c.replay} icon="refresh" onPress={()=>shown&&invoke(()=>current?audio.replayVerse():audio.playVerse(shown.surah,shown.number))}/>
      <AudioButton testID="audio-play-pause" label={playing?c.pause:c.play} icon={playing?'pause':'play'} primary onPress={()=>togglePagePlayback(audio,part)}/>
      <AudioButton testID="audio-next" label={c.nextVerse} icon={rtl?'play-skip-back':'play-skip-forward'} disabled={!current} onPress={()=>invoke(audio.nextVerse)}/>
      <AudioButton testID="audio-stop" label={c.stop} icon="stop" disabled={!current} onPress={audio.stop}/>
     </View>
     <View style={[styles.audioMetaRow,rtl&&styles.reverse]}>
      <Text testID="audio-time" style={[styles.audioMeta,styles.flex]}>{formatTime(audio.currentTime)} / {formatTime(audio.duration)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${c.speed}: ${audio.playbackRate}×`} style={styles.audioRetry} onPress={()=>{const rates=[0.75,1,1.25,1.5,2];audio.setPlaybackRate(rates[(rates.indexOf(audio.playbackRate)+1)%rates.length]);}}><Text style={styles.audioRetryText}>{audio.playbackRate}×</Text></Pressable>
     </View>
     <Text testID="audio-status" accessibilityLiveRegion="polite" style={styles.audioMeta}>{audio.status==='loading'?bilingual(language,'جارٍ تحميل التلاوة…','Buffering recitation…'):audio.status==='playing'?bilingual(language,'جارٍ التشغيل','Playing'):audio.status==='paused'?bilingual(language,'متوقف مؤقتًا','Paused'):audio.status==='error'?bilingual(language,'تعذّر التشغيل','Playback failed'):bilingual(language,'اختر تشغيل للاستماع','Tap Play to listen')}</Text>
     {!audio.isOnline&&<Text style={styles.audioMeta}>{c.offline}</Text>}
     {audio.error&&<View style={[styles.audioMetaRow,rtl&&styles.reverse]}><Text accessibilityRole="alert" style={[styles.audioMeta,styles.audioError]}>{localizePlaybackError(audio.error,c)}</Text><Pressable accessibilityRole="button" accessibilityLabel={c.retry} style={styles.audioRetry} onPress={()=>invoke(audio.retryPlayback)}><Text style={styles.audioRetryText}>{c.retry}</Text></Pressable></View>}
    </View>
   </View>
 </Modal>;
}
function AudioButton({testID,label,icon,onPress,primary,disabled=false,compact=false}:{testID?:string;label:string;icon:React.ComponentProps<typeof Ionicons>['name'];onPress:()=>void;primary?:boolean;disabled?:boolean;compact?:boolean}) {
 const {colors,styles}=useReaderStyles(baseStyles);
 return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[styles.audioButton,compact&&styles.audioCompact,primary&&styles.audioPrimary,disabled&&styles.disabled]}>
  <Ionicons name={icon} size={23} color={primary?colors.deep:colors.lightPaper}/>
  {!compact&&<Text numberOfLines={2} style={[styles.audioButtonText,primary&&styles.audioPrimaryText]}>{label}</Text>}
 </Pressable>;
}
function ReciterChoices({language,audio,onChoose}:{language:Language;audio:QuranAudioController;onChoose?:()=>void}) {
 const {colors,styles}=useReaderStyles(baseStyles), rtl=isRTL(language);
 const [query,setQuery]=useState('');
 const match=normalizeQuranSearch(query).toLocaleLowerCase();
 const voices=RECITERS.filter(reader=>normalizeQuranSearch(`${reader.name} ${reader.arabicName}`).toLocaleLowerCase().includes(match));
 const searchLabel=bilingual(language,'بحث عن قارئ','Search reciters');
 return <View style={{gap:8}}>
  <TextInput accessibilityLabel={searchLabel} value={query} onChangeText={setQuery} placeholder={searchLabel} placeholderTextColor={colors.appMuted} autoCorrect={false} style={[styles.rangeInput,rtl&&styles.rtl]}/>
  {voices.map(r=><Pressable key={r.id} testID={`reciter-${r.id}`} accessibilityRole="radio" accessibilityLabel={rtl?r.arabicName:r.name} accessibilityState={{checked:audio.reciter===r.id}} style={[styles.settingChoice,audio.reciter===r.id&&styles.selected,rtl&&styles.reverse]} onPress={()=>{audio.setReciter(r.id);onChoose?.();}}><Text style={[styles.settingText,{flex:1}]}>{rtl?r.arabicName:r.name}</Text><Ionicons name={audio.reciter===r.id?'radio-button-on':'radio-button-off'} color={colors.accent} size={20}/></Pressable>)}
  {!voices.length&&<Text style={styles.settingNote}>{bilingual(language,'لا يوجد قارئ مطابق','No matching reciter')}</Text>}
 </View>;
}

type BookReaderProps={loop:ReturnType<typeof useVerseLoopPicker>;tafsirLibrary:ReturnType<typeof useTafsirLibrary>;language:Language;visible:boolean;page:number;bookmarks:number[];settings:QuranReaderSettings;audio:QuranAudioController;onClose:()=>void;onNavigate:(page:number)=>void;onToggleBookmark:(page?:number)=>void;verseBookmarks:string[];onToggleVerseBookmark:(key:string)=>void;quranFontLoaded:boolean};
function BookReaderModal({loop,tafsirLibrary,language,visible,page,bookmarks,settings,audio,onClose,onNavigate,onToggleBookmark,verseBookmarks,onToggleVerseBookmark,quranFontLoaded}:BookReaderProps){ const {colors,styles}=useReaderStyles(baseStyles);
 const c=localizeCopy(language, labels),rtl=isRTL(language),insets=useSafeAreaInsets();
 const [bookPage,setBookPage]=useState(page),[zoom,setZoom]=useState(1);
 const [tafsirKey,setTafsirKey]=useState<string|null>(null);
 const wasVisible=useRef(false); const pageVerses=useMemo(()=>printedPageVerses(bookPage),[bookPage]);
 const active=parseVerseKey(audio.currentVerseKey);
 const {width:bookWidth,height:bookHeight}=useWindowDimensions();
 useEffect(()=>{if(visible&&!wasVisible.current){setBookPage(page);setZoom(Math.max(1,settings.fontSize/22));}wasVisible.current=visible;},[visible]);
 useEffect(()=>{if(!visible||loop.pickMode||!active||audio.status!=='playing')return;const verse=getVerse(active.surah,active.verse);if(verse&&!getMushafPageVerses(bookPage).includes(audio.currentVerseKey!)){const target=getMushafVersePage(verse.surah,verse.number);if(target){setBookPage(target);onNavigate(target);}}},[visible,audio.currentVerseKey,audio.status,bookPage]);
 const previous=()=>{if(bookPage>1){setBookPage(bookPage-1);onNavigate(bookPage-1);}};
 const next=()=>{if(bookPage<PAGE_COUNT){setBookPage(bookPage+1);onNavigate(bookPage+1);}};
 const close=()=>{setTafsirKey(null);loop.close();onNavigate(bookPage);onClose();};
 const zoomIn=()=>setZoom(value=>Math.min(3,value+.25));
 const zoomOut=()=>setZoom(value=>Math.max(1,value-.25));
 return <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={close}>
  <View style={[styles.bookRoot,{paddingTop:insets.top,paddingBottom:insets.bottom}]}>
   <View style={[styles.bookHeader,rtl&&styles.reverse]}><Text style={styles.bookTitle}>{c.bookTitle}</Text><View style={[styles.bookActions,rtl&&styles.reverse]}><Pressable accessibilityRole="button" accessibilityLabel={c.decreaseFont} style={styles.bookPageButton} disabled={zoom<=1} onPress={zoomOut}><Text style={styles.settingText}>−</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={c.increaseFont} style={styles.bookPageButton} disabled={zoom>=3} onPress={zoomIn}><Text style={styles.settingText}>+</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={c.close} style={styles.bookClose} onPress={close}><Text style={styles.gold}>×</Text></Pressable></View></View>
   <View style={styles.bookContent}>
    <View style={[styles.immersivePaperFrame,{width:Math.min(bookWidth-4,(bookHeight-insets.top-insets.bottom-132)*.644),height:Math.min((bookHeight-insets.top-insets.bottom-132),bookWidth/.644)}]}>
      <MushafPageView theme={colors} {...loopPageProps(loop,audio)} page={bookPage} asset={MUSHAF_PAGE_ASSETS[bookPage]} verses={pageVerses} surahNames={chapterNames(pageVerses)} juzName={juzArabic(pageVerses[0]?.juz??1)} language={language} dark={settings.nightMode} activeKey={audio.currentVerseKey} bookmarkedKeys={verseBookmarks} onTafsirVerse={key=>{tafsirLibrary.openLibrary();setTafsirKey(key);}} onBookmarkVerse={onToggleVerseBookmark} zoom={zoom} onTap={()=>undefined} onPlayVerse={key=>playKey(audio,key)} onPageSwipe={(_delta,target)=>{setBookPage(target);onNavigate(target);}}/>
    </View>
   </View>
   <TafsirSheet library={tafsirLibrary} verseKey={tafsirKey} language={language} dark={settings.nightMode} quranFontLoaded={quranFontLoaded} onClose={()=>setTafsirKey(null)}/>
   <RepeatRangeSheet initialRange={loop.initialRange} onChooseOnPage={loop.beginPicking} visible={visible&&loop.visible} language={language} audio={audio} initialVerseKey={audio.currentVerseKey??(pageVerses[0]?`${pageVerses[0].surah}:${pageVerses[0].number}`:null)} onClose={loop.close}/>
   <VerseLoopPrompt loop={loop} language={language} book/>
   <View style={[styles.bookFooter,rtl&&styles.reverse]}><Pressable accessibilityRole="button" accessibilityLabel={c.previousPage} disabled={bookPage<=1} style={styles.bookPageButton} onPress={previous}><Text style={styles.pageButtonText}>{rtl?'›':'‹'}</Text></Pressable><Text style={styles.chromePageText}>{c.page} {localDigits(bookPage,language)}</Text><Pressable accessibilityRole="button" accessibilityLabel={bookmarks.includes(bookPage)?c.saved:c.bookmark} style={styles.bookPageButton} onPress={()=>onToggleBookmark(bookPage)}><Ionicons name={bookmarks.includes(bookPage)?'bookmark':'bookmark-outline'} size={22} color={colors.accent}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel={c.repeat} accessibilityState={{selected:Boolean(audio.repeatRange)}} style={styles.bookPageButton} onPress={loop.open}><VerseRangeIcon color={audio.repeatRange?colors.accent:colors.lightPaper}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel={c.nextPage} disabled={bookPage>=PAGE_COUNT} style={styles.bookPageButton} onPress={next}><Text style={styles.pageButtonText}>{rtl?'‹':'›'}</Text></Pressable></View>
  </View>
 </Modal>;
}

type SettingsProps = { library:ReturnType<typeof useTafsirLibrary>; language: Language; audio: QuranAudioController; settings: QuranReaderSettings; onSettingsChange:(value:QuranReaderSettings)=>void };
export function QuranSettings({library,language,audio,settings,onSettingsChange}:SettingsProps) {
 const {colors,styles}=useReaderStyles(baseStyles), c=localizeCopy(language,labels), rtl=isRTL(language);
 const [choosingReciter,setChoosingReciter]=useState(false);
 const reciter=RECITERS.find(reader=>reader.id===audio.reciter)!;
 const set=(key:keyof QuranReaderSettings,value:number|boolean)=>{
  if(key==='fontSize'&&typeof value==='number')onSettingsChange({...settings,fontSize:value});
  else if(key==='nightMode'&&typeof value==='boolean')onSettingsChange({...settings,nightMode:value});
 };
 return <View style={styles.settings}>
  <View style={[styles.settingRow,rtl&&styles.reverse]}><Text style={styles.settingText}>{c.night}</Text><Switch accessibilityLabel={c.night} value={settings.nightMode} onValueChange={v=>set('nightMode',v)} trackColor={{false:colors.border,true:colors.accent}} thumbColor={colors.lightPaper}/></View>
  <Text style={[styles.settingLabel,rtl&&styles.rtl]}>{c.font}: {settings.fontSize}</Text>
  <View style={[styles.settingRow,rtl&&styles.reverse]}><Pressable accessibilityRole="button" accessibilityLabel={c.decreaseFont} style={styles.settingButton} disabled={settings.fontSize<=16} onPress={()=>set('fontSize',Math.max(16,settings.fontSize-1))}><Text style={styles.settingText}>−</Text></Pressable><View style={styles.flex}/><Pressable accessibilityRole="button" accessibilityLabel={c.increaseFont} style={styles.settingButton} disabled={settings.fontSize>=32} onPress={()=>set('fontSize',Math.min(32,settings.fontSize+1))}><Text style={styles.settingText}>+</Text></Pressable></View>
  <Pressable testID="settings-reciter-picker" accessibilityRole="button" accessibilityState={{expanded:choosingReciter}} accessibilityLabel={`${c.reciter}: ${rtl?reciter.arabicName:reciter.name}`} onPress={()=>setChoosingReciter(value=>!value)} style={[styles.settingChoice,rtl&&styles.reverse]}><Text style={[styles.settingText,styles.flex]}>{c.reciter} · {rtl?reciter.arabicName:reciter.name}</Text><Ionicons name={choosingReciter?'chevron-up':'chevron-down'} size={20} color={colors.accent}/></Pressable>
  {choosingReciter&&<ReciterChoices language={language} audio={audio} onChoose={()=>setChoosingReciter(false)}/>}
  <DownloadManager language={language} audio={audio} library={library}/>
 </View>;
}

function playKey(audio:QuranAudioController,key:string) {const verse=parseVerseKey(key);if(verse)void audio.playVerse(verse.surah,verse.verse);}
function parseVerseKey(key:string|null):{surah:number;verse:number}|null { if(!key)return null;const [a,b]=key.split(':').map(Number);return Number.isInteger(a)&&Number.isInteger(b)?{surah:a,verse:b}:null; }
function togglePagePlayback(audio:QuranAudioController,page:readonly Verse[]) {
 if(audio.status==='error') void audio.retryPlayback();
 else if(audio.status==='playing'||audio.status==='loading') audio.pause();
 else { const current=parseVerseKey(audio.currentVerseKey); if(current&&page.some(v=>v.surah===current.surah&&v.number===current.verse)) void audio.togglePlayback(); else if(page[0]) void audio.playVerse(page[0].surah,page[0].number); }
}
function localizePlaybackError(message:string|undefined,copy:typeof labels.en) {
 const reason=(message??'').toLocaleLowerCase();
 if(reason.includes('offline'))return copy.offline;
 if(reason.includes('connection')||reason.includes('did not load'))return copy.retryConnection;
 if(reason.includes('valid verse range'))return copy.invalidRange;
 return copy.playbackFailed;
}
function localDigits(n:number,language:Language) { return n.toLocaleString(localeFor(language), {useGrouping:false}); }
function formatTime(n:number) { if(!Number.isFinite(n)||n<0)return '0:00';return `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`; }

const baseStyles=StyleSheet.create({
 loopPrompt:{position:'absolute',zIndex:20,elevation:20,left:12,right:12,minHeight:56,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:6,backgroundColor:'#FAF7EF',borderRadius:14,borderWidth:1,borderColor:'#BD8744'},loopPromptText:{color:'#18334A',fontSize:15,fontWeight:'600'},loopPromptReference:{color:'#526A7B',fontSize:12},
 verseBookmarkRow:{flexDirection:'row',alignItems:'center',gap:4},
 immersiveRoot:{flex:1,minHeight:0,width:'100%',paddingTop:48,backgroundColor:'#18334A',alignItems:'center',justifyContent:'center'},immersiveSpread:{flex:1,minHeight:0,width:'100%',alignItems:'center',justifyContent:'center'},immersivePaperFrame:{maxWidth:'100%',padding:1,borderWidth:1,borderColor:'#DBAB68',backgroundColor:'#DBAB68',borderRadius:12,shadowColor:'#000',shadowOpacity:.28,shadowRadius:5,shadowOffset:{width:1,height:2}},immersivePaper:{paddingHorizontal:10,paddingVertical:8},chromeLayer:{zIndex:10,elevation:6,position:'absolute',top:0,left:0,right:0,bottom:0,justifyContent:'space-between',paddingTop:4,paddingBottom:4},immersiveTopControls:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:6,backgroundColor:'rgba(24,51,74,.96)'},immersiveBottomControls:{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'space-around',paddingHorizontal:3,backgroundColor:'rgba(24,51,74,.96)'},chromeButton:{width:44,height:44,alignItems:'center',justifyContent:'center'},immersiveSearch:{height:42,flex:1,maxWidth:190,marginHorizontal:3,borderRadius:22,backgroundColor:'#25465E',alignItems:'center',justifyContent:'center',flexDirection:'row',gap:5,paddingHorizontal:8},immersiveSearchLabel:{fontSize:12,color:'#FAF7EF',flexShrink:1},chromePage:{width:44,height:44,alignItems:'center',justifyContent:'center',paddingHorizontal:0},chromePageText:{color:'#DBAB68',fontSize:9},chromeJuz:{color:'#FAF7EF',fontSize:11},quranFont:{fontFamily:'AmiriQuran'},paper:{flex:1,minHeight:0,backgroundColor:'#FAF7EF',borderRadius:6,paddingHorizontal:15,paddingVertical:8},pageGutter:{position:'absolute',left:9,top:0,bottom:0,width:1,backgroundColor:'#D9D2BF'},darkFrame:{backgroundColor:'#626A49'},darkPaper:{backgroundColor:'#14200C'},chapter:{color:'#536A5F',fontSize:12,flex:1},bookmark:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},gold:{color:'#B18B3D',fontSize:20},pageBody:{flex:1,minHeight:0,justifyContent:'center'},pageMetadata:{height:28,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:4,borderBottomWidth:1,borderColor:'#D7D0B8'},pageMetaText:{flex:1,color:'#72765A',fontSize:13,lineHeight:24,textAlign:'center',writingDirection:'rtl'},pageMetaJuz:{color:'#72765A',fontSize:11,lineHeight:22},paperPageNumber:{height:15,color:'#706E59',fontSize:10,textAlign:'center',includeFontPadding:false},quranSearchText:{fontSize:17,lineHeight:28,textAlign:'right',writingDirection:'rtl'},lightText:{color:'#FAF7EF'},pageButtonText:{color:'#FAF7EF',fontSize:25,lineHeight:30},disabled:{opacity:.42},
 readerAudioBar:{width:'100%',minHeight:72,paddingHorizontal:6,paddingTop:4,paddingBottom:4,borderTopWidth:StyleSheet.hairlineWidth,borderColor:'#516C80'},readerAudioMeta:{flexDirection:'row',alignItems:'center',gap:8,minHeight:20,paddingHorizontal:4},audioCompact:{flex:1,minHeight:44,height:44,paddingVertical:0},
 audioOverlay:{flex:1,justifyContent:'flex-end',paddingHorizontal:12,backgroundColor:'rgba(0,0,0,0.55)'},audioPanel:{width:'100%',maxWidth:600,alignSelf:'center',paddingHorizontal:12,paddingBottom:14,borderRadius:22,borderWidth:1,borderColor:'#516C80',backgroundColor:'#18334A'},audioReciter:{color:'#BCD0DF',fontSize:12,textAlign:'center',paddingBottom:10},audioControls:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:44},reciterPicker:{minHeight:62,borderWidth:1,borderColor:'#DBAB68',borderRadius:12,flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:10,paddingVertical:8},reciterList:{maxHeight:210},audioButton:{flex:1,minWidth:44,minHeight:68,gap:6,paddingHorizontal:2,paddingVertical:8,alignItems:'center',justifyContent:'center',borderRadius:11},audioPrimary:{backgroundColor:'#DBAB68'},audioButtonText:{color:'#FAF7EF',fontSize:10,lineHeight:14,textAlign:'center',fontWeight:'600'},audioPrimaryText:{color:'#25465E'},audioMeta:{color:'#BCD0DF',fontSize:10,textAlign:'center',minHeight:13},audioError:{flex:1},audioMetaRow:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},audioRetry:{minHeight:44,minWidth:54,alignItems:'center',justifyContent:'center'},audioRetryText:{color:'#DBAB68',fontSize:12,fontWeight:'700'},
 modalRoot:{flex:1,backgroundColor:'#14293C',paddingTop:10},modalHeader:{minHeight:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},modalTitle:{color:'#FAF7EF',fontSize:20,fontWeight:'600'},close:{width:48,height:48,alignItems:'center',justifyContent:'center'},search:{marginHorizontal:16,marginBottom:10,minHeight:48,borderWidth:1,borderColor:'#516C80',borderRadius:12,paddingHorizontal:14,color:'#FAF7EF',fontSize:16},numberRow:{flexDirection:'row',gap:10,paddingHorizontal:16,paddingBottom:10},numberInput:{flex:1,minHeight:48,borderWidth:1,borderColor:'#516C80',borderRadius:12,paddingHorizontal:12,color:'#FAF7EF'},chooseButton:{minWidth:90,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:'#516C80'},chooseText:{color:'#FAF7EF'},list:{paddingHorizontal:16,paddingBottom:30,gap:7},listItem:{minHeight:48,borderWidth:1,borderColor:'#516C80',borderRadius:12,padding:11,justifyContent:'center',gap:3},listMain:{color:'#FAF7EF',fontSize:15,textAlign:'right',writingDirection:'rtl'},listSub:{color:'#BCD0DF',fontSize:12},note:{color:'#BCD0DF',padding:12},
 bookRoot:{flex:1,backgroundColor:'#18334A',paddingHorizontal:0},bookHeader:{minHeight:56,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:4},bookActions:{flexDirection:'row',alignItems:'center',gap:5},bookTitle:{color:'#FAF7EF',fontSize:18,fontWeight:'600'},bookClose:{width:48,height:48,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:'#25465E'},bookContent:{flex:1,minHeight:0,alignItems:'center',justifyContent:'center',paddingBottom:10},bookFrame:{flex:1,minHeight:0,maxHeight:900,alignSelf:'center',width:'100%',maxWidth:760,padding:7,borderRadius:20,backgroundColor:'#DBAB68'},bookPaper:{flex:1,minHeight:0,borderRadius:14,backgroundColor:'#FAF7EF',paddingHorizontal:18,paddingVertical:12},bookPageHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:48,borderBottomWidth:1,borderColor:'#516C80'},bookTextArea:{flex:1,minHeight:0,justifyContent:'center',paddingHorizontal:4},zoomScrollContent:{flexGrow:1,paddingBottom:24},bookFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:54,borderTopWidth:1,borderColor:'#516C80'},bookPageButton:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:11,backgroundColor:'#25465E'},bookPageNumber:{flex:1,textAlign:'center',color:'#536A5F',fontSize:13,fontWeight:'600'},
 settings:{gap:8,paddingBottom:24},settingLabel:{color:'#DBAB68',fontSize:15,fontWeight:'700',marginTop:10},settingNote:{color:'#BCD0DF',fontSize:12,lineHeight:19},settingRow:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},settingChoice:{minHeight:46,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:'#516C80',borderRadius:11,paddingHorizontal:12},settingText:{color:'#FAF7EF',fontSize:14},settingButton:{minWidth:48,minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#516C80',borderRadius:10},flex:{flex:1},wrap:{flexDirection:'row',gap:6},speedButton:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:'#516C80'},selected:{borderColor:'#DBAB68',backgroundColor:'#25465E'},rangeRow:{flexDirection:'row',gap:8},rangeField:{flex:1,gap:4},rangeInput:{minHeight:44,borderWidth:1,borderColor:'#516C80',borderRadius:10,paddingHorizontal:10,color:'#FAF7EF'},actionButton:{minHeight:44,minWidth:54,alignItems:'center',justifyContent:'center',paddingHorizontal:10,borderRadius:10,borderWidth:1,borderColor:'#516C80'},downloadRow:{minHeight:48,flexDirection:'row',alignItems:'center',gap:7,borderBottomWidth:1,borderColor:'#516C80'},error:{color:'#F2A498',fontSize:12,flexShrink:1},trashIcon:{color:'#FAF7EF',fontSize:18},attribution:{minHeight:44,justifyContent:'center',alignItems:'flex-start'},rtl:{textAlign:'right',writingDirection:'rtl'},reverse:{flexDirection:'row-reverse'},
});
