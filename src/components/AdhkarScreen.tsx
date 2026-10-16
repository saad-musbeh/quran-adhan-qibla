import { useEffect, useRef, useState } from 'react';
import { BackHandler, Linking, Modal, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from './Pressable';
import { Text } from '../text-size';
import { bilingual, isRTL, localeFor, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';
import { ADHKAR_COLLECTIONS, adhkar, collectionComplete, HISN_SOURCE, incrementDhikr, type AdhkarCollection, type Dhikr } from '../domain/adhkar';
import { adhkarTitle, collectionTitle } from '../adhkar-i18n';
import type { DevotionalPreferences } from '../domain/devotional-reminders';

type Props = {
  language: Language; active: boolean; testing: DevotionalPreferences['testing']; onReminders: () => void;
  request: { id: number; collection: AdhkarCollection | null };
  onReadingChange?: (reading: boolean) => void;
};

export function AdhkarScreen({ language, active, testing, onReminders, request, onReadingChange }: Props) {
  const { styles, colors } = useReaderStyles(baseStyles), rtl = isRTL(language), insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [fontLoaded] = useFonts({ AmiriQuran: require('../../assets/quran/AmiriQuran.ttf') });
  const [collection, setCollection] = useState<AdhkarCollection | null>(null);
  const [index, setIndex] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [source, setSource] = useState<Dhikr | 'book' | null>(null);
  const scroll = useRef<ScrollView>(null);
  const align = rtl ? styles.rtl : undefined;
  const entries = collection ? adhkar[collection] : [];
  const single = testing.single;
  const open = (id: AdhkarCollection | null) => { setCollection(id); setIndex(0); setCounts({}); scroll.current?.scrollTo({ y: 0, animated: false }); };
  useEffect(()=>{onReadingChange?.(collection!==null);},[collection,onReadingChange]);
  useEffect(() => { if (request.id > 0) open(request.collection); }, [request.id]);
  useEffect(() => {
    if (!active || !collection || source) return;
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { setCollection(null); return true; });
    return () => listener.remove();
  }, [active, collection, source]);
  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [index, single]);
  const iconButton = (id: string, label: string, icon: React.ComponentProps<typeof Ionicons>['name'], action: () => void) => <Pressable testID={id} accessibilityRole="button" accessibilityLabel={label} onPress={action} style={styles.icon}><Ionicons name={icon} size={24} color={colors.accent} /></Pressable>;
  const renderEntry = (entry: Dhikr, entryIndex: number) => <View key={entry.id} testID={`dhikr-${entry.id}`} style={styles.entry}>
    <View style={[styles.row, rtl && styles.reverse]}><Text style={styles.position}>{(entryIndex + 1).toLocaleString(localeFor(language))}</Text>{iconButton(`dhikr-source-${entry.id}`, bilingual(language, 'المصدر', 'Source'), 'information-circle-outline', () => setSource(entry))}</View>
    <Text selectable style={[styles.arabic, fontLoaded && { fontFamily: 'AmiriQuran' }]}>{entry.text}</Text>
    {testing.counters && <Pressable testID={`dhikr-count-${entry.id}`} accessibilityRole="button" accessibilityLabel={bilingual(language, 'العدد', 'Count')} accessibilityValue={{ min: 0, max: entry.count, now: counts[entry.id] ?? 0 }} onPress={() => setCounts(value => incrementDhikr(value, entry))} style={[styles.count, (counts[entry.id] ?? 0) >= entry.count && { borderColor: colors.accent }]}>
      <Text style={styles.countText}>{`${(counts[entry.id] ?? 0).toLocaleString(localeFor(language))} / ${entry.count.toLocaleString(localeFor(language))}`}</Text>
    </Pressable>}
  </View>;
  return <View style={styles.root}>
    <View style={[styles.header, rtl && styles.reverse]}>
      {collection && iconButton('adhkar-back', bilingual(language, 'رجوع', 'Back'), rtl ? 'arrow-forward' : 'arrow-back', () => open(null))}
      <Text accessibilityRole="header" style={[styles.title, align]}>{collection ? collectionTitle(language, collection) : adhkarTitle(language)}</Text>
      {iconButton('adhkar-reminders', bilingual(language, 'التذكيرات', 'Reminders'), 'notifications-outline', onReminders)}
      {!collection && iconButton('adhkar-source', bilingual(language, 'المصدر', 'Source'), 'information-circle-outline', () => setSource('book'))}
    </View>
    <ScrollView ref={scroll} testID="adhkar-content" contentContainerStyle={styles.content}>
      {!collection ? <View style={[styles.books, rtl && styles.reverse]}>{ADHKAR_COLLECTIONS.map(id => <Pressable key={id} testID={`adhkar-${id}`} accessibilityRole="button" accessibilityLabel={collectionTitle(language,id)} onPress={() => open(id)} style={[styles.book, { width: width >= 720 ? '30%' : '100%' }]}>
        <Ionicons name="book-outline" size={36} color={colors.accent} /><Text style={styles.bookTitle}>{collectionTitle(language,id)}</Text>
      </Pressable>)}</View> : <>
        {(single ? entries.slice(index,index+1) : entries).map((entry,offset) => renderEntry(entry,single ? index : offset))}
        {testing.counters && collectionComplete(entries,counts) && <Text testID="adhkar-complete" accessibilityRole="alert" style={[styles.complete,align]}>{bilingual(language,'اكتمل','Complete')}</Text>}
        {testing.counters && <Pressable testID="adhkar-reset" accessibilityRole="button" onPress={()=>setCounts({})} style={styles.action}><Text style={styles.actionText}>{bilingual(language,'بدء من جديد','Start again')}</Text></Pressable>}
      </>}
    </ScrollView>
    {collection && single && <View style={[styles.pager,rtl&&styles.reverse]}>
      <Pressable testID="dhikr-previous" accessibilityRole="button" disabled={index===0} accessibilityState={{disabled:index===0}} onPress={()=>setIndex(value=>Math.max(0,value-1))} style={[styles.action,index===0&&styles.disabled]}><Text style={styles.actionText}>{bilingual(language,'السابق','Previous')}</Text></Pressable>
      <Text style={styles.position}>{(index+1).toLocaleString(localeFor(language))} / {entries.length.toLocaleString(localeFor(language))}</Text>
      <Pressable testID="dhikr-next" accessibilityRole="button" disabled={index>=entries.length-1} accessibilityState={{disabled:index>=entries.length-1}} onPress={()=>setIndex(value=>Math.min(entries.length-1,value+1))} style={[styles.action,index>=entries.length-1&&styles.disabled]}><Text style={styles.actionText}>{bilingual(language,'التالي','Next')}</Text></Pressable>
    </View>}
    <Modal visible={source!==null} animationType="slide" onRequestClose={()=>setSource(null)}>
      <View style={[styles.root,{paddingTop:insets.top,paddingBottom:insets.bottom}]}>
        <View style={[styles.header,rtl&&styles.reverse]}><Text style={[styles.title,align]}>{bilingual(language,'المصدر','Source')}</Text>{iconButton('dhikr-source-close',bilingual(language,'إغلاق','Close'),'close',()=>setSource(null))}</View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sourceTitle,styles.rtl]}>حصن المسلم — سعيد بن علي بن وهف القحطاني</Text>
          {source && source!=='book' && <Text selectable style={[styles.reference,styles.rtl]}>{source.reference}</Text>}
          <Pressable accessibilityRole="link" style={styles.action} onPress={()=>{void Linking.openURL(HISN_SOURCE).catch(()=>undefined)}}><Text style={styles.actionText}>Abdellah SELLAM · HisnElMuslim · MIT ↗</Text></Pressable>
        </ScrollView>
      </View>
    </Modal>
  </View>;
}

const baseStyles = StyleSheet.create({
  root:{flex:1,backgroundColor:'#0B211D'},header:{minHeight:56,paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:4},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},reverse:{flexDirection:'row-reverse'},
  title:{flex:1,fontSize:21,fontWeight:'600',color:'#FAF7EF'},icon:{minWidth:44,minHeight:48,alignItems:'center',justifyContent:'center'},content:{width:'100%',maxWidth:900,alignSelf:'center',padding:18,gap:20,paddingBottom:28},
  books:{flexDirection:'row',flexWrap:'wrap',gap:16,justifyContent:'center'},book:{minHeight:150,padding:22,gap:18,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#DBAB68',borderRadius:16,backgroundColor:'#15342E'},bookTitle:{fontSize:23,color:'#FAF7EF',textAlign:'center'},
  entry:{paddingBottom:20,gap:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#35544B'},position:{fontSize:14,color:'#A8C1B8'},arabic:{fontSize:25,lineHeight:51,textAlign:'right',writingDirection:'rtl',color:'#FAF7EF'},count:{minHeight:48,alignSelf:'center',minWidth:116,padding:12,borderWidth:1,borderColor:'#DBAB68',borderRadius:12,alignItems:'center'},countText:{fontSize:18,color:'#FAF7EF'},
  pager:{padding:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},action:{minHeight:48,paddingHorizontal:16,paddingVertical:12,borderWidth:1,borderColor:'#DBAB68',borderRadius:12,justifyContent:'center'},actionText:{fontSize:15,color:'#FAF7EF',textAlign:'center'},disabled:{opacity:.4},complete:{fontSize:20,color:'#D6BA7A',textAlign:'center'},sourceTitle:{fontSize:23,lineHeight:40,color:'#FAF7EF'},reference:{fontSize:18,lineHeight:32,color:'#A8C1B8'},rtl:{textAlign:'right',writingDirection:'rtl'},
});
