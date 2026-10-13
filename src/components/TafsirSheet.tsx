import { Text } from '../text-size';
import { bilingual, localizeCopy, isRTL, localeFor, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getSurah, getVerse } from '../domain/quran';
import { tafsirBooksForLanguage,type TafsirBook } from '../data/tafsir';
import type { useTafsirLibrary } from '../use-tafsir-library';

type Props = { library: ReturnType<typeof useTafsirLibrary>; verseKey: string | null; language: Language; dark: boolean; quranFontLoaded: boolean; onClose: () => void };

export function TafsirSheet({ library, verseKey, language, dark, quranFontLoaded, onClose }: Props) { const {colors,styles}=useReaderStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const [showBooks, setShowBooks] = useState(false);
  const choiceRevision = useRef(0);
  const [pendingBook, setPendingBook] = useState<string|null>(null);
  const [removeError, setRemoveError] = useState(false);
  const [metadataBook,setMetadataBook]=useState<TafsirBook|null>(null);
  const [surah, ayah] = (verseKey ?? '').split(':').map(Number);
  const verse = getVerse(surah, ayah), book = library.selectedBook;
  const tafsir = verse ? library.getTafsir(surah, ayah) : undefined;
  const ink = dark ? colors.lightPaper : colors.ink, paper = dark ? colors.ink : colors.lightPaper;
  const headerPaper = dark ? colors.deep : colors.pale;
  const selectedPaper = dark ? colors.background : colors.pale;
  const ar = isRTL(language);
  const c = localizeCopy(language, { ar: {close:'إغلاق التفسير',books:'كتب التفسير',download:'تنزيل',saved:'محفوظ دون اتصال',remove:'حذف التنزيل',cancel:'إلغاء التنزيل',failure:'تعذر إكمال العملية. تحقق من الاتصال وحاول مجددًا.',hint:'نزّل كتابًا لقراءة تفسير كل الآيات دون اتصال.',back:'العودة إلى التفسير',unavailable:'اختر كتابًا محفوظًا لقراءة التفسير.'}, en: {close:'Close tafsir',books:'Tafsir books',download:'Download',saved:'Saved for offline reading',remove:'Delete download',cancel:'Cancel download',failure:'Could not complete the operation. Check your connection and retry.',hint:'Download a book to read tafsir for every verse offline.',back:'Back to tafsir',unavailable:'Choose a saved book to read tafsir.'} });
  const catalogue = showBooks || !library.selectedId || !library.downloadedIds.includes(library.selectedId);
  const books=tafsirBooksForLanguage(library.books,language);
  const bookRTL=isRTL(book?.language??'ar');
  useEffect(()=>{choiceRevision.current+=1;setShowBooks(false);setPendingBook(null);setRemoveError(false);setMetadataBook(null)},[verseKey]);
  useEffect(()=>{if(pendingBook&&library.selectedId===pendingBook&&library.downloadedIds.includes(pendingBook) ){setShowBooks(false);setPendingBook(null)}},[pendingBook,library.selectedId,library.downloadedIds,tafsir]);
  const choose = async (id:string) => { const revision=++choiceRevision.current;setRemoveError(false); await library.selectBook(id); if(revision!==choiceRevision.current)return; if(library.downloadedIds.includes(id)){setShowBooks(false);setPendingBook(null)} else {setPendingBook(id);await library.downloadBook(id)} };
  // A hidden catalogue must not format dates during reader startup.
  if (!verse) return null;
  return <Modal visible={Boolean(verse)} transparent animationType="fade" onRequestClose={onClose}>
    <View style={[styles.overlay, { paddingTop: Math.max(insets.top, 20), paddingBottom: insets.bottom }]}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={c.close} onPress={onClose}/>
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: paper, borderColor: colors.accent }]}>
        <View style={[styles.header,{backgroundColor:catalogue?headerPaper:paper,borderColor:colors.accent}]}>
          <Pressable style={styles.icon} accessibilityRole="button" accessibilityLabel={c.close} onPress={onClose}><Ionicons name="close" size={24} color={ink}/></Pressable>
          <View style={styles.titleGroup}><Text accessibilityRole="header" style={[styles.title,{color:ink},catalogue&&{textAlign:ar?'right':'left',writingDirection:ar?'rtl':'ltr'}]}>{catalogue?c.books:book?.title}</Text><Text style={[styles.reference,{color:ink}]}>{getSurah(surah)?.arabicName} · {ayah.toLocaleString(localeFor(language),{useGrouping:false})}</Text></View>
          <Pressable style={styles.icon} accessibilityRole="button" accessibilityLabel={catalogue?c.back:c.books} disabled={catalogue&&!library.selectedId} onPress={()=>setShowBooks(!catalogue)}><Ionicons name={catalogue?'document-text-outline':'library-outline'} size={23} color={ink}/></Pressable>
        </View>
        {catalogue?<ScrollView contentContainerStyle={styles.catalogue}>

          {!library.ready?<ActivityIndicator color="#79BCB7"/>:null}
          {books.map(item=>{
            const saved=library.downloadedIds.includes(item.id), loading=library.isDownloading===item.id, selected=library.selectedId===item.id;
            const itemRTL=isRTL(item.language??'ar');
            const alignment={textAlign:itemRTL?'right' as const:'left' as const,writingDirection:itemRTL?'rtl' as const:'ltr' as const};
            const label=`${loading?c.cancel:saved?c.saved:c.download}: ${item.title}`;
            return <View key={item.id} style={[styles.bookRow,{borderColor:colors.accent},selected&&{backgroundColor:selectedPaper}]}>
              <View style={styles.statusColumn}>
                <Pressable style={styles.icon} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected:saved,disabled:!library.ready||Boolean(library.isDownloading&&!loading)}} disabled={!library.ready||Boolean(library.isDownloading&&!loading)} onPress={()=>{if(loading){choiceRevision.current+=1;setPendingBook(null);library.cancelDownload()}else void choose(item.id)}}><Ionicons name={loading?'close-circle-outline':saved?'checkmark-circle-outline':'arrow-down-circle-outline'} size={32} color="#BD8744"/></Pressable>
                {loading?<Text style={[styles.progress,{color:ink}]}>{library.progress.toLocaleString(localeFor(language))}%</Text>:saved?<Pressable style={styles.icon} accessibilityRole="button" accessibilityLabel={`${c.remove}: ${item.title}`} onPress={()=>{setPendingBook(null);void library.deleteBook(item.id).catch(()=>setRemoveError(true))}}><Ionicons name="trash-outline" size={18} color={ink}/></Pressable>:null}
              </View>
              <Pressable style={styles.bookDetails} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected,disabled:!library.ready||Boolean(library.isDownloading&&!loading)}} disabled={!library.ready||Boolean(library.isDownloading&&!loading)} onPress={()=>{if(loading){choiceRevision.current+=1;setPendingBook(null);library.cancelDownload()}else void choose(item.id)}}>
                <Text style={[styles.bookTitle,{color:ink},alignment]}>{item.shortTitle??item.title}</Text>
                <View style={[styles.authorLine,itemRTL&&{flexDirection:'row-reverse'}]}>
                  <Text style={[styles.publisher,{color:ink,flex:1},alignment]}>{item.author??item.publisher}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={bilingual(language,'تفاصيل المصدر والطبعة: {title}','Source and edition details: {title}',{title:item.title})} onPress={event=>{event.stopPropagation();setMetadataBook(item)}} style={styles.dateButton}><Text style={[styles.edition,{color:ink}]}>{compactPublicationDate(item,language)}</Text></Pressable>
                </View>
              </Pressable>
            </View>;
          })}
          {library.error||removeError?<Text accessibilityRole="alert" style={[styles.error,{textAlign:ar?'right':'left',writingDirection:ar?'rtl':'ltr'}]}>{c.failure}</Text>:null}
        </ScrollView>:<ScrollView key={`${verseKey}-${book?.id}`} contentContainerStyle={styles.content}>
          <Text style={[styles.verse,quranFontLoaded&&{fontFamily:'AmiriQuran'},{color:ink}]}>{verse?.text}</Text>
          {tafsir?.passage&&<Text style={[styles.edition,{color:ink}]}>{bilingual(language,'تفسير المقطع: الآيات {from}–{to}','Passage commentary: verses {from}–{to}',{from:tafsir.passage.start.toLocaleString(localeFor(language)),to:tafsir.passage.end.toLocaleString(localeFor(language))})}</Text>}
          {library.isBookLoading?<ActivityIndicator color={colors.accent}/>:<Text style={[styles.explanation,{color:ink,textAlign:bookRTL?'right':'left',writingDirection:bookRTL?'rtl':'ltr'}]}>{tafsir?.text??bilingual(language,'لا يورد هذا المصدر تفسيرًا مستقلاً لهذه الآية. يمكنك اختيار كتاب آخر.','This source has no separate commentary for this verse. You can choose another book.')}</Text>}
          {tafsir?.footnotes?<Text style={[styles.footnotes,{color:ink,textAlign:bookRTL?'right':'left',writingDirection:bookRTL?'rtl':'ltr'}]}>{tafsir.footnotes}</Text>:null}

        </ScrollView>}
      </View>
      <Modal visible={Boolean(metadataBook)} transparent animationType="fade" onRequestClose={()=>setMetadataBook(null)}>
        <View style={styles.metadataOverlay}><View accessibilityViewIsModal style={[styles.metadataPanel,{backgroundColor:paper,borderColor:colors.accent}]}>
          <Pressable accessibilityRole="button" accessibilityLabel={c.close} style={styles.icon} onPress={()=>setMetadataBook(null)}><Ionicons name="close" color={ink} size={24}/></Pressable>
          <ScrollView contentContainerStyle={{gap:14,padding:20}}>
            <Text style={[styles.bookTitle,{color:ink}]}>{metadataBook?.title}</Text>
            <Text style={[styles.publisher,{color:ink}]}>{metadataBook?.publisher}</Text>
            <Text style={[styles.edition,{color:ink}]}>{metadataBook&&publicationLabel(metadataBook,language)}</Text>
            <Pressable accessibilityRole="link" onPress={()=>{if(metadataBook)void Linking.openURL(metadataBook.url).catch(()=>undefined)}}><Text style={[styles.edition,{color:ink}]}>{metadataBook?.sourceName??'QuranEnc.com'} · {metadataBook?.version}</Text></Pressable>
          </ScrollView>
        </View></View>
      </Modal>
    </View>
  </Modal>;
}
function publicationLabel(book:TafsirBook,language:Language):string {
  const first=book.firstPublicationHijri===null
    ?''
    :bilingual(language,'أول نشر للكتاب: {year} هـ','First book publication: {year} AH',{year:book.firstPublicationHijri.toLocaleString(localeFor(language),{useGrouping:false})});
  const edition=book.sourceEdition?'\n'+bilingual(language,'الطبعة المستخدمة: {edition}','Source edition: {edition}',{edition:book.sourceEdition}):'';
  const composition=book.compositionHijri?'\n'+bilingual(language,'تاريخ التأليف: {year} هـ','Composition year: {year} AH',{year:book.compositionHijri.toLocaleString(localeFor(language),{useGrouping:false})}):'';
  const details=first+composition+edition;
  return details.trim();
}
function compactPublicationDate(book:TafsirBook,language:Language):string{
  const year=book.firstPublicationHijri??book.compositionHijri??book.editionHijri;
  if(!year)return bilingual(language,'التفاصيل','Details');
  const label=book.firstPublicationHijri?'':book.compositionHijri?bilingual(language,'تأليف ','Written '):bilingual(language,'ط. ','Ed. ');
  return label+bilingual(language,'{year} هـ','{year} AH',{year:year.toLocaleString(localeFor(language),{useGrouping:false})});
}
const baseStyles=StyleSheet.create({
  authorLine:{flexDirection:'row',alignItems:'center',gap:12},dateButton:{minHeight:44,justifyContent:'center'},metadataOverlay:{flex:1,justifyContent:'center',alignItems:'center',padding:20,backgroundColor:'rgba(12,28,40,.65)'},metadataPanel:{width:'100%',maxWidth:640,maxHeight:'80%',borderRadius:20,borderWidth:1},
  overlay:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(12,28,40,.55)',paddingHorizontal:8},sheet:{maxHeight:'85%',borderTopLeftRadius:22,borderTopRightRadius:22,borderWidth:StyleSheet.hairlineWidth,overflow:'hidden'},header:{minHeight:76,flexDirection:'row',alignItems:'center',paddingHorizontal:8,borderBottomWidth:StyleSheet.hairlineWidth},icon:{width:44,height:44,alignItems:'center',justifyContent:'center'},titleGroup:{flex:1,paddingHorizontal:8,gap:4},title:{fontSize:20,fontWeight:'600',textAlign:'right',writingDirection:'rtl'},reference:{fontSize:14,textAlign:'right',writingDirection:'rtl'},content:{padding:22,gap:22},verse:{fontSize:25,lineHeight:48,textAlign:'right',writingDirection:'rtl'},explanation:{fontSize:20,lineHeight:36,textAlign:'right',writingDirection:'rtl'},footnotes:{fontSize:17,lineHeight:30,textAlign:'right',writingDirection:'rtl'},source:{minHeight:44,justifyContent:'center'},catalogue:{paddingBottom:18},hint:{fontSize:14,lineHeight:23,padding:16,textAlign:'right',writingDirection:'rtl'},bookRow:{flexDirection:'row',alignItems:'center',borderBottomWidth:StyleSheet.hairlineWidth,paddingVertical:12,paddingHorizontal:10,gap:8},statusColumn:{alignItems:'center',width:44},progress:{fontSize:12},bookDetails:{flex:1,gap:8,minHeight:70,justifyContent:'center'},bookTitle:{fontSize:22,fontWeight:'700',textAlign:'right',writingDirection:'rtl'},publisher:{fontSize:15,lineHeight:24,textAlign:'right',writingDirection:'rtl'},edition:{fontSize:12,lineHeight:22,opacity:.75,textAlign:'right',writingDirection:'rtl'},error:{color:'#A44130',fontSize:14,lineHeight:22,textAlign:'right',padding:16},
});
