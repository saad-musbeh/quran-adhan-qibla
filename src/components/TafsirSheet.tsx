import { bilingual, localizeCopy, message, isRTL, localeFor, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getSurah, getVerse } from '../domain/quran';
import type { TafsirBook } from '../data/tafsir';
import type { useTafsirLibrary } from '../use-tafsir-library';

type Props = { library: ReturnType<typeof useTafsirLibrary>; verseKey: string | null; language: Language; dark: boolean; quranFontLoaded: boolean; onClose: () => void };

export function TafsirSheet({ library, verseKey, language, dark, quranFontLoaded, onClose }: Props) { const {colors,styles}=useReaderStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const [showBooks, setShowBooks] = useState(false);
  const choiceRevision = useRef(0);
  const [pendingBook, setPendingBook] = useState<string|null>(null);
  const [removeError, setRemoveError] = useState(false);
  const [surah, ayah] = (verseKey ?? '').split(':').map(Number);
  const verse = getVerse(surah, ayah), book = library.selectedBook;
  const tafsir = verse ? library.getTafsir(surah, ayah) : undefined;
  const ink = dark ? colors.lightPaper : colors.ink, paper = dark ? colors.ink : colors.lightPaper;
  const headerPaper = dark ? colors.deep : colors.pale;
  const selectedPaper = dark ? colors.background : colors.pale;
  const ar = isRTL(language);
  const c = localizeCopy(language, { ar: {close:'إغلاق التفسير',books:'كتب التفسير',download:'تنزيل',saved:'محفوظ دون اتصال',remove:'حذف التنزيل',cancel:'إلغاء التنزيل',failure:'تعذر إكمال العملية. تحقق من الاتصال وحاول مجددًا.',hint:'نزّل كتابًا لقراءة تفسير كل الآيات دون اتصال.',back:'العودة إلى التفسير',unavailable:'اختر كتابًا محفوظًا لقراءة التفسير.'}, en: {close:'Close tafsir',books:'Tafsir books',download:'Download',saved:'Saved for offline reading',remove:'Delete download',cancel:'Cancel download',failure:'Could not complete the operation. Check your connection and retry.',hint:'Download a book to read tafsir for every verse offline.',back:'Back to tafsir',unavailable:'Choose a saved book to read tafsir.'} });
  const catalogue = showBooks || !tafsir;
  useEffect(()=>{choiceRevision.current+=1;setShowBooks(false);setPendingBook(null);setRemoveError(false)},[verseKey]);
  useEffect(()=>{if(pendingBook&&library.selectedId===pendingBook&&library.downloadedIds.includes(pendingBook)&&tafsir){setShowBooks(false);setPendingBook(null)}},[pendingBook,library.selectedId,library.downloadedIds,tafsir]);
  const choose = async (id:string) => { const revision=++choiceRevision.current;setRemoveError(false); await library.selectBook(id); if(revision!==choiceRevision.current)return; if(library.downloadedIds.includes(id)){setShowBooks(false);setPendingBook(null)} else {setPendingBook(id);await library.downloadBook(id)} };
  // A hidden catalogue must not format dates during reader startup.
  if (!verse) return null;
  return <Modal visible={Boolean(verse)} transparent animationType="fade" onRequestClose={onClose}>
    <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 20), paddingBottom: insets.bottom }]}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={c.close} onPress={onClose}/>
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: paper, borderColor: colors.accent }]}>
        <View style={[styles.header,{backgroundColor:catalogue?headerPaper:paper,borderColor:colors.accent}]}>
          <Pressable style={styles.icon} accessibilityRole="button" accessibilityLabel={c.close} onPress={onClose}><Ionicons name="close" size={24} color={ink}/></Pressable>
          <View style={styles.titleGroup}><Text accessibilityRole="header" style={[styles.title,{color:ink},catalogue&&{textAlign:ar?'right':'left',writingDirection:ar?'rtl':'ltr'}]}>{catalogue?c.books:book?.title}</Text><Text style={[styles.reference,{color:ink}]}>{getSurah(surah)?.arabicName} · {String(ayah).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)])}</Text></View>
          <Pressable style={styles.icon} accessibilityRole="button" accessibilityLabel={catalogue?c.back:c.books} disabled={catalogue&&!tafsir} onPress={()=>setShowBooks(!catalogue)}><Ionicons name={catalogue?'document-text-outline':'library-outline'} size={23} color={ink}/></Pressable>
        </View>
        {catalogue?<ScrollView contentContainerStyle={styles.catalogue}>
          <Text style={[styles.hint,{color:ink,textAlign:ar?'right':'left',writingDirection:ar?'rtl':'ltr'}]}>{c.hint}</Text>
          {!library.ready?<ActivityIndicator color="#79BCB7"/>:null}
          {library.books.map(item=>{
            const saved=library.downloadedIds.includes(item.id), loading=library.isDownloading===item.id, selected=library.selectedId===item.id;
            const label=`${loading?c.cancel:saved?c.saved:c.download}: ${item.title}`;
            return <View key={item.id} style={[styles.bookRow,{borderColor:colors.accent},selected&&{backgroundColor:selectedPaper}]}>
              <View style={styles.statusColumn}>
                <Pressable style={styles.icon} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:saved,disabled:!library.ready||Boolean(library.isDownloading&&!loading)}} disabled={!library.ready||Boolean(library.isDownloading&&!loading)} onPress={()=>{if(loading){choiceRevision.current+=1;setPendingBook(null);library.cancelDownload()}else void choose(item.id)}}><Ionicons name={loading?'close-circle-outline':saved?'checkmark-circle-outline':'arrow-down-circle-outline'} size={32} color="#BD8744"/></Pressable>
                {loading?<Text style={[styles.progress,{color:ink}]}>{library.progress}%</Text>:saved?<Pressable style={styles.icon} accessibilityRole="button" accessibilityLabel={`${c.remove}: ${item.title}`} onPress={()=>{setPendingBook(null);void library.deleteBook(item.id).catch(()=>setRemoveError(true))}}><Ionicons name="trash-outline" size={18} color={ink}/></Pressable>:null}
              </View>
              <Pressable style={styles.bookDetails} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected,disabled:!library.ready||Boolean(library.isDownloading&&!loading)}} disabled={!library.ready||Boolean(library.isDownloading&&!loading)} onPress={()=>{if(loading){choiceRevision.current+=1;setPendingBook(null);library.cancelDownload()}else void choose(item.id)}}>
                <Text style={[styles.bookTitle,{color:ink}]}>{item.title}</Text><Text style={[styles.publisher,{color:ink}]}>{item.publisher}</Text><Text style={[styles.edition,{color:ink}]}>{publicationLabel(item,language)}</Text><Text style={[styles.edition,{color:ink}]}>QuranEnc.com · {item.version}</Text>
              </Pressable>
            </View>;
          })}
          {library.error||removeError?<Text accessibilityRole="alert" style={[styles.error,{textAlign:ar?'right':'left',writingDirection:ar?'rtl':'ltr'}]}>{c.failure}</Text>:null}
        </ScrollView>:<ScrollView key={`${verseKey}-${book?.id}`} contentContainerStyle={styles.content}>
          <Text style={[styles.verse,quranFontLoaded&&{fontFamily:'AmiriQuran'},{color:ink}]}>{verse?.text}</Text>
          {tafsir?.passage&&<Text style={[styles.edition,{color:ink}]}>{bilingual(language,'تفسير المقطع: الآيات {from}–{to}','Passage commentary: verses {from}–{to}',{from:tafsir.passage.start.toLocaleString(localeFor(language)),to:tafsir.passage.end.toLocaleString(localeFor(language))})}</Text>}
          <Text style={[styles.explanation,{color:ink}]}>{tafsir?.text??c.unavailable}</Text>
          {tafsir?.footnotes?<Text style={[styles.footnotes,{color:ink}]}>{tafsir.footnotes}</Text>:null}
          <Pressable accessibilityRole="link" onPress={()=>{if(book)void Linking.openURL(book.url).catch(()=>undefined)}} style={styles.source}><Text style={[styles.edition,{color:ink}]}>{book&&publicationLabel(book,language)}{`\n`}{book?.publisher} · QuranEnc.com · {book?.version}</Text></Pressable>
        </ScrollView>}
      </View>
    </View>
  </Modal>;
}
function publicationLabel(book:TafsirBook,language:Language):string {
  const first=book.firstPublicationHijri===null
    ?bilingual(language,'أول نشر للكتاب: غير موثق في المصدر','First book publication: not documented by the source')
    :bilingual(language,'أول نشر للكتاب: {year} هـ','First book publication: {year} AH',{year:book.firstPublicationHijri.toLocaleString(localeFor(language),{useGrouping:false})});
  try {
    // Hermes Android rejects multi-part calendar options. Use one locale
    // extension, replacing the Gregorian extension used by prayer dates.
    const locale=localeFor(language).split('-u-')[0]+'-u-ca-islamic-umalqura';
    const formatter=new Intl.DateTimeFormat(locale,{year:'numeric',month:'numeric',day:'numeric',timeZone:'UTC'});
    const calendar=formatter.resolvedOptions().calendar;
    if (calendar && calendar!=='islamic-umalqura') return first;
    const date=formatter.format(new Date(`${book.firstDigitalPublication}T12:00:00Z`));
    return first+'\n'+bilingual(language,'أول إصدار رقمي على QuranEnc: {date}','First QuranEnc digital edition: {date}',{date});
  } catch {
    // Keep the documented publication year when a device cannot format this
    // calendar; optional edition metadata must never terminate the reader.
    return first;
  }
}
const baseStyles=StyleSheet.create({
  overlay:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(12,28,40,.55)',paddingHorizontal:8},sheet:{maxHeight:'85%',borderTopLeftRadius:22,borderTopRightRadius:22,borderWidth:StyleSheet.hairlineWidth,overflow:'hidden'},header:{minHeight:76,flexDirection:'row',alignItems:'center',paddingHorizontal:8,borderBottomWidth:StyleSheet.hairlineWidth},icon:{width:44,height:44,alignItems:'center',justifyContent:'center'},titleGroup:{flex:1,paddingHorizontal:8,gap:4},title:{fontSize:20,fontWeight:'600',textAlign:'right',writingDirection:'rtl'},reference:{fontSize:14,textAlign:'right',writingDirection:'rtl'},content:{padding:22,gap:22},verse:{fontSize:25,lineHeight:48,textAlign:'right',writingDirection:'rtl'},explanation:{fontSize:20,lineHeight:36,textAlign:'right',writingDirection:'rtl'},footnotes:{fontSize:17,lineHeight:30,textAlign:'right',writingDirection:'rtl'},source:{minHeight:44,justifyContent:'center'},catalogue:{paddingBottom:18},hint:{fontSize:14,lineHeight:23,padding:16,textAlign:'right',writingDirection:'rtl'},bookRow:{flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,paddingVertical:12,paddingHorizontal:10,gap:8},statusColumn:{alignItems:'center',width:44},progress:{fontSize:12},bookDetails:{flex:1,gap:8,minHeight:70,justifyContent:'center'},bookTitle:{fontSize:22,fontWeight:'700',textAlign:'right',writingDirection:'rtl'},publisher:{fontSize:15,lineHeight:24,textAlign:'right',writingDirection:'rtl'},edition:{fontSize:12,lineHeight:22,opacity:.75,textAlign:'right',writingDirection:'rtl'},error:{color:'#A44130',fontSize:14,lineHeight:22,textAlign:'right',padding:16},
});
