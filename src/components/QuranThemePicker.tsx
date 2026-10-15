import { Pressable as NativePressable } from 'react-native';
import { Pressable } from './Pressable';
import { Text } from '../text-size';
import { bilingual, isRTL, type Language } from '../i18n';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { QURAN_THEMES, getQuranTheme, type QuranThemeId, type QuranThemeMode } from '../domain/quran-theme';

type Props = {
  visible: boolean;
  language: Language;
  themeId: QuranThemeId;
  mode: QuranThemeMode;
  onModeChange: (mode: QuranThemeMode) => void;
  onChoose: (id: QuranThemeId) => void;
  onClose: () => void;
};

export function QuranThemePicker({ visible, language, themeId, mode, onModeChange, onChoose, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const rtl = isRTL(language);
  const currentTheme = getQuranTheme(themeId, mode);
  const title = bilingual(language, 'لون التطبيق', 'App color');
  const closeLabel = bilingual(language, 'إغلاق', 'Close');

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={[styles.overlay, { paddingTop: Math.max(12, insets.top), paddingBottom: Math.max(8, insets.bottom) }]}>
      <NativePressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: currentTheme.appSurface, borderColor: currentTheme.appBorder }]}>
        <View style={[styles.header, rtl && styles.rtlRow]}>
          <Text accessibilityRole="header" style={[styles.title, { color: currentTheme.appText }, rtl && styles.rtlText]}>{title}</Text>
          <Pressable style={styles.close} accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose}>
            <Ionicons name="close" size={22} color={currentTheme.appText} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.options}>
          <View style={[styles.appearance, rtl && styles.rtlRow]} accessibilityLabel={bilingual(language, 'المظهر', 'Appearance')}>
            {(['light', 'dark'] as const).map(value => <Pressable key={value} testID={`theme-mode-${value}`} accessibilityRole="radio" accessibilityState={{checked:mode===value}}
              onPress={()=>onModeChange(value)} style={[styles.mode,{borderColor:currentTheme.appBorder,backgroundColor:mode===value?currentTheme.appBackground:'transparent'}]}>
              <Ionicons name={value==='light'?'sunny-outline':'moon-outline'} size={20} color={currentTheme.accent}/>
              <Text style={{color:currentTheme.appText}}>{value==='light'?bilingual(language,'فاتح','Light'):bilingual(language,'داكن','Dark')}</Text>
            </Pressable>)}
          </View>
          {QURAN_THEMES.map(baseTheme => {
            const theme = getQuranTheme(baseTheme.id, mode);
            const selected = theme.id === themeId;
            const label = bilingual(language, theme.arabicName, theme.name);
            return <Pressable
              key={theme.id}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ checked: selected }}
              testID={`theme-color-${theme.id}`}
              onPress={() => onChoose(theme.id)}
              style={[styles.option, rtl && styles.rtlRow, selected && { backgroundColor: theme.appBackground, borderColor: theme.accent }]}
            >
              <View style={[styles.swatchTarget, { borderColor: selected ? theme.accent : 'transparent' }]}>
                <View style={[styles.swatch, { backgroundColor: theme.appBackground, borderColor: theme.appBorder }]}>
                  <View style={[styles.swatchCenter, { backgroundColor: theme.ink }]} />
                </View>
              </View>
              <Text style={[styles.optionLabel, { color: currentTheme.appText }, rtl && styles.rtlText]}>{label}</Text>
              {selected ? <Ionicons name="checkmark" size={21} color={theme.appText} /> : <View style={styles.checkSpace} />}
            </Pressable>;
          })}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,28,40,.55)', paddingHorizontal: 10 },
  sheet: { maxHeight:'95%', borderWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden', paddingBottom: 12 },
  appearance: { flexDirection:'row', gap:8, paddingBottom:8 },
  mode: { flex:1, minHeight:48, borderWidth:1, borderRadius:9, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8 },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#D2DDE3' },
  title: { flex: 1, fontSize: 19, fontWeight: '700' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  options: { padding: 10, gap: 4 },
  option: { minHeight: 54, borderWidth: 1, borderColor: 'transparent', borderRadius: 9, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 9 },
  swatchTarget: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 24 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  swatchCenter: { width: 14, height: 14, borderRadius: 7 },
  optionLabel: { flex: 1, fontSize: 16, fontWeight: '600' },
  checkSpace: { width: 21, height: 21 },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
});
