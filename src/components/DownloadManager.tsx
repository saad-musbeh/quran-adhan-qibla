import { Pressable } from './Pressable';
import { Text } from '../text-size';
import { tafsirBooksForLanguage } from '../data/tafsir';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bilingual, isRTL, localeFor, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';
import { surahs } from '../domain/quran';
import { RECITERS, type ReciterId, type QuranAudioController } from '../use-quran-audio';
import type { useTafsirLibrary } from '../use-tafsir-library';
import type { AudioDownload } from '../domain/audio-downloads';

export function DownloadManager({language, audio, library}: {
  language: Language; audio: QuranAudioController; library: ReturnType<typeof useTafsirLibrary>;
}) {
  const {colors,styles} = useReaderStyles(baseStyles), insets = useSafeAreaInsets(), rtl = isRTL(language);
  const [visible,setVisible] = useState(false), [section,setSection] = useState<'saved'|'audio'|'tafsir'>('saved');
  const [voice,setVoice] = useState<ReciterId>(audio.reciter), [busy,setBusy] = useState(false), [failed,setFailed] = useState(false);
  const text = rtl ? styles.rtl : undefined;
  const say = (ar: string,en: string) => bilingual(language,ar,en);
  const number = (value:number) => value.toLocaleString(localeFor(language),{useGrouping:false});
  const size = (bytes:number) => `${(bytes / 1048576).toLocaleString(localeFor(language),{maximumFractionDigits:1})} ${say('م.ب','MB')}`;
  const voiceName = (id:string) => { const reader=RECITERS.find(item=>item.id===id); return language === 'ar' ? reader?.arabicName : reader?.name; };
  const refresh = async () => { setBusy(true); setFailed(false); try { await audio.refreshDownloads(); } catch { setFailed(true); } finally { setBusy(false); } };
  useEffect(()=>{if(visible){library.openLibrary();if(audio.isDownloading===null)void refresh();}},[visible,audio.isDownloading]);
  const canDelete = !busy && audio.isDownloading===null;
  const button = (label:string,action:()=>void,disabled=false,id?:string) => <Pressable testID={id} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}} disabled={disabled} style={[styles.button,disabled&&styles.disabled]} onPress={action}><Text style={[styles.buttonText,text]}>{label}</Text></Pressable>;
  const remove = (items:AudioDownload[]) => Alert.alert(say('حذف التسجيلات المحفوظة','Remove saved audio'),say('سيُحذف الصوت المحدد من هذا الجهاز. يمكنك تنزيله مرة أخرى.','The selected audio will be removed from this device. You can download it again.'),[
    {text:say('إلغاء','Cancel'),style:'cancel'},
    {text:say('حذف','Delete'),style:'destructive',onPress:()=>{setBusy(true);void audio.removeSavedAudio(items).catch(()=>setFailed(true)).finally(()=>setBusy(false));}},
  ]);
  const removeBook = (id:string,title:string) => Alert.alert(say('حذف التفسير','Remove tafsir'),title,[
    {text:say('إلغاء','Cancel'),style:'cancel'},
    {text:say('حذف','Delete'),style:'destructive',onPress:()=>{void library.deleteBook(id).catch(()=>setFailed(true));}},
  ]);
  const total = audio.savedAudio.reduce((sum,item)=>sum+item.bytes,0)+Object.values(library.bookBytes).reduce((a,b)=>a+b,0);
  const wholeQuranSaved = audio.savedAudio.filter(item=>item.reciter===voice&&item.complete).length===surahs.length;
  return <>
    {button(say('إدارة التنزيلات','Manage downloads'),()=>{setVoice(audio.reciter);setVisible(true);},false,'manage-downloads')}
    <Modal visible={visible} animationType="slide" onRequestClose={()=>setVisible(false)}>
      <View style={[styles.root,{paddingTop:insets.top,paddingBottom:insets.bottom}]} accessibilityViewIsModal>
        <View style={[styles.row,rtl&&styles.reverse]}><Text accessibilityRole="header" style={[styles.title,text]}>{say('التنزيلات','Downloads')}</Text>{button(say('إغلاق','Close'),()=>setVisible(false),false,'downloads-close')}</View>
        <Text style={[styles.note,text]}>{say('مساحة الصوت والتفسير المحفوظ','Saved audio and tafsir storage')}: {size(total)}</Text>
        <View style={[styles.row,rtl&&styles.reverse]}>{(['saved','audio','tafsir'] as const).map(value=><Pressable key={value} testID={`downloads-${value}`} accessibilityRole="tab" accessibilityState={{selected:section===value}} onPress={()=>setSection(value)} style={[styles.button,section===value&&styles.selected]}><Text style={[styles.buttonText,text]}>{value==='saved'?say('المحفوظ','Saved'):value==='audio'?say('التلاوات','Recitations'):say('التفسير','Tafsir')}</Text></Pressable>)}</View>
        {busy&&<ActivityIndicator color={colors.accent}/>}
        {audio.isDownloading!==null&&<View style={styles.panel}>
          {audio.downloadScope==='quran'&&<Text testID="whole-quran-progress" accessibilityLiveRegion="polite" style={[styles.label,text]}>{say('تنزيل القرآن كاملًا','Downloading whole Quran')} · {number(audio.downloadOverallProgress)}% · {number(audio.downloadCompletedSurahs)}/{number(114)} {say('سورة','surahs')}</Text>}
          <Text accessibilityLiveRegion="polite" style={[styles.note,text]}>{voiceName(audio.downloadingReciter??audio.reciter)} · {surahs.find(s=>s.number===audio.isDownloading)?.arabicName} · {number(audio.downloadProgress)}%</Text>
          {button(say('إلغاء التنزيل','Cancel download'),audio.cancelDownload,false,'audio-download-cancel')}
        </View>}
        {audio.downloadError&&<View style={styles.panel}><Text accessibilityRole="alert" style={[styles.note,text]}>{say('تعذر التنزيل. المحفوظ من الآيات سيبقى لإكمال التنزيل.','Download failed. Saved ayahs are kept so retry can continue.')}</Text>{button(say('إعادة محاولة التنزيل','Retry download'),()=>{void audio.retryDownload();},!audio.isOnline||audio.isDownloading!==null||busy)}</View>}
        {(failed||library.error)&&<Text accessibilityRole="alert" style={[styles.note,text]}>{say('تعذر إكمال العملية. حاول مجددًا.','Could not complete the operation. Try again.')}</Text>}
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
          {section==='saved'&&<>
            {button(say('تحديث المساحة','Refresh storage'),()=>{void refresh();},!canDelete)}
            {!audio.savedAudio.length&&<Text style={[styles.note,text]}>{say('لا توجد تلاوات محفوظة. اختر التلاوات لتنزيل سورة.','No saved recitations. Choose Recitations to download a surah.')}</Text>}
            {audio.savedAudio.map(item=><View key={`${item.reciter}:${item.surah}`} style={styles.panel}>
              <Text style={[styles.label,text]}>{surahs.find(s=>s.number===item.surah)?.arabicName} · {voiceName(item.reciter)}</Text>
              <Text testID={`saved-audio-${item.reciter}-${item.surah}`} style={[styles.note,text]}>{size(item.bytes)} · {item.complete?say('مكتمل','Complete'):say('تنزيل جزئي','Partial download')} · {number(item.verses)}/{number(item.total)}</Text>
              <View style={[styles.row,rtl&&styles.reverse]}>{!item.complete&&button(say('إكمال التنزيل','Continue download'),()=>{void audio.downloadSurah(item.surah,item.reciter as ReciterId);},!audio.isOnline||audio.isDownloading!==null||busy)}{button(say('حذف','Delete'),()=>remove([item]),!canDelete)}</View>
            </View>)}
            {audio.savedAudio.length>0&&button(say('حذف جميع التلاوات المحفوظة','Remove all saved recitations'),()=>remove(audio.savedAudio),!canDelete)}
          </>}
          {section==='audio'&&<>
            <View style={styles.panel}>
              <Text style={[styles.label,text]}>{voiceName(voice)}</Text>
              {button(wholeQuranSaved?say('القرآن كاملًا محفوظ','Whole Quran saved'):say('تنزيل القرآن كاملًا','Download whole Quran'),()=>{void audio.downloadQuran(voice);},wholeQuranSaved||busy||audio.isDownloading!==null||!audio.isOnline,'download-whole-quran')}
              <Text style={[styles.note,text]}>{say('تنزيل السور الـ١١٤ بصوت القارئ المختار. أبقِ التطبيق مفتوحًا. يمكنك الإلغاء ثم الضغط مجددًا للإكمال؛ ستبقى الآيات المحفوظة ولن تُنزّل مرة أخرى.','Download all 114 surahs for this voice. Keep the app open. Cancel anytime, then tap again to continue; saved ayahs are kept and skipped.')}</Text>
            </View>
            <Text style={[styles.note,text]}>{audio.isOnline?say('اختر قارئ التنزيل. تغيير هذا الخيار لا يغيّر التلاوة الحالية.','Choose a download voice. This does not change the current playback voice.'):say('التنزيل يحتاج إلى اتصال بالإنترنت.','An internet connection is needed to download.')}</Text>
            <View style={styles.choices}>{RECITERS.map(reader=><Pressable key={reader.id} accessibilityRole="radio" accessibilityState={{checked:voice===reader.id}} style={[styles.button,voice===reader.id&&styles.selected]} onPress={()=>setVoice(reader.id)}><Text style={[styles.buttonText,text]}>{language==='ar'?reader.arabicName:reader.name}</Text></Pressable>)}</View>
            {surahs.map(surah=>{
              const saved=audio.savedAudio.find(item=>item.reciter===voice&&item.surah===surah.number);
              return <View key={surah.number} style={[styles.row,styles.panel,rtl&&styles.reverse]}><Text style={[styles.label,text]}>{surah.arabicName}</Text>{button(saved?.complete?say('محفوظ','Saved'):say('تنزيل','Download'),()=>{void audio.downloadSurah(surah.number,voice);},Boolean(saved?.complete)||busy||audio.isDownloading!==null||!audio.isOnline)}</View>;
            })}
          </>}
          {section==='tafsir'&&tafsirBooksForLanguage(library.books,language).map(book=>{
            const saved=library.downloadedIds.includes(book.id), loading=library.isDownloading===book.id;
            return <View key={book.id} style={styles.panel}><Text style={[styles.label,isRTL(book.language??'ar')?styles.rtl:{textAlign:'left',writingDirection:'ltr'}]}>{book.shortTitle??book.title}</Text><Text style={[styles.note,text]}>{book.publisher}{saved?` · ${size(library.bookBytes[book.id]??0)}`:''}{loading?` · ${number(library.progress)}%`:''}</Text>
              <View style={[styles.row,rtl&&styles.reverse]}>{loading?button(say('إلغاء التنزيل','Cancel download'),library.cancelDownload):saved?<>{button(library.selectedId===book.id?say('التفسير المختار','Selected tafsir'):say('اختيار','Select'),()=>{void library.selectBook(book.id);},Boolean(library.isDownloading))}{button(say('حذف','Delete'),()=>removeBook(book.id,book.title),Boolean(library.isDownloading))}</>:button(say('تنزيل','Download'),()=>{void library.downloadBook(book.id);},!library.ready||Boolean(library.isDownloading)||!audio.isOnline)}</View>
            </View>;
          })}
        </ScrollView>
      </View>
    </Modal>
  </>;
}
const baseStyles=StyleSheet.create({
  root:{flex:1,backgroundColor:'#0B211D',paddingHorizontal:16,gap:12},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},reverse:{flexDirection:'row-reverse'},title:{flex:1,fontSize:23,color:'#FAF7EF',fontWeight:'600'},label:{flexShrink:1,fontSize:17,color:'#FAF7EF'},note:{fontSize:14,lineHeight:23,color:'#BCD0DF'},button:{minHeight:44,paddingHorizontal:12,paddingVertical:10,borderWidth:1,borderColor:'#DBAB68',borderRadius:12,alignItems:'center',justifyContent:'center'},buttonText:{fontSize:14,color:'#FAF7EF'},selected:{backgroundColor:'#15342E'},list:{gap:12,paddingBottom:24},panel:{borderWidth:1,borderColor:'#DBAB68',borderRadius:14,padding:12,gap:10},choices:{flexDirection:'row',flexWrap:'wrap',gap:8},rtl:{textAlign:'right',writingDirection:'rtl'},disabled:{opacity:.4},
});
