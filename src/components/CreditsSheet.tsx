import { Pressable } from './Pressable';
import { Text } from '../text-size';
import { Linking, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bilingual,isRTL,type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';
import { TAFSIR_BOOKS,tafsirBooksForLanguage } from '../data/tafsir';
import quranManifest from '../data/quran-manifest.json';
import { AMIRI_LICENSE,MUSHAF_LICENSE,TAFSIR_MIRROR_LICENSE } from '../data/content-licenses';
import { ADHAN_VOICES } from '../domain/adhan-voices';
import { HISN_LICENSE } from '../data/adhkar-license';
import { HISN_SOURCE } from '../domain/adhkar';

export function CreditsSheet({language,visible,onClose}:{language:Language;visible:boolean;onClose:()=>void}){
  const {styles,colors}=useReaderStyles(baseStyles),insets=useSafeAreaInsets(),rtl=isRTL(language);
  const listed=tafsirBooksForLanguage(TAFSIR_BOOKS,language);
  const credited=[...listed,...TAFSIR_BOOKS.filter(book=>!listed.some(item=>item.id===book.id))];
  const title=bilingual(language,'المصادر وحقوق النشر','Credits');
  const align={textAlign:rtl?'right' as const:'left' as const,writingDirection:rtl?'rtl' as const:'ltr' as const};
  const link=(label:string,url:string)=><Pressable accessibilityRole="link" style={styles.link} onPress={()=>{void Linking.openURL(url).catch(()=>undefined)}}><Text style={[styles.linkText,align]}>{label}</Text></Pressable>;
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><View accessibilityViewIsModal style={[styles.screen,{paddingTop:insets.top,paddingBottom:insets.bottom}]}>
    <View style={[styles.header,rtl&&{flexDirection:'row-reverse'}]}><Text accessibilityRole="header" style={styles.title}>{title}</Text><Pressable testID="credits-close" accessibilityRole="button" accessibilityLabel={bilingual(language,'إغلاق المصادر','Close credits')} style={styles.close} onPress={onClose}><Text style={{color:colors.accent,fontSize:30}}>×</Text></Pressable></View>
    <ScrollView testID="credits" contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={[styles.heading,align]}>{bilingual(language,'نص القرآن','Quran text')}</Text>
      {link('Tanzil Project · Uthmani 1.1 / metadata 1.0','https://tanzil.net')}
      <Text style={styles.notice}>{quranManifest.licenseNotice}</Text>
      <Text accessibilityRole="header" style={[styles.heading,align]}>{bilingual(language,'صفحات المصحف','Mushaf pages')}</Text>
      {link('King Fahd Glorious Quran Printing Complex · Hafs 1441 AH','https://dm.qurancomplex.gov.sa/rights/')}
      {link('Quran.ws · quran-svg · b4155f07e4aea087d2c458069acff9f7c7e749f6','https://github.com/quran-ws/quran-svg')}
      <Text style={styles.notice}>{MUSHAF_LICENSE}</Text>
      <Text accessibilityRole="header" style={[styles.heading,align]}>{bilingual(language,'كتب التفسير','Tafsir books')}</Text>
      {credited.map(book=><View key={book.id} style={styles.book}>
        {link(book.title,book.url)}
        <Text style={[styles.body,align]}>{book.publisher}</Text>
        <Text style={[styles.body,align]}>{book.sourceName??'QuranEnc.com'} · {book.version}</Text>
        {book.sourceEdition&&<Text style={[styles.body,align]}>{book.sourceEdition}</Text>}
        {book.publicationSource&&link(bilingual(language,'مرجع تاريخ النشر','Publication date reference'),book.publicationSource)}
        {book.compositionSource&&link(bilingual(language,'مرجع تاريخ التأليف','Composition date reference'),book.compositionSource)}
      </View>)}
      {link(bilingual(language,'QuranEnc · الناشرون وبيانات الطبعات وشروط إعادة الاستخدام','QuranEnc · publishers, edition metadata and reuse terms'),'https://quranenc.com/ar/home/api/')}
      {link(bilingual(language,'Quranpedia.net · طبعة المصدر 2026-08-10 · ترخيص البيانات','Quranpedia.net · source edition 2026-08-10 · data license'),'https://api.quranpedia.net/dumps/LICENSE.md')}
      <Text style={[styles.body,align]}>{bilingual(language,'تُحفظ نصوص QuranEnc ومعلومات ناشرها وإصدارها دون تعديل. نصوص الموسوعة القرآنية مأخوذة من تنزيلاتها الرسمية ذات بصمة SHA-256؛ تنسيقات HTML تُعرض كنصوص، والمقاطع المتكررة تُخزّن مرة واحدة مع الحفاظ على إحالات الآيات.','QuranEnc text and publisher/edition metadata are retained without edits. Quranpedia editions come from official SHA-256 verified dumps; HTML is displayed as text and repeated passages are stored once with their original verse references.')}</Text>
      {link(bilingual(language,'Tazkirul Quran · Goodword Books / CPS · الترجمة والتفسير متاحان دون قيود حقوق النشر','Tazkirul Quran · Goodword Books / CPS · translation and commentary copyright free'),'https://cpsglobal.org/sites/default/files/2025-01/Quran-Commentary.pdf')}
      {link(bilingual(language,'QUL · مصادر التفسير','QUL · tafsir source resources'),'https://qul.tarteel.ai/resources/tafsir')}
      {link(bilingual(language,'spa5k/tafsir_api · ترخيص المصدر الرقمي المحدد','spa5k/tafsir_api · pinned digital source license'),'https://github.com/spa5k/tafsir_api/blob/9ae590abdaaa38462f4f91cc141903aa6f72cc23/LICENSE')}
      <Text style={styles.notice}>{TAFSIR_MIRROR_LICENSE}</Text>
      <Text accessibilityRole="header" style={[styles.heading,align]}>{bilingual(language,'التلاوات والأذان','Recitations and Adhan')}</Text>
      {link('حصن المسلم · سعيد بن علي بن وهف القحطاني · Abdellah SELLAM',HISN_SOURCE)}
      <Text style={styles.notice}>{HISN_LICENSE}</Text>
      {link(bilingual(language,'تلاوات القرآن · EveryAyah.com','Quran recitations · EveryAyah.com'),'https://everyayah.com/')}
      {ADHAN_VOICES.map(voice=><View key={voice.id} style={styles.book}>
        {link(`${language==='ar'?voice.nameAr:voice.name} · ${voice.author}`,voice.source)}
        {link(voice.license,voice.license==='CC0 1.0'?'https://creativecommons.org/publicdomain/zero/1.0/':voice.license.includes('CC BY 3.0')?'https://creativecommons.org/licenses/by/3.0/':'https://creativecommons.org/licenses/by-sa/4.0/')}
        {voice.id==='short'&&link('Short Adhan · Atcovi / Aaqib Azeez · CC BY-SA 4.0','https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3')}
      </View>)}
      <Text style={[styles.body,align]}>{bilingual(language,'نُقّيت التسجيلات وسُوّي مستوى صوتها. الأذان القصير مقتطفات مرخصة؛ يجمع الفجر صوتين موثقين. أصوات الصلاة على النبي مقتطفات صوتية من الفيديو المرجعي الذي زُوّد به المشروع.','Recordings are cleaned and volume-matched. Short Adhan uses licensed excerpts; Fajr joins two credited voices. Salawat sounds are recorded speech excerpts from the reference video supplied to this project.')}</Text>
      <Text accessibilityRole="header" style={[styles.heading,align]}>{bilingual(language,'المدن والخريطة','Cities and map')}</Text>
      {link(bilingual(language,'أسماء الأماكن وإحداثياتها مستمدة من GeoNames · CC BY 4.0','Place names and coordinates adapted from GeoNames · CC BY 4.0'),'https://www.geonames.org')}
      {link('Creative Commons Attribution 4.0','https://creativecommons.org/licenses/by/4.0/')}
      {link('© OpenStreetMap contributors · ODbL','https://www.openstreetmap.org/copyright')}
      {link('Leaflet 1.9.4 · Vladimir Agafonkin / CloudMade · BSD-2-Clause','https://leafletjs.com')}
      <Text accessibilityRole="header" style={[styles.heading,align]}>{bilingual(language,'خط القرآن','Quran font')}</Text>
      {link('Amiri · The Amiri Project Authors · SIL Open Font License 1.1','https://github.com/aliftype/amiri')}
      <Text style={styles.notice}>{AMIRI_LICENSE}</Text>
      <Text accessibilityRole="header" style={[styles.heading,align]}>{bilingual(language,'ترجمات الواجهة','Interface translations')}</Text>
      <Text style={[styles.body,align]}>{bilingual(language,'ترجمات الواجهة مسودات آلية تنتظر مراجعة متحدثين أصليين.','Interface translations are machine-assisted drafts awaiting native-speaker review.')}</Text>
      {link('Google Translate','https://translate.google.com/')}
      {link('Unicode CLDR','https://cldr.unicode.org/')}
      {link(bilingual(language,'قرآن · أذان · قبلة · تراخيص المصادر والبرمجيات','Quran · Adhan · Qibla · source and software licenses'),'https://github.com/saad-musbeh/quran-adhan-qibla')}
    </ScrollView>
  </View></Modal>;
}
const baseStyles=StyleSheet.create({screen:{flex:1,backgroundColor:'#0B211D'},header:{paddingHorizontal:18,minHeight:58,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{fontSize:22,fontWeight:'600',color:'#F4EFE4'},close:{width:44,height:44,alignItems:'center',justifyContent:'center'},content:{width:'100%',maxWidth:760,alignSelf:'center',padding:20,gap:12},heading:{color:'#D6BA7A',fontSize:18,fontWeight:'700',marginTop:12},body:{color:'#A8C1B8',fontSize:13,lineHeight:22},notice:{color:'#A8C1B8',fontSize:12,lineHeight:20,textAlign:'left',writingDirection:'ltr'},link:{minHeight:44,justifyContent:'center'},linkText:{color:'#D6BA7A',fontSize:14,lineHeight:22,textDecorationLine:'underline'},book:{gap:4,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#35544B',paddingBottom:12}});
