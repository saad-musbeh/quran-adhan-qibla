import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { getPageVerses, getSurah, getVerse, surahs, verses, type Verse } from '../domain/quran';
import { paginateQuranPage } from '../domain/quran-pagination';
import { normalizeQuranSearch, searchQuran } from '../domain/quran-search';
import { RECITERS, type QuranAudioController } from '../use-quran-audio';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';

export type QuranReaderSettings = { fontSize: number; nightMode: boolean };
type Language = 'ar' | 'en';
type Props = { language: Language; audio: QuranAudioController; settings: QuranReaderSettings };
type Picker = 'surah' | 'juz' | 'page' | 'search' | 'bookmarks' | null;
const PAGE_KEY = 'quran.reader.lastPage';
const BOOKMARK_KEY = 'quran.reader.bookmarks';
const PAGE_COUNT = 604;
const labels = {
  ar: { page:'الصفحة', pagePart:'الجزء المعروض', previous:'السابق', next:'التالي', previousPage:'الصفحة السابقة', nextPage:'الصفحة التالية', bookmark:'إضافة إشارة مرجعية', saved:'إزالة الإشارة المرجعية', openBook:'فتح المصحف', bookTitle:'قراءة المصحف', surah:'السورة', juz:'الجزء', search:'بحث في القرآن', bookmarks:'الإشارات المرجعية', close:'إغلاق', choose:'اختر', empty:'لا توجد نتائج', play:'تشغيل', pause:'إيقاف مؤقت', prevVerse:'الآية السابقة', nextVerse:'الآية التالية', back10:'رجوع ١٠ ثوانٍ', forward10:'تقديم ١٠ ثوانٍ', reciter:'القارئ', speed:'سرعة التلاوة', repeat:'تكرار نطاق الآيات', font:'حجم الخط', decreaseFont:'تصغير الخط', increaseFont:'تكبير الخط', night:'الوضع الليلي', downloads:'تنزيل السور للاستماع دون اتصال', download:'تنزيل', delete:'حذف التنزيل', confirmDelete:'هل تريد حذف التسجيل المحفوظ لهذه السورة؟', cancel:'إلغاء التنزيل', online:'التنزيل يحتاج إلى اتصال بالإنترنت.', offline:'لا يوجد اتصال. التنزيلات المحفوظة متاحة دون اتصال.', progress:'التنزيل جارٍ', range:'النطاق: سورة، من آية إلى آية', from:'من', to:'إلى', apply:'تطبيق', clear:'مسح التكرار', listening:'استمع إلى القرآن', unknown:'البيانات الصوتية غير متاحة حالياً', pageOf:'من', invalidRange:'تحقق من رقم السورة ونطاق الآيات.', activeRange:'نطاق التكرار النشط', retry:'إعادة المحاولة', attribution:'نص القرآن: تنزيل — tanzil.net', audioAttribution:'التلاوات الصوتية: EveryAyah', downloadFailed:'تعذر تنزيل السورة.', deleteFailed:'تعذر حذف التنزيل.', playbackFailed:'تعذّر تشغيل التلاوة.', retryConnection:'تحقق من الاتصال وحاول مجدداً.' },
  en: { page:'Page', pagePart:'Displayed part', previous:'Previous part', next:'Next part', previousPage:'Previous page', nextPage:'Next page', bookmark:'Bookmark this page', saved:'Remove bookmark', openBook:'Open book reader', bookTitle:'Quran reading', close:'Close', surah:'Surah', juz:'Juz', search:'Search the Quran', bookmarks:'Bookmarks', choose:'Choose', empty:'No results', play:'Play', pause:'Pause', prevVerse:'Previous verse', nextVerse:'Next verse', back10:'Back 10 seconds', forward10:'Forward 10 seconds', reciter:'Reciter', speed:'Recitation speed', repeat:'Repeat verse range', font:'Text size', decreaseFont:'Decrease text size', increaseFont:'Increase text size', night:'Night reading', downloads:'Download surahs for offline listening', download:'Download', delete:'Delete download', confirmDelete:'Delete the saved audio for this surah?', cancel:'Cancel download', online:'Downloads require an internet connection.', offline:'You are offline. Saved downloads remain available.', progress:'Downloading', range:'Range: surah, from verse to verse', from:'From', to:'To', apply:'Apply', clear:'Clear repeat', listening:'Listen to the Quran', unknown:'Audio data is temporarily unavailable', pageOf:'of', invalidRange:'Check the surah and verse range.', activeRange:'Active repeat range', retry:'Retry', attribution:'Quran text: Tanzil — tanzil.net', audioAttribution:'Recitations: EveryAyah', downloadFailed:'Could not download this surah.', deleteFailed:'Could not delete the download.', playbackFailed:'Could not play this recitation.', retryConnection:'Check your connection and try again.' },
};

export function QuranScreen({ language, audio, settings }: Props) {
  const [quranFontLoaded] = useFonts({ AmiriQuran: require('../../assets/quran/AmiriQuran.ttf') });
  const { fontScale } = useWindowDimensions();
  const c = labels[language]; const rtl = language === 'ar';
  const [page, setPage] = useState(1); const [ready, setReady] = useState(false);
  const [bookVisible,setBookVisible]=useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]); const [picker, setPicker] = useState<Picker>(null);
  const [query, setQuery] = useState(''); const [boxHeight, setBoxHeight] = useState(250); const [boxWidth, setBoxWidth] = useState(300); const [partIndex, setPartIndex] = useState(0);
  const versesOnPage = useMemo(() => getPageVerses(page), [page]);
  const hasSurahOpening = versesOnPage[0]?.number === 1 && versesOnPage[0]?.surah !== 1 && versesOnPage[0]?.surah !== 9;
  const baseBudget=quranPageBudget(boxHeight,boxWidth,settings.fontSize,fontScale,hasSurahOpening);
  const [adaptiveBudget,setAdaptiveBudget]=useState<number|null>(null);
  const pageBudget=adaptiveBudget??baseBudget;
  const parts = useMemo(() => {
    return paginateQuranPage(versesOnPage, pageBudget);
  }, [versesOnPage, pageBudget]);
  const currentPart = Math.min(partIndex, parts.length - 1);
  const active = parseVerseKey(audio.currentVerseKey);
  const chapter = getSurah(versesOnPage[0]?.surah ?? 1);
  const basmala = currentPart === 0 && parts[0]?.[0]?.verse.number === 1 && !parts[0]?.[0]?.continuesBefore && parts[0]?.[0]?.verse.surah !== 1 && parts[0]?.[0]?.verse.surah !== 9
    ? getVerse(1, 1)?.text : undefined;
  const dark = settings.nightMode;
  useEffect(() => { setPartIndex(0); }, [settings.fontSize, boxHeight, boxWidth]);
  useEffect(() => { setAdaptiveBudget(null); }, [page, settings.fontSize, boxHeight, boxWidth, fontScale]);
  useEffect(() => {
    if (!bookVisible && active && audio.status === 'playing') {
      const playingVerse = getVerse(active.surah, active.verse);
      if (playingVerse) {
        if (playingVerse.page !== page) { setPartIndex(0); setPage(playingVerse.page); }
        if (playingVerse.page === page) {
          const found = parts.findIndex(part => part.some(chunk => chunk.verse.surah === active.surah && chunk.verse.number === active.verse));
          if (found >= 0) setPartIndex(found);
        }
      }
    }
  }, [audio.currentVerseKey, audio.status]);
  useEffect(() => { let live = true; void Promise.all([AsyncStorage.getItem(PAGE_KEY), AsyncStorage.getItem(BOOKMARK_KEY)]).then(([p,b]) => {
    if (!live) return; const n = Number(p); if (Number.isInteger(n) && n >= 1 && n <= PAGE_COUNT) setPage(n);
    try { const parsed: unknown = JSON.parse(b ?? '[]'); if (Array.isArray(parsed)) setBookmarks(parsed.filter(v => Number.isInteger(v) && v >= 1 && v <= PAGE_COUNT)); } catch { /* reset malformed local preference */ }
    setReady(true);
  }).catch(() => { if (live) setReady(true); }); return () => { live = false; }; }, []);
  useEffect(() => { if (ready) void AsyncStorage.setItem(PAGE_KEY, String(page)).catch(() => undefined); }, [page, ready]);
  useEffect(() => { if (ready) void AsyncStorage.setItem(BOOKMARK_KEY, JSON.stringify(bookmarks)).catch(() => undefined); }, [bookmarks, ready]);
  const go = (n: number) => { setPartIndex(0); setPage(Math.min(PAGE_COUNT, Math.max(1, n))); };
  const previousPartOrPage = () => {
    if (currentPart > 0) { setPartIndex(currentPart - 1); return; }
    if (page > 1) {
      const previousVerses=getPageVerses(page-1);
      const previousOpening=previousVerses[0]?.number===1&&previousVerses[0]?.surah!==1&&previousVerses[0]?.surah!==9;
      const chars=quranPageBudget(boxHeight,boxWidth,settings.fontSize,fontScale,previousOpening);
      setPartIndex(paginateQuranPage(previousVerses, chars).length - 1);
      setPage(page - 1);
    }
  };
  const toggleBookmark = (targetPage=page) => setBookmarks(xs => xs.includes(targetPage) ? xs.filter(x => x !== targetPage) : [...xs, targetPage].sort((a,b) => a-b));
  const onSelectVerse = (v: Verse) => { void audio.playVerse(v.surah, v.number); };
  const setPickerAndReset = (value: Picker) => { setQuery(''); setPicker(value); };
  return <View style={styles.root}>
    <View style={[styles.toolbar, rtl && styles.reverse]}>
      <Pressable accessibilityRole="button" accessibilityLabel={c.surah} style={styles.tool} onPress={() => setPickerAndReset('surah')}><Text style={styles.toolText}>{c.surah}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={c.juz} style={styles.tool} onPress={() => setPickerAndReset('juz')}><Text style={styles.toolText}>{c.juz}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={c.search} style={styles.tool} onPress={() => setPickerAndReset('search')}><Text style={styles.toolIcon}>⌕</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={c.bookmarks} style={styles.tool} onPress={() => setPickerAndReset('bookmarks')}><Text style={styles.toolIcon}>▱</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={c.openBook} style={styles.bookTool} onPress={()=>setBookVisible(true)}><Ionicons name="book-outline" size={20} color="#D6BA7A" /></Pressable>
    </View>
    <View style={[styles.paperFrame, dark && styles.darkFrame]}>
      <View style={[styles.paper, dark && styles.darkPaper]}>
        <View style={[styles.pageHeader, rtl && styles.reverse]}>
          <Text numberOfLines={1} style={[styles.chapter, dark && styles.lightText]}>{chapter?.arabicName ?? ''}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={bookmarks.includes(page) ? c.saved : c.bookmark} accessibilityState={{ selected: bookmarks.includes(page) }} onPress={()=>toggleBookmark()} style={styles.bookmark}><Text style={styles.gold}>{bookmarks.includes(page) ? '◆' : '◇'}</Text></Pressable>
        </View>
        <View style={styles.pageBody} onLayout={e => {setBoxHeight(e.nativeEvent.layout.height);setBoxWidth(e.nativeEvent.layout.width);}}>
          <Text onTextLayout={event=>{
            const rendered=event.nativeEvent.lines.length;
            const lineHeight=settings.fontSize*fontScale*1.8;
            const available=Math.max(24,boxHeight-(hasSurahOpening?lineHeight:0));
            const visible=Math.max(1,Math.floor(available/lineHeight));
            let factor=1;
            if(rendered>visible)factor=Math.max(0.5,(visible/rendered)*0.94);
            else if(currentPart===0&&parts.length>1&&rendered<visible-1)factor=Math.min(2,(visible/(rendered+1))*0.96);
            const updated=Math.max(24,Math.min(baseBudget*4,Math.floor(pageBudget*factor)));
            if(Math.abs(updated-pageBudget)/pageBudget>0.12)setAdaptiveBudget(updated);
          }} style={[styles.quranText, dark && styles.lightText, { fontFamily: quranFontLoaded ? 'AmiriQuran' : undefined, fontSize: settings.fontSize, lineHeight: settings.fontSize * 1.8 }]}>
            {basmala ? <Text style={styles.basmala}>{basmala}{'\n'}</Text> : null}
            {(parts[currentPart] ?? []).map((chunk, i) => <Text key={`${chunk.verse.surah}:${chunk.verse.number}:${i}`} onPress={() => onSelectVerse(chunk.verse)} accessibilityRole="button" accessibilityLabel={`${chunk.verse.surah}:${chunk.verse.number}`} style={[
              active?.surah === chunk.verse.surah && active.verse === chunk.verse.number && styles.highlight,
            ]}>{chunk.text}{!chunk.continuesAfter ? <Text style={[styles.verseMarker,dark&&styles.markerDark]}> ۝{localDigits(chunk.verse.number, language)} </Text> : null}</Text>)}
          </Text>
          {!versesOnPage.length && <Text style={styles.note}>{c.empty}</Text>}
        </View>
        <View style={[styles.pageFooter, rtl && styles.reverse]}>
          <Pressable accessibilityRole="button" accessibilityLabel={currentPart>0?c.previous:c.previousPage} accessibilityState={{disabled:page <= 1&&currentPart===0}} disabled={page <= 1&&currentPart===0} style={[styles.pageButton, page <= 1&&currentPart===0 && styles.disabled]} onPress={previousPartOrPage}><Text style={styles.pageButtonText}>‹</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`${c.page} ${page}, ${c.pagePart} ${currentPart+1} ${c.pageOf} ${parts.length}`} style={styles.pageNumber} onPress={() => setPickerAndReset('page')}><Text style={[styles.pageNumberText,dark&&styles.pageNumberDark]}>{page} · {currentPart+1}/{parts.length}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={currentPart<parts.length-1?c.next:c.nextPage} accessibilityState={{disabled:page>=PAGE_COUNT&&currentPart>=parts.length-1}} disabled={page>=PAGE_COUNT&&currentPart>=parts.length-1} style={[styles.pageButton, page>=PAGE_COUNT&&currentPart>=parts.length-1 && styles.disabled]} onPress={() => currentPart<parts.length-1?setPartIndex(currentPart+1):go(page+1)}><Text style={styles.pageButtonText}>›</Text></Pressable>
        </View>
      </View>
    </View>
    <AudioDock language={language} audio={audio} part={parts[currentPart] ?? []} />
    <ReaderPicker language={language} visible={picker !== null} type={picker} query={query} setQuery={setQuery} page={page} quranFontLoaded={quranFontLoaded} onClose={() => setPicker(null)} onChoosePage={go} onChooseSurah={n => go(getSurah(n)?.startPage ?? 1)} onChooseVerse={v => { go(v.page); onSelectVerse(v); }} bookmarks={bookmarks} />
    <BookReaderModal language={language} visible={bookVisible} page={page} partIndex={currentPart} visibleVerseKey={parts[currentPart]?.[0]?.verse ? `${parts[currentPart][0].verse.surah}:${parts[currentPart][0].verse.number}` : null} bookmarks={bookmarks}
      settings={settings} audio={audio} fontLoaded={quranFontLoaded} onClose={()=>setBookVisible(false)}
      onNavigate={(nextPage,nextPart,targetVerse)=>{setPage(nextPage);if(targetVerse){const mainVerses=getPageVerses(nextPage),opening=mainVerses[0]?.number===1&&mainVerses[0]?.surah!==1&&mainVerses[0]?.surah!==9;const mainParts=paginateQuranPage(mainVerses,quranPageBudget(boxHeight,boxWidth,settings.fontSize,fontScale,opening));const found=mainParts.findIndex(items=>items.some(item=>item.verse.surah===targetVerse.surah&&item.verse.number===targetVerse.number));setPartIndex(Math.max(0,found));}else setPartIndex(nextPart);}}
      onToggleBookmark={toggleBookmark} onSelectVerse={onSelectVerse} />
  </View>;
}

type PickerProps = { language: Language; visible: boolean; type: Picker; query: string; setQuery: (s:string)=>void; page:number; quranFontLoaded:boolean; onClose:()=>void; onChoosePage:(n:number)=>void; onChooseSurah:(n:number)=>void; onChooseVerse:(v:Verse)=>void; bookmarks:number[] };
function ReaderPicker({ language, visible, type, query, setQuery, page, quranFontLoaded, onClose, onChoosePage, onChooseSurah, onChooseVerse, bookmarks }: PickerProps) {
  const c=labels[language]; const rtl=language==='ar'; const [number,setNumber]=useState('1'); const insets=useSafeAreaInsets();
  useEffect(()=>{setNumber(type==='page'?String(page):'1');},[type,page]);
  const normalizedQuery=normalizeQuranSearch(query);
  const filteredSurahs = surahs.filter(s => normalizeQuranSearch(`${s.arabicName} ${s.englishName} ${s.transliteration}`).includes(normalizedQuery));
  const results = type==='search' ? searchQuran(query,verses,surahs,40) : [];
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={[styles.modalRoot,{paddingTop:insets.top,paddingBottom:insets.bottom}]}>
      <View style={[styles.modalHeader,rtl&&styles.reverse]}><Text style={styles.modalTitle}>{type==='surah'?c.surah:type==='juz'?'الجزء / Juz':type==='page'?c.page:type==='search'?c.search:c.bookmarks}</Text><Pressable accessibilityRole="button" accessibilityLabel={c.close} style={styles.close} onPress={onClose}><Text style={styles.gold}>×</Text></Pressable></View>
      {(type==='search'||type==='surah') && <TextInput value={query} onChangeText={setQuery} placeholder={c.search} placeholderTextColor="#A8C1B8" style={[styles.search,rtl&&styles.rtl]} autoFocus={type==='search'} />}
      {(type==='page'||type==='juz') && <View style={[styles.numberRow,rtl&&styles.reverse]}><TextInput value={number} onChangeText={setNumber} keyboardType="number-pad" style={styles.numberInput} /><Pressable accessibilityRole="button" style={styles.chooseButton} onPress={()=>{const n=Number(number);if(Number.isInteger(n)){ if(type==='page')onChoosePage(n);else {const verse=verses.find(v=>v.juz===n);if(verse)onChoosePage(verse.page);} onClose();}}}><Text style={styles.chooseText}>{c.choose}</Text></Pressable></View>}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
        {type==='surah'&&filteredSurahs.map(s=><Pressable key={s.number} style={[styles.listItem,rtl&&styles.reverse]} onPress={()=>{onChooseSurah(s.number);onClose();}}><Text style={styles.listMain}>{s.arabicName}</Text><Text style={styles.listSub}>{s.number}</Text></Pressable>)}
        {type==='search'&&results.map(v=><VerseRow key={`${v.surah}:${v.number}`} v={v} language={language} quranFontLoaded={quranFontLoaded} onPress={()=>{onChooseVerse(v);onClose();}}/>)}
        {type==='bookmarks'&&bookmarks.map(n=><Pressable key={n} style={styles.listItem} onPress={()=>{onChoosePage(n);onClose();}}><Text style={styles.listMain}>{c.page} {n}</Text></Pressable>)}
        {type==='juz'&&Array.from({length:30},(_,i)=><Pressable key={i} style={styles.listItem} onPress={()=>{const v=verses.find(x=>x.juz===i+1);if(v)onChoosePage(v.page);onClose();}}><Text style={styles.listMain}>{c.juz} {i+1}</Text></Pressable>)}
        {((type==='search'&&query.trim()&&!results.length)||(type==='surah'&&query&&!filteredSurahs.length))&&<Text style={styles.note}>{c.empty}</Text>}
      </ScrollView>
    </View>
  </Modal>;
}
function VerseRow({v,language,quranFontLoaded,onPress}:{v:Verse;language:Language;quranFontLoaded:boolean;onPress:()=>void}) { const s=getSurah(v.surah);return <Pressable style={styles.listItem} onPress={onPress}><Text style={[styles.listMain,quranFontLoaded&&styles.quranSearchText]} numberOfLines={2}>{v.text}</Text><Text style={styles.listSub}>{s?.arabicName} · {v.number}</Text></Pressable>; }

function AudioDock({language,audio,part}:{language:Language;audio:QuranAudioController;part:{verse:Verse}[]}) {
 const c=labels[language]; const rtl=language==='ar'; const current=parseVerseKey(audio.currentVerseKey); const currentVerse=current?getVerse(current.surah,current.verse):undefined;
 const shown= currentVerse ?? part[0]?.verse;
 const invoke=(fn:()=>void|Promise<void>)=>{try{void Promise.resolve(fn()).catch(()=>undefined);}catch{/* audio hook reports playback errors */}}
 const toggleOrStartPart=()=>{
  if(audio.status==='playing')invoke(audio.togglePlayback);
  else if(current&&part.some(item=>item.verse.surah===current.surah&&item.verse.number===current.verse))invoke(audio.togglePlayback);
  else if(part[0])invoke(()=>audio.playVerse(part[0].verse.surah,part[0].verse.number));
 };
 return <View style={styles.audioDock}>
  <View style={[styles.audioTop,rtl&&styles.reverse]}><Text numberOfLines={1} style={styles.audioTitle}>{shown?`${getSurah(shown.surah)?.arabicName} · ${shown.number}`:c.listening}</Text><Text style={styles.audioStatus}>{audio.status==='playing'?'▶':audio.status==='loading'?'…':audio.status==='error'?'!':'Ⅱ'}</Text></View>
  <View style={[styles.audioControls,rtl&&styles.reverse]}>
   <AudioButton label={c.prevVerse} text="|‹" onPress={()=>invoke(audio.previousVerse)} />
   <AudioButton label={c.back10} text="−10" onPress={()=>audio.seekBy(-10)} />
   <AudioButton label={audio.status==='playing'?c.pause:c.play} text={audio.status==='playing'?'Ⅱ':'▶'} primary onPress={toggleOrStartPart} />
   <AudioButton label={c.forward10} text="+10" onPress={()=>audio.seekBy(10)} />
   <AudioButton label={c.nextVerse} text="›|" onPress={()=>invoke(audio.nextVerse)} />
  </View>
  {audio.error ? <View style={[styles.audioMetaRow,rtl&&styles.reverse]}><Text accessibilityRole="alert" numberOfLines={2} style={[styles.audioMeta,styles.audioError]}>{localizePlaybackError(audio.error,c)}</Text><Pressable accessibilityRole="button" accessibilityLabel={c.retry} style={styles.audioRetry} onPress={()=>invoke(audio.retry)}><Text style={styles.audioRetryText}>{c.retry}</Text></Pressable></View>
   : <Text style={styles.audioMeta}>{audio.isOnline ? `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}` : c.offline}</Text>}
 </View>;
}
function AudioButton({label,text,onPress,primary}:{label:string;text:string;onPress:()=>void;primary?:boolean}) { return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.audioButton,primary&&styles.audioPrimary]}><Text style={[styles.audioButtonText,primary&&styles.audioPrimaryText]}>{text}</Text></Pressable>; }

type BookReaderProps={language:Language;visible:boolean;page:number;partIndex:number;visibleVerseKey:string|null;bookmarks:number[];settings:QuranReaderSettings;audio:QuranAudioController;fontLoaded:boolean;onClose:()=>void;onNavigate:(page:number,part:number,verse?:Verse)=>void;onToggleBookmark:(page?:number)=>void;onSelectVerse:(verse:Verse)=>void};
function BookReaderModal({language,visible,page,partIndex,visibleVerseKey,bookmarks,settings,audio,fontLoaded,onClose,onNavigate,onToggleBookmark,onSelectVerse}:BookReaderProps){
 const c=labels[language],rtl=language==='ar',insets=useSafeAreaInsets(),{fontScale}=useWindowDimensions();
 const [bookPage,setBookPage]=useState(page),[bookPart,setBookPart]=useState(partIndex);
 const wasVisible=useRef(false);
 const [height,setHeight]=useState(450),[width,setWidth]=useState(340),[adaptiveBudget,setAdaptiveBudget]=useState<number|null>(null);
 const pageVerses=useMemo(()=>getPageVerses(bookPage),[bookPage]);
 const hasOpening=pageVerses[0]?.number===1&&pageVerses[0]?.surah!==1&&pageVerses[0]?.surah!==9;
 const baseBudget=quranPageBudget(height,width,settings.fontSize,fontScale,hasOpening);
 const budget=adaptiveBudget??baseBudget;
 const parts=useMemo(()=>paginateQuranPage(pageVerses,budget),[pageVerses,budget]);
 const part=Math.min(bookPart,parts.length-1);
 const active=parseVerseKey(audio.currentVerseKey);
 const hasBasmala=part===0&&parts[0]?.[0]?.verse.number===1&&!parts[0]?.[0]?.continuesBefore&&parts[0]?.[0]?.verse.surah!==1&&parts[0]?.[0]?.verse.surah!==9;
 const chapter=getSurah(pageVerses[0]?.surah??1);
 useEffect(()=>{setAdaptiveBudget(null);},[bookPage,height,width,settings.fontSize,fontScale]);
 useEffect(()=>{if(visible&&!wasVisible.current){setBookPage(page);const key=visibleVerseKey?.split(':').map(Number);const initial=key?.length===2?paginateQuranPage(getPageVerses(page),quranPageBudget(height,width,settings.fontSize,fontScale,getPageVerses(page)[0]?.number===1&&getPageVerses(page)[0]?.surah!==1&&getPageVerses(page)[0]?.surah!==9)).findIndex(items=>items.some(item=>item.verse.surah===key[0]&&item.verse.number===key[1])):-1;setBookPart(Math.max(0,initial));}wasVisible.current=visible;},[visible]);
 useEffect(()=>{
  if(!visible||!active||audio.status!=='playing')return;
  const verse=getVerse(active.surah,active.verse);if(!verse)return;
  if(verse.page!==bookPage){setBookPage(verse.page);setBookPart(0);onNavigate(verse.page,0);return;}
  const found=parts.findIndex(items=>items.some(item=>item.verse.surah===active.surah&&item.verse.number===active.verse));
  if(found>=0&&found!==part){setBookPart(found);onNavigate(bookPage,found);}
 },[visible,audio.currentVerseKey,audio.status,bookPage]);
 const previous=()=>{
  if(part>0){setBookPart(part-1);onNavigate(bookPage,part-1);return;}
  if(bookPage>1){const prior=getPageVerses(bookPage-1),opening=prior[0]?.number===1&&prior[0]?.surah!==1&&prior[0]?.surah!==9;const priorParts=paginateQuranPage(prior,quranPageBudget(height,width,settings.fontSize,fontScale,opening));setBookPage(bookPage-1);setBookPart(priorParts.length-1);onNavigate(bookPage-1,priorParts.length-1);}
 };
 const next=()=>{if(part<parts.length-1){setBookPart(part+1);onNavigate(bookPage,part+1);}else if(bookPage<PAGE_COUNT){setBookPage(bookPage+1);setBookPart(0);onNavigate(bookPage+1,0);}};
 const close=()=>{const firstVerse=parts[part]?.[0]?.verse;onNavigate(bookPage,part,firstVerse);onClose();};
 const lineHeight=settings.fontSize*fontScale*1.8;
 return <Modal visible={visible} animationType="fade" presentationStyle="fullScreen" onRequestClose={close}>
  <View style={[styles.bookRoot,{paddingTop:insets.top,paddingBottom:insets.bottom}]}>
   <View style={[styles.bookHeader,rtl&&styles.reverse]}><Text style={styles.bookTitle}>{c.bookTitle}</Text><Pressable accessibilityRole="button" accessibilityLabel={c.close} style={styles.bookClose} onPress={close}><Text style={styles.gold}>×</Text></Pressable></View>
   <View style={styles.bookContent}>
    <View style={[styles.bookFrame,settings.nightMode&&styles.darkFrame]}>
     <View style={[styles.bookPaper,settings.nightMode&&styles.darkPaper]}>
   <View style={[styles.bookPageHeader,rtl&&styles.reverse]}><Text numberOfLines={1} style={[styles.chapter,settings.nightMode&&styles.lightText]}>{chapter?.arabicName ?? ''}</Text><Pressable accessibilityRole="button" accessibilityLabel={bookmarks.includes(bookPage)?c.saved:c.bookmark} accessibilityState={{selected:bookmarks.includes(bookPage)}} style={styles.bookmark} onPress={()=>onToggleBookmark(bookPage)}><Text style={styles.gold}>{bookmarks.includes(bookPage)?'◆':'◇'}</Text></Pressable></View>
      <View style={styles.bookTextArea} onLayout={event=>{setHeight(event.nativeEvent.layout.height);setWidth(event.nativeEvent.layout.width);}}>
       <Text onTextLayout={event=>{
        const rendered=event.nativeEvent.lines.length,visible=Math.max(1,Math.floor(Math.max(24,height-(hasOpening?lineHeight:0))/lineHeight));
        let factor=1;if(rendered>visible)factor=Math.max(.5,visible/rendered*.94);else if(part===0&&parts.length>1&&rendered<visible-1)factor=Math.min(2,visible/(rendered+1)*.96);
        const updated=Math.max(24,Math.min(baseBudget*4,Math.floor(budget*factor)));if(Math.abs(updated-budget)/budget>.12)setAdaptiveBudget(updated);
       }} style={[styles.bookQuranText,settings.nightMode&&styles.lightText,{fontFamily:fontLoaded?'AmiriQuran':undefined,fontSize:settings.fontSize,lineHeight:settings.fontSize*1.8}]}>
        {hasBasmala?<Text style={styles.basmala}>{getVerse(1,1)?.text}{'\n'}</Text>:null}
        {(parts[part]??[]).map((chunk,index)=><Text key={`${chunk.verse.surah}:${chunk.verse.number}:${index}`} accessibilityRole="button" accessibilityLabel={`${chunk.verse.surah}:${chunk.verse.number}`} onPress={()=>onSelectVerse(chunk.verse)} style={[active?.surah===chunk.verse.surah&&active.verse===chunk.verse.number&&styles.highlight]}>{chunk.text}{!chunk.continuesAfter?<Text style={[styles.verseMarker,settings.nightMode&&styles.markerDark]}> ۝{localDigits(chunk.verse.number,language)} </Text>:null}</Text>)}
       </Text>
      </View>
      <View style={[styles.bookFooter,rtl&&styles.reverse]}>
       <Pressable accessibilityRole="button" accessibilityLabel={part>0?c.previous:c.previousPage} accessibilityState={{disabled:page<=1&&part===0}} disabled={page<=1&&part===0} style={[styles.bookPageButton,page<=1&&part===0&&styles.disabled]} onPress={previous}><Text style={styles.pageButtonText}>‹</Text></Pressable>
       <Text style={[styles.bookPageNumber,settings.nightMode&&styles.lightText]}>{c.page} {bookPage} · {c.pagePart} {part+1}/{parts.length}</Text>
       <Pressable accessibilityRole="button" accessibilityLabel={part<parts.length-1?c.next:c.nextPage} accessibilityState={{disabled:bookPage>=PAGE_COUNT&&part>=parts.length-1}} disabled={bookPage>=PAGE_COUNT&&part>=parts.length-1} style={[styles.bookPageButton,bookPage>=PAGE_COUNT&&part>=parts.length-1&&styles.disabled]} onPress={next}><Text style={styles.pageButtonText}>›</Text></Pressable>
      </View>
     </View>
    </View>
   </View>
  </View>
 </Modal>;
}

type SettingsProps = { language: Language; audio: QuranAudioController; settings: QuranReaderSettings; onSettingsChange:(value:QuranReaderSettings)=>void };
export function QuranSettings({language,audio,settings,onSettingsChange}:SettingsProps) {
 const c=labels[language];const rtl=language==='ar';const [repeatSurah,setRepeatSurah]=useState('1');const [repeatStart,setRepeatStart]=useState('1');const [repeatEnd,setRepeatEnd]=useState('7');
 const [rangeError,setRangeError]=useState(false);const [deleteError,setDeleteError]=useState(false);
 const set=(key:keyof QuranReaderSettings,value:number|boolean)=>{
  if(key==='fontSize'&&typeof value==='number')onSettingsChange({...settings,fontSize:value});
  else if(key==='nightMode'&&typeof value==='boolean')onSettingsChange({...settings,nightMode:value});
 };
 const removeDownload=(number:number,name:string)=>Alert.alert(c.delete,`${c.confirmDelete} ${name}؟`,[
  {text:c.close,style:'cancel'},
  {text:c.delete,style:'destructive',onPress:()=>{void audio.deleteSurahDownload(number).then(()=>setDeleteError(false)).catch(()=>setDeleteError(true));}},
 ]);
 const startDownload=(number:number)=>{void audio.downloadSurah(number).catch(()=>undefined);};
 return <View style={styles.settings}>
  <Text style={[styles.settingLabel,rtl&&styles.rtl]}>{c.font}: {settings.fontSize}</Text>
  <View style={[styles.settingRow,rtl&&styles.reverse]}><Pressable accessibilityRole="button" accessibilityLabel={c.decreaseFont} style={styles.settingButton} onPress={()=>set('fontSize',Math.max(16,settings.fontSize-1))}><Text style={styles.settingText}>−</Text></Pressable><View style={styles.flex}/><Pressable accessibilityRole="button" accessibilityLabel={c.increaseFont} style={styles.settingButton} onPress={()=>set('fontSize',Math.min(32,settings.fontSize+1))}><Text style={styles.settingText}>+</Text></Pressable></View>
  <View style={[styles.settingRow,rtl&&styles.reverse]}><Text style={styles.settingText}>{c.night}</Text><Switch accessibilityLabel={c.night} value={settings.nightMode} onValueChange={v=>set('nightMode',v)} trackColor={{false:'#35544B',true:'#D6BA7A'}} thumbColor="#F4EFE4"/></View>
  <Text style={[styles.settingLabel,rtl&&styles.rtl]}>{c.reciter}</Text>{RECITERS.map(r=><Pressable key={r.id} accessibilityRole="radio" accessibilityState={{checked:audio.reciter===r.id}} style={[styles.settingChoice,rtl&&styles.reverse]} onPress={()=>audio.setReciter(r.id)}><Text style={styles.settingText}>{rtl?r.arabicName:r.name}</Text><Text style={styles.gold}>{audio.reciter===r.id?'●':'○'}</Text></Pressable>)}
  <Text style={[styles.settingLabel,rtl&&styles.rtl]}>{c.speed}</Text><View style={[styles.wrap,rtl&&styles.reverse]}>{[0.75,1,1.25,1.5,2].map(n=><Pressable key={n} accessibilityRole="radio" accessibilityState={{checked:audio.playbackRate===n}} onPress={()=>audio.setPlaybackRate(n)} style={[styles.speedButton,audio.playbackRate===n&&styles.selected]}><Text style={styles.settingText}>{n}×</Text></Pressable>)}</View>
  <Text style={[styles.settingLabel,rtl&&styles.rtl]}>{c.repeat}</Text><Text style={[styles.settingNote,rtl&&styles.rtl]}>{c.range}</Text><View style={[styles.rangeRow,rtl&&styles.reverse]}>{[[repeatSurah,setRepeatSurah,c.surah],[repeatStart,setRepeatStart,c.from],[repeatEnd,setRepeatEnd,c.to]].map(([value,change,label])=><View key={String(label)} style={styles.rangeField}><Text style={styles.settingNote}>{String(label)}</Text><TextInput value={String(value)} onChangeText={change as (s:string)=>void} keyboardType="number-pad" style={styles.rangeInput}/></View>)}</View>
  <View style={[styles.settingRow,rtl&&styles.reverse]}><Pressable accessibilityRole="button" style={styles.actionButton} onPress={()=>{const s=Number(repeatSurah),a=Number(repeatStart),b=Number(repeatEnd);if(getSurah(s)&&a>=1&&b>=a&&b<=(getSurah(s)?.verseCount??0)){audio.setRepeatRange({surah:s,start:a,end:b});void audio.playRange(s,a,b).catch(()=>undefined);setRangeError(false);}else setRangeError(true);}}><Text style={styles.settingText}>{c.apply}</Text></Pressable><Pressable accessibilityRole="button" style={styles.actionButton} onPress={()=>{audio.setRepeatRange(null);setRangeError(false);}}><Text style={styles.settingText}>{c.clear}</Text></Pressable></View>
  {rangeError&&<Text accessibilityRole="alert" style={[styles.error,rtl&&styles.rtl]}>{c.invalidRange}</Text>}
  {audio.repeatRange&&<Text style={[styles.settingNote,rtl&&styles.rtl]}>{c.activeRange}: {audio.repeatRange.surah}:{audio.repeatRange.start}–{audio.repeatRange.end}</Text>}
  <Text style={[styles.settingLabel,rtl&&styles.rtl]}>{c.downloads}</Text><Text style={[styles.settingNote,rtl&&styles.rtl]}>{audio.isOnline?c.online:c.offline}</Text>{audio.isDownloading!==null&&<View style={[styles.settingRow,rtl&&styles.reverse]}><Text style={styles.settingText}>{c.progress} {audio.downloadProgress}%</Text><Pressable accessibilityRole="button" style={styles.actionButton} onPress={audio.cancelDownload}><Text style={styles.settingText}>{c.cancel}</Text></Pressable></View>}
  {audio.downloadError&&<View style={[styles.settingRow,rtl&&styles.reverse]}><Text accessibilityRole="alert" style={[styles.error,rtl&&styles.rtl]}>{c.downloadFailed}</Text><Pressable accessibilityRole="button" disabled={!audio.isOnline||audio.isDownloading!==null} style={[styles.actionButton,(!audio.isOnline||audio.isDownloading!==null)&&styles.disabled]} onPress={()=>{void audio.retry().catch(()=>undefined);}}><Text style={styles.settingText}>{c.retry}</Text></Pressable></View>}
  {deleteError&&<Text accessibilityRole="alert" style={[styles.error,rtl&&styles.rtl]}>{c.deleteFailed}</Text>}
  {audio.error&&<View style={[styles.settingRow,rtl&&styles.reverse]}><Text accessibilityRole="alert" style={[styles.error,rtl&&styles.rtl]}>{c.unknown}</Text><Pressable accessibilityRole="button" style={styles.actionButton} onPress={()=>{void audio.retry().catch(()=>undefined);}}><Text style={styles.settingText}>{c.retry}</Text></Pressable></View>}
  {surahs.map(s=><View key={s.number} style={[styles.downloadRow,rtl&&styles.reverse]}><Text style={styles.settingText} numberOfLines={1}>{s.arabicName}</Text><View style={styles.flex}/>{audio.downloadedSurahs.includes(s.number)?<Pressable accessibilityRole="button" accessibilityLabel={`${c.delete} ${s.arabicName}`} style={styles.actionButton} onPress={()=>removeDownload(s.number,s.arabicName)}><Text style={styles.trashIcon}>▤</Text></Pressable>:<Pressable accessibilityRole="button" accessibilityLabel={`${c.download} ${s.arabicName}`} disabled={!audio.isOnline||audio.isDownloading!==null} style={[styles.actionButton,(!audio.isOnline||audio.isDownloading!==null)&&styles.disabled]} onPress={()=>startDownload(s.number)}><Text style={styles.settingText}>{audio.isDownloading===s.number?`${audio.downloadProgress}%`:c.download}</Text></Pressable>}</View>)}
  <Pressable accessibilityRole="link" onPress={()=>{void Linking.openURL('https://tanzil.net').catch(()=>undefined);}} style={styles.attribution}><Text style={styles.settingNote}>{c.attribution}</Text></Pressable>
  <Pressable accessibilityRole="link" onPress={()=>{void Linking.openURL('https://everyayah.com/').catch(()=>undefined);}} style={styles.attribution}><Text style={styles.settingNote}>{c.audioAttribution}</Text></Pressable>
 </View>;
}
function parseVerseKey(key:string|null):{surah:number;verse:number}|null { if(!key)return null;const [a,b]=key.split(':').map(Number);return Number.isInteger(a)&&Number.isInteger(b)?{surah:a,verse:b}:null; }
function quranPageBudget(height:number,width:number,fontSize:number,fontScale:number,hasBasmala:boolean) {
 const effective=fontSize*fontScale;
 const body=Math.max(24,height-(hasBasmala?effective*1.8:0));
 const lines=Math.max(3,Math.floor(body/(effective*1.8)));
 const charsPerLine=Math.max(10,Math.floor(width/(effective*0.25)));
 return Math.max(24,Math.floor(lines*charsPerLine*0.9));
}
function localizePlaybackError(message:string|undefined,copy:typeof labels.en) {
 const reason=(message??'').toLocaleLowerCase();
 if(reason.includes('offline'))return copy.offline;
 if(reason.includes('connection')||reason.includes('did not load'))return copy.retryConnection;
 if(reason.includes('valid verse range'))return copy.invalidRange;
 return copy.playbackFailed;
}
function localDigits(n:number,language:Language) { return language==='ar'?String(n).replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]):String(n); }
function formatTime(n:number) { if(!Number.isFinite(n)||n<0)return '0:00';return `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`; }

const styles=StyleSheet.create({
 root:{flex:1,minHeight:0,paddingHorizontal:10,paddingBottom:4,gap:5,alignSelf:'center',width:'100%',maxWidth:700}, toolbar:{flexDirection:'row',gap:5,justifyContent:'space-between',minHeight:44}, tool:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',paddingHorizontal:8,borderRadius:10,backgroundColor:'#15342E'},bookTool:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:'#15342E'},toolText:{color:'#F4EFE4',fontSize:12,fontWeight:'600'},toolIcon:{color:'#D6BA7A',fontSize:21},
 paperFrame:{flex:1,minHeight:0,padding:5,borderRadius:16,backgroundColor:'#D6BA7A'},paper:{flex:1,minHeight:0,backgroundColor:'#F4EFE4',borderRadius:12,paddingHorizontal:14,paddingVertical:8},darkFrame:{backgroundColor:'#35544B'},darkPaper:{backgroundColor:'#102722'},pageHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:30,borderBottomWidth:1,borderColor:'#D8CDAF'},chapter:{color:'#536A5F',fontSize:12,flex:1},bookmark:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center'},gold:{color:'#B18B3D',fontSize:20},pageBody:{flex:1,minHeight:0,justifyContent:'center'},quranText:{color:'#283E34',fontSize:23,lineHeight:42,textAlign:'center',writingDirection:'rtl',includeFontPadding:false},basmala:{fontWeight:'700'},quranSearchText:{fontSize:17,lineHeight:28,textAlign:'right',writingDirection:'rtl'},verseMarker:{color:'#896B2D',fontSize:13},markerDark:{color:'#D6BA7A'},lightText:{color:'#F4EFE4'},highlight:{backgroundColor:'#D6BA7A'},pageFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:44,borderTopWidth:1,borderColor:'#D8CDAF'},pageButton:{width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:10,backgroundColor:'#15342E'},pageButtonText:{color:'#F4EFE4',fontSize:25,lineHeight:30},pageNumber:{minHeight:44,justifyContent:'center',paddingHorizontal:12},pageNumberText:{color:'#536A5F',fontSize:12,fontWeight:'600'},pageNumberDark:{color:'#A8C1B8'},disabled:{opacity:.42},
 audioDock:{backgroundColor:'#15342E',borderRadius:14,paddingHorizontal:10,paddingVertical:5,gap:2},audioTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:20},audioTitle:{color:'#F4EFE4',fontSize:11,flex:1},audioStatus:{color:'#D6BA7A',paddingHorizontal:5},audioControls:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',minHeight:44},audioButton:{minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:11},audioPrimary:{backgroundColor:'#D6BA7A'},audioButtonText:{color:'#F4EFE4',fontSize:13,fontWeight:'700'},audioPrimaryText:{color:'#15342E'},audioMeta:{color:'#A8C1B8',fontSize:10,textAlign:'center',minHeight:13},audioError:{flex:1},audioMetaRow:{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},audioRetry:{minHeight:44,minWidth:54,alignItems:'center',justifyContent:'center'},audioRetryText:{color:'#D6BA7A',fontSize:12,fontWeight:'700'},
 modalRoot:{flex:1,backgroundColor:'#0B211D',paddingTop:10},modalHeader:{minHeight:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},modalTitle:{color:'#F4EFE4',fontSize:20,fontWeight:'600'},close:{width:48,height:48,alignItems:'center',justifyContent:'center'},search:{marginHorizontal:16,marginBottom:10,minHeight:48,borderWidth:1,borderColor:'#35544B',borderRadius:12,paddingHorizontal:14,color:'#F4EFE4',fontSize:16},numberRow:{flexDirection:'row',gap:10,paddingHorizontal:16,paddingBottom:10},numberInput:{flex:1,minHeight:48,borderWidth:1,borderColor:'#35544B',borderRadius:12,paddingHorizontal:12,color:'#F4EFE4'},chooseButton:{minWidth:90,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:'#35544B'},chooseText:{color:'#F4EFE4'},list:{paddingHorizontal:16,paddingBottom:30,gap:7},listItem:{minHeight:48,borderWidth:1,borderColor:'#35544B',borderRadius:12,padding:11,justifyContent:'center',gap:3},listMain:{color:'#F4EFE4',fontSize:15,textAlign:'right',writingDirection:'rtl'},listSub:{color:'#A8C1B8',fontSize:12},note:{color:'#A8C1B8',padding:12},
 bookRoot:{flex:1,backgroundColor:'#0B211D',paddingHorizontal:12},bookHeader:{minHeight:56,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:4},bookTitle:{color:'#F4EFE4',fontSize:18,fontWeight:'600'},bookClose:{width:48,height:48,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:'#15342E'},bookContent:{flex:1,minHeight:0,justifyContent:'center',paddingBottom:10},bookFrame:{flex:1,minHeight:0,maxHeight:900,alignSelf:'center',width:'100%',maxWidth:760,padding:7,borderRadius:20,backgroundColor:'#D6BA7A'},bookPaper:{flex:1,minHeight:0,borderRadius:14,backgroundColor:'#F4EFE4',paddingHorizontal:18,paddingVertical:12},bookPageHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:48,borderBottomWidth:1,borderColor:'#D8CDAF'},bookTextArea:{flex:1,minHeight:0,justifyContent:'center',paddingHorizontal:4},bookQuranText:{color:'#283E34',textAlign:'center',writingDirection:'rtl',includeFontPadding:false},bookFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:54,borderTopWidth:1,borderColor:'#D8CDAF'},bookPageButton:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center',borderRadius:11,backgroundColor:'#15342E'},bookPageNumber:{flex:1,textAlign:'center',color:'#536A5F',fontSize:13,fontWeight:'600'},
 settings:{gap:8,paddingBottom:24},settingLabel:{color:'#D6BA7A',fontSize:15,fontWeight:'700',marginTop:10},settingNote:{color:'#A8C1B8',fontSize:12,lineHeight:19},settingRow:{minHeight:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},settingChoice:{minHeight:46,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:'#35544B',borderRadius:11,paddingHorizontal:12},settingText:{color:'#F4EFE4',fontSize:14},settingButton:{minWidth:48,minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#35544B',borderRadius:10},flex:{flex:1},wrap:{flexDirection:'row',gap:6},speedButton:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:10,borderWidth:1,borderColor:'#35544B'},selected:{borderColor:'#D6BA7A',backgroundColor:'#193A32'},rangeRow:{flexDirection:'row',gap:8},rangeField:{flex:1,gap:4},rangeInput:{minHeight:44,borderWidth:1,borderColor:'#35544B',borderRadius:10,paddingHorizontal:10,color:'#F4EFE4'},actionButton:{minHeight:44,minWidth:54,alignItems:'center',justifyContent:'center',paddingHorizontal:10,borderRadius:10,borderWidth:1,borderColor:'#35544B'},downloadRow:{minHeight:48,flexDirection:'row',alignItems:'center',gap:7,borderBottomWidth:1,borderColor:'#203F36'},error:{color:'#F2A498',fontSize:12,flexShrink:1},trashIcon:{color:'#F4EFE4',fontSize:18},attribution:{minHeight:44,justifyContent:'center',alignItems:'flex-start'},rtl:{textAlign:'right',writingDirection:'rtl'},reverse:{flexDirection:'row-reverse'},
});
