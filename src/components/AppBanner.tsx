import { Pressable } from './Pressable';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, useTextScale } from '../text-size';
import { bilingual, isRTL, translations, type Language } from '../i18n';
import { useReaderTheme } from '../quran-theme-context';

export function AppBanner({language, top, showHome, onHome, onLanguages, onSettings}: {
  language: Language; top: number; showHome: boolean;
  onHome: () => void; onLanguages: () => void; onSettings: () => void;
}) {
  const { theme, mode, setMode } = useReaderTheme(), textScale = useTextScale(), rtl = isRTL(language);
  const t = translations[language];
  return <View testID="app-banner" style={[styles.header, {top, height: Math.max(48, 48 * textScale), backgroundColor: theme.appBackground,
    elevation: mode === 'light' ? 2 : 12, borderBottomColor: theme.appBorder}, rtl && styles.reverse]}>
    <Text numberOfLines={2} style={[styles.brand, {color: theme.appText}]}>{t.brand}</Text>
    <View style={[styles.tools, rtl && styles.reverse]}>
      {showHome && <Pressable testID="open-main-menu" accessibilityRole="button" accessibilityLabel={bilingual(language, 'القائمة الرئيسية', 'Main menu')} style={styles.button} onPress={onHome}>
        <Ionicons name="home-outline" color={theme.accent} size={23} />
      </Pressable>}
      <Pressable testID="open-languages" accessibilityRole="button" accessibilityLabel={t.language} style={styles.button} onPress={onLanguages}>
        <Ionicons name="language-outline" color={theme.accent} size={23} />
      </Pressable>
      <Pressable testID="toggle-appearance" accessibilityRole="button" accessibilityLabel={mode === 'dark'
        ? bilingual(language, 'التبديل إلى الوضع الفاتح', 'Switch to light mode')
        : bilingual(language, 'التبديل إلى الوضع الداكن', 'Switch to dark mode')} style={styles.button} onPress={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
        <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} color={theme.accent} size={23} />
      </Pressable>
      <Pressable testID="open-settings" accessibilityRole="button" accessibilityLabel={t.settings} style={styles.button} onPress={onSettings}>
        <Ionicons name="settings-outline" color={theme.accent} size={23} />
      </Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  header: {position: 'absolute', left: 0, right: 0, zIndex: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 2, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth},
  brand: {fontSize: 14, fontWeight: '600', flexShrink: 1}, tools: {flexDirection: 'row', gap: 2},
  button: {width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22}, reverse: {flexDirection: 'row-reverse'},
});
