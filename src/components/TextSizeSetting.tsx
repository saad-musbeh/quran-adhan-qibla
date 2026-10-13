import { Pressable, StyleSheet, View } from 'react-native';
import { bilingual, isRTL, localeFor, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';
import { DEFAULT_TEXT_SIZE, MAX_TEXT_SIZE, MIN_TEXT_SIZE, Text, textScaleForSize } from '../text-size';

export function TextSizeSetting({ language, size, onChange }: { language: Language; size: number; onChange: (size: number) => void }) {
  const { styles } = useReaderStyles(baseStyles);
  const rtl = isRTL(language);
  return <View style={styles.root}>
    <Text accessibilityRole="header" style={[styles.label, rtl && styles.rtl]}>{bilingual(language, 'حجم النص في التطبيق', 'App text size')} · {Math.round(textScaleForSize(size) * 100).toLocaleString(localeFor(language))}%</Text>
    <View style={[styles.row, rtl && styles.reverse]}>
      <Pressable testID="text-size-decrease" accessibilityRole="button" accessibilityLabel={bilingual(language, 'تصغير النص', 'Decrease text size')} accessibilityState={{disabled:size<=MIN_TEXT_SIZE}} disabled={size<=MIN_TEXT_SIZE} onPress={()=>onChange(Math.max(MIN_TEXT_SIZE,size-1))} style={styles.button}><Text style={styles.buttonText}>−</Text></Pressable>
      <Pressable testID="text-size-reset" accessibilityRole="button" accessibilityLabel={bilingual(language, 'إعادة حجم النص الافتراضي', 'Reset text size')} onPress={()=>onChange(DEFAULT_TEXT_SIZE)} style={[styles.button,styles.reset]}><Text style={styles.buttonText}>{bilingual(language, 'افتراضي', 'Default')}</Text></Pressable>
      <Pressable testID="text-size-increase" accessibilityRole="button" accessibilityLabel={bilingual(language, 'تكبير النص', 'Increase text size')} accessibilityState={{disabled:size>=MAX_TEXT_SIZE}} disabled={size>=MAX_TEXT_SIZE} onPress={()=>onChange(Math.min(MAX_TEXT_SIZE,size+1))} style={styles.button}><Text style={styles.buttonText}>+</Text></Pressable>
    </View>
    {size > DEFAULT_TEXT_SIZE && <Text style={[styles.note,rtl&&styles.rtl]}>{bilingual(language, 'يشمل القرآن والتفسير والقوائم. عند تكبير صفحة القرآن، اسحب لقراءة أطرافها أو اقلبها من حافة الصفحة.', 'Applies to Quran, tafsir, and menus. Pan enlarged Quran pages to read their edges, or turn from a page edge.')}</Text>}
  </View>;
}
const baseStyles=StyleSheet.create({root:{gap:8},label:{color:'#D6BA7A',fontSize:15,fontWeight:'700',marginTop:12},note:{color:'#A8C1B8',fontSize:13,lineHeight:22},row:{flexDirection:'row',gap:10},reverse:{flexDirection:'row-reverse'},button:{minWidth:48,minHeight:48,paddingHorizontal:12,paddingVertical:8,alignItems:'center',justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:'#DBAB68'},reset:{flex:1},buttonText:{fontSize:16,color:'#FAF7EF'},rtl:{textAlign:'right',writingDirection:'rtl'}});
