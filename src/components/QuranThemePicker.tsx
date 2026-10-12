import { bilingual, localizeCopy, message, isRTL, localeFor, type Language } from '../i18n';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { QURAN_THEMES, getQuranTheme, type QuranThemeId } from '../domain/quran-theme';

type Props = {
  visible: boolean;
  language: Language;
  themeId: QuranThemeId;
  onChoose: (id: QuranThemeId) => void;
  onClose: () => void;
};

export function QuranThemePicker({ visible, language, themeId, onChoose, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const rtl = isRTL(language);
  const currentTheme = getQuranTheme(themeId);
  const title = bilingual(language, 'لون التطبيق', 'App color');
  const closeLabel = bilingual(language, 'إغلاق', 'Close');

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={[styles.overlay, { paddingTop: Math.max(12, insets.top), paddingBottom: Math.max(8, insets.bottom) }]}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} />
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: currentTheme.surface, borderColor: currentTheme.pale }]}>
        <View style={[styles.header, rtl && styles.rtlRow]}>
          <Text accessibilityRole="header" style={[styles.title, { color: currentTheme.ink }, rtl && styles.rtlText]}>{title}</Text>
          <Pressable style={styles.close} accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose}>
            <Ionicons name="close" size={22} color={currentTheme.ink} />
          </Pressable>
        </View>
        <View accessibilityLabel={title} style={styles.options}>
          {QURAN_THEMES.map(theme => {
            const selected = theme.id === themeId;
            const label = bilingual(language, theme.arabicName, theme.name);
            return <Pressable
              key={theme.id}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ checked: selected }}
              onPress={() => { onChoose(theme.id); onClose(); }}
              style={[styles.option, rtl && styles.rtlRow, selected && { backgroundColor: theme.pale, borderColor: theme.accent }]}
            >
              <View style={[styles.swatchTarget, { borderColor: selected ? theme.accent : 'transparent' }]}>
                <View style={[styles.swatch, { backgroundColor: theme.background, borderColor: theme.border }]}>
                  <View style={[styles.swatchCenter, { backgroundColor: theme.deep }]} />
                </View>
              </View>
              <Text style={[styles.optionLabel, { color: currentTheme.ink }, rtl && styles.rtlText]}>{label}</Text>
              {selected ? <Ionicons name="checkmark" size={21} color={theme.ink} /> : <View style={styles.checkSpace} />}
            </Pressable>;
          })}
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,28,40,.55)', paddingHorizontal: 10 },
  sheet: { borderWidth: StyleSheet.hairlineWidth, borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden', paddingBottom: 12 },
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
