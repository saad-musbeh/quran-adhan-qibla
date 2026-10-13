import { Text, TextInput } from '../text-size';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { bilingual, isRTL, searchLanguages, type Language } from '../i18n';
import { useReaderTheme } from '../quran-theme-context';

const arabicLanguageNames: Record<Language,string> = {
  ar:'العربية',en:'الإنجليزية',id:'الإندونيسية',ur:'الأردية',bn:'البنغالية',tr:'التركية',fr:'الفرنسية',fa:'الفارسية',
  ms:'الملايوية',hi:'الهندية','pa-Arab':'البنجابية',ha:'الهوسا',sw:'السواحيلية',ps:'البشتوية',ru:'الروسية',uz:'الأوزبكية',
  so:'الصومالية',ckb:'الكردية (السورانية)',az:'الأذربيجانية',ml:'المالايالامية',ta:'التاميلية',ff:'الفولانية',de:'الألمانية',
  es:'الإسبانية','zh-Hans':'الصينية (المبسطة)',jv:'الجاوية',su:'السوندانية',yo:'اليوروبا',sd:'السندية',am:'الأمهرية',
  kk:'الكازاخية',ky:'القيرغيزية',tg:'الطاجيكية',sq:'الألبانية',bs:'البوسنية',
};
const normalizeLanguageSearch = (value:string) => value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();
type Props = { visible: boolean; language: Language; onChoose: (id: Language) => void; onClose: () => void };
export function LanguagePicker({ visible, language, onChoose, onClose }: Props) {
  const insets = useSafeAreaInsets(), { theme } = useReaderTheme();
  const rtl = isRTL(language), [query, setQuery] = useState('');
  useEffect(() => { if (visible) setQuery(''); }, [visible]);
  const nameOf = (item:{id:Language;name:string}) => bilingual(language,arabicLanguageNames[item.id],item.name);
  const choices = useMemo(() => {
    const canonical = searchLanguages(query), normalized = normalizeLanguageSearch(query.trim());
    return searchLanguages('').filter(item => canonical.includes(item) || normalizeLanguageSearch(nameOf(item)).includes(normalized));
  }, [query,language]);
  const close = bilingual(language, 'إغلاق', 'Close');
  const title = bilingual(language, 'اختر اللغة', 'Choose language');
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={[styles.overlay, { paddingTop: Math.max(12, insets.top), paddingBottom: Math.max(8, insets.bottom) }]}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={close} onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: theme.surface }]}>
        <View style={[styles.header, rtl && styles.reverse]}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.ink }, rtl && styles.rtl]}>{title}</Text>
          <Pressable style={styles.close} accessibilityRole="button" accessibilityLabel={close} onPress={onClose}><Ionicons name="close" size={23} color={theme.ink} /></Pressable>
        </View>
        <TextInput underlineColorAndroid="transparent" value={query} onChangeText={setQuery} autoCorrect={false} autoCapitalize="none" accessibilityLabel={bilingual(language, 'ابحث عن لغة', 'Search languages')} placeholder={bilingual(language, 'ابحث عن لغة', 'Search languages')} placeholderTextColor={theme.muted} style={[styles.search, { color: theme.ink, borderColor: theme.border }, rtl && styles.rtl]} />
        <FlatList data={choices} keyExtractor={item => item.id} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={[styles.empty, { color: theme.muted }]}>{bilingual(language, 'لا توجد لغات مطابقة', 'No languages found')}</Text>}
          renderItem={({ item }) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: language === item.id }} accessibilityLabel={`${item.nativeName}, ${nameOf(item)}`} onPress={() => { onChoose(item.id); onClose(); }} style={[styles.row, rtl && styles.reverse, language === item.id && { backgroundColor: theme.pale }]}>
            <View style={styles.names}><Text style={[styles.nativeName, { color: theme.ink, writingDirection: item.rtl ? 'rtl' : 'ltr' }]}>{item.nativeName}</Text>{nameOf(item) !== item.nativeName && <Text style={[styles.englishName, { color: theme.muted },rtl&&styles.rtl]}>{nameOf(item)}</Text>}</View>
            {language === item.id && <Ionicons name="checkmark" size={22} color={theme.ink} />}
          </Pressable>} />
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(12,28,40,.65)', paddingHorizontal: 12 },
  sheet: { maxHeight: '90%', flexShrink: 1, borderRadius: 18, overflow: 'hidden' },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  title: { flex: 1, fontSize: 20, fontWeight: '700' }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  search: { marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10, minHeight: 48, fontSize: 16 },
  list: { paddingHorizontal: 8, paddingBottom: 12 },
  row: { minHeight: 64, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10 },
  names: { flex: 1, gap: 3 }, nativeName: { fontSize: 18 }, englishName: { fontSize: 12 },
  empty: { padding: 24, textAlign: 'center' }, reverse: { flexDirection: 'row-reverse' }, rtl: { textAlign: 'right', writingDirection: 'rtl' },
});
