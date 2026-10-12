import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { useTafsirLibrary } from '../use-tafsir-library';
import { ScreenLayer } from './ScreenLayer';
import { QuranScreen, type QuranReaderSettings } from './QuranScreen';
import { createQuranBooks, readQuranBooks, readLegacyQuranBooks, LEGACY_QURAN_KEYS, QURAN_BOOKS_KEY, type QuranBook } from '../domain/quran-books';
import { getVerse, getSurah } from '../domain/quran';
import { getMushafPageVerses } from '../data/mushaf';
import { MUSHAF_PAGE_ASSETS } from '../data/mushaf-assets';
import { preloadMushafResources } from './MushafPageView';
import { bilingual, isRTL, localeFor, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';
import type { QuranAudioController } from '../use-quran-audio';

type Props = { tafsirLibrary: ReturnType<typeof useTafsirLibrary>; onBookOpenChange: (open:boolean)=>void; active: boolean; language: Language; audio: QuranAudioController; settings: QuranReaderSettings; onReadingChromeChange: (visible: boolean) => void; onSettingsChange: (settings: QuranReaderSettings) => void };

export function QuranLibrary(props: Props) {
  const { colors, styles } = useReaderStyles(baseStyles), { language, active } = props;
  const rtl = isRTL(language);
  const window=useWindowDimensions();
  const [shelfWidth,setShelfWidth]=useState(window.width);
  const columns=shelfWidth>=720?3:2;
  const cardWidth=(Math.min(shelfWidth,1100)-32-(columns-1)*12)/columns;
  const [books, setBooks] = useState(createQuranBooks);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [editing, setEditing] = useState<QuranBook | null>(null), [name, setName] = useState('');
  const writes = useRef(Promise.resolve());
  const nameOf = (book: QuranBook) => book.name || bilingual(language, 'المصحف {n}', 'Quran {n}', { n: (books.indexOf(book) + 1).toLocaleString(localeFor(language)) });
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(QURAN_BOOKS_KEY).then(async json => {
      // Existing six-book libraries always take precedence over legacy data.
      if (json !== null) { if (alive) setBooks(readQuranBooks(json)); return; }
      const legacy = await AsyncStorage.multiGet([...LEGACY_QURAN_KEYS]);
      if (alive) setBooks(readLegacyQuranBooks(legacy[0][1], legacy[1][1], legacy[2][1]));
    }).catch(() => undefined).finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    const json = JSON.stringify(books);
    writes.current = writes.current.catch(() => undefined).then(() => AsyncStorage.setItem(QURAN_BOOKS_KEY, json));
    void writes.current.catch(() => undefined);
  }, [books, ready]);
  useEffect(()=>{
    if (!ready) return;
    const timer=setTimeout(()=>{void preloadMushafResources(MUSHAF_PAGE_ASSETS[books[0].page]).catch(()=>undefined);},60);
    return()=>clearTimeout(timer);
  },[ready]);
  useEffect(() => { if (active && !selectedId) props.onReadingChromeChange(true); }, [active, selectedId, props.onReadingChromeChange]);
  useEffect(()=>{props.onBookOpenChange(Boolean(selectedId));},[selectedId,props.onBookOpenChange]);
  const choose = (id: string) => { setLastId(id); setSelectedId(id); props.onReadingChromeChange(false); };
  const saved = books.find(book => book.id === lastId);
  const updateBook = (id: string, change: (book: QuranBook) => QuranBook) => setBooks(values => values.map(book => book.id === id ? change(book) : book));
  return <View style={[styles.root,{backgroundColor:colors.appBackground}]}>
    <ScreenLayer active={!selectedId} background={colors.appBackground}>
      <ScrollView onLayout={event=>setShelfWidth(event.nativeEvent.layout.width)} contentContainerStyle={styles.shelf}>
        <Text style={[styles.heading,rtl&&styles.rtl]}>{bilingual(language,'مكتبتي القرآنية','My Quran library')}</Text>
        <Text style={[styles.hint,rtl&&styles.rtl]}>{bilingual(language,'لكل مصحف موضع قراءة وإشارات مرجعية مستقلة.','Each book keeps its own reading position and bookmarks.')}</Text>
        {!ready&&<ActivityIndicator color={colors.accent}/>}
        <View style={[styles.grid,rtl&&styles.reverse]}>{books.map(book => {
          const [s,a] = (getMushafPageVerses(book.page)[0]??'1:1').split(':').map(Number);
          const verse = getVerse(s,a), surah = verse ? getSurah(verse.surah) : undefined;
          const name = nameOf(book);
          return <View key={book.id} style={[styles.card,{width:cardWidth,maxWidth:cardWidth,flexBasis:cardWidth,flexGrow:0}]}>
            <Pressable testID={`open-${book.id}`} accessibilityRole="button" accessibilityLabel={`${name} · ${surah?.arabicName} · ${book.page}`} disabled={!ready} onPressIn={()=>{void preloadMushafResources(MUSHAF_PAGE_ASSETS[book.page]).catch(()=>undefined);}} onPress={()=>choose(book.id)} style={styles.cover}>
              <View pointerEvents="none" style={styles.coverFrame}><Ionicons name="book-outline" size={32} color={colors.accent}/><Text numberOfLines={2} style={styles.bookName}>{name}</Text></View>
              <Text style={styles.position}>{surah?.arabicName} · {bilingual(language,'صفحة {n}','Page {n}',{n:book.page.toLocaleString(localeFor(language))})}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={bilingual(language,'تسمية {name}','Rename {name}',{name})} testID={`rename-${book.id}`} style={styles.rename} onPress={()=>{setEditing(book);setName(book.name)}}><Ionicons name="pencil-outline" size={15} color={colors.accent}/><Text style={styles.renameText}>{bilingual(language,'تسمية المصحف','Rename book')}</Text></Pressable>
          </View>;
        })}</View>
      </ScrollView>
    </ScreenLayer>
    {saved&&<ScreenLayer active={Boolean(selectedId)} background={colors.appBackground}><QuranScreen {...props} onReadingChromeChange={visible=>props.onReadingChromeChange(selectedId?visible:true)} active={active&&Boolean(selectedId)} book={saved} onBookChange={change=>updateBook(saved.id,change)} onCloseBook={()=>{setSelectedId(null);props.onReadingChromeChange(true)}}/></ScreenLayer>}
    <Modal transparent visible={Boolean(editing)} animationType="fade" onRequestClose={()=>setEditing(null)}>
      <View style={styles.overlay}><View style={styles.editor}>
        <Text style={[styles.heading,rtl&&styles.rtl]}>{bilingual(language,'تسمية المصحف','Rename book')}</Text>
        <TextInput testID="book-name-input" autoFocus value={name} maxLength={40} onChangeText={setName} accessibilityLabel={bilingual(language,'اسم المصحف','Book name')} placeholder={bilingual(language,'اسم المصحف','Book name')} placeholderTextColor={colors.appMuted} style={[styles.input,rtl&&styles.rtl]}/>
        <View style={[styles.actions,rtl&&styles.reverse]}>
          <Pressable testID="save-book-name" accessibilityRole="button" style={styles.button} onPress={()=>{if(editing)updateBook(editing.id,book=>({...book,name:name.trim()}));setEditing(null)}}><Text style={styles.buttonText}>{bilingual(language,'حفظ','Save')}</Text></Pressable>
          <Pressable accessibilityRole="button" style={styles.button} onPress={()=>setEditing(null)}><Text style={styles.buttonText}>{bilingual(language,'إلغاء','Cancel')}</Text></Pressable>
        </View>
      </View></View>
    </Modal>
  </View>;
}
const baseStyles = StyleSheet.create({
  root:{flex:1},shelf:{width:'100%',maxWidth:1100,alignSelf:'center',paddingTop:58,paddingHorizontal:16,paddingBottom:80,gap:12},heading:{fontSize:23,fontWeight:'600',color:'#FAF7EF'},hint:{fontSize:13,lineHeight:21,color:'#BCD0DF'},grid:{flexDirection:'row',flexWrap:'wrap',gap:12},reverse:{flexDirection:'row-reverse'},card:{width:'48%',flexGrow:1,flexBasis:'45%',maxWidth:'49%',gap:2},cover:{minHeight:154,padding:10,gap:10,borderRadius:18,borderWidth:1,borderColor:'#DBAB68',backgroundColor:'#15342E'},coverFrame:{flex:1,minHeight:103,borderRadius:12,borderWidth:1,borderColor:'#DBAB68',alignItems:'center',justifyContent:'center',gap:8,padding:6},bookName:{color:'#FAF7EF',fontSize:17,fontWeight:'600',textAlign:'center'},position:{color:'#BCD0DF',fontSize:11,textAlign:'center'},rename:{minHeight:44,flexDirection:'row',gap:5,alignItems:'center',justifyContent:'center'},renameText:{fontSize:11,color:'#DBAB68'},rtl:{textAlign:'right',writingDirection:'rtl'},overlay:{flex:1,justifyContent:'center',padding:24,backgroundColor:'#0009'},editor:{padding:18,gap:16,borderRadius:20,borderWidth:1,borderColor:'#DBAB68',backgroundColor:'#18334A'},input:{minHeight:48,paddingHorizontal:12,borderWidth:1,borderColor:'#DBAB68',borderRadius:10,fontSize:17,color:'#FAF7EF'},actions:{flexDirection:'row',gap:10},button:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#DBAB68',borderRadius:12},buttonText:{color:'#FAF7EF',fontSize:16},
});
