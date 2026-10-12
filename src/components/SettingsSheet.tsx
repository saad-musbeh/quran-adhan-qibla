import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { methods, type PrayerSettings } from '../domain/prayers';
import { translations, isRTL, localizeCopy, bilingual, type Language } from '../i18n';
import type { Tab } from './SwipeTabs';
import { useReaderStyles, useReaderTheme } from '../quran-theme-context';
import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { QuranThemePicker } from './QuranThemePicker';

const copy = {
  ar: { close: 'إغلاق الإعدادات', compass: 'عرض اتجاه القبلة', live: 'بوصلة الهاتف', north: 'عرض ثابت نحو الشمال الحقيقي', liveNote: 'ضع الهاتف مستويًا، وابتعد عن المعادن. يستخدم اتجاه الشمال الحقيقي عند توفر قراءة موثوقة.', northNote: 'الشمال الحقيقي أعلى الشاشة. هذا العرض ثابت ولا يتبع حركة الهاتف.' },
  en: { close: 'Close settings', compass: 'Qibla direction view', live: 'Phone compass', north: 'Fixed true-north view', liveNote: 'Hold your phone flat, away from metal. Uses true north when a reliable heading is available.', northNote: 'True north is at the top. This view stays fixed as you move the phone.' },
};

type Props = {
  language: Language; visible: boolean; section: Tab; onSectionChange: (section: Tab) => void;
  onClose: () => void; prayer: PrayerSettings; onPrayerChange: (value: PrayerSettings) => void;
  timezone: string; compassMode: 'live' | 'north'; onCompassModeChange: (mode: 'live' | 'north') => void;
  quran: ReactNode; notifications: ReactNode;
};

export function SettingsSheet({ language, visible, section, onSectionChange, onClose, prayer, onPrayerChange, timezone, compassMode, onCompassModeChange, quran, notifications }: Props) {
  const { styles } = useReaderStyles(baseStyles);
  const { theme, themeId, setThemeId } = useReaderTheme();
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  useEffect(() => { if (!visible) setThemePickerVisible(false); }, [visible]);
  const t = translations[language]; const c = localizeCopy(language, copy); const rtl = isRTL(language);
  const insets = useSafeAreaInsets();
  const textStyle = rtl ? styles.rtl : undefined;
  function choice(label: string, selected: boolean, onPress: () => void) {
    return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress}
      style={[styles.choice, selected && styles.selected, rtl && styles.reverse]}>
      <Text style={[styles.choiceText, textStyle]}>{label}</Text><Text style={styles.mark}>{selected ? '✓' : ''}</Text>
    </Pressable>;
  }
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[styles.header, rtl && styles.reverse]}><Text style={styles.title}>{t.settings}</Text>
        <Pressable accessibilityRole="button" testID="settings-close" accessibilityLabel={c.close} onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
      </View>
      <View style={[styles.sections, rtl && styles.reverse]}>{(['quran', 'adhan', 'qibla'] as const).map(value =>
        <Pressable key={value} testID={`settings-${value}`} accessibilityRole="tab" accessibilityState={{ selected: section === value }} onPress={() => onSectionChange(value)}
          style={[styles.section, section === value && styles.selected]}><Text style={styles.choiceText}>{t[value]}</Text></Pressable>)}</View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <QuranThemePicker visible={themePickerVisible} language={language} themeId={themeId} onChoose={setThemeId} onClose={() => setThemePickerVisible(false)} />
        <Pressable accessibilityRole="button" accessibilityLabel={bilingual(language, 'لون التطبيق', 'App color')} style={[styles.choice, rtl && styles.reverse]} onPress={() => setThemePickerVisible(true)}>
          <View style={[styles.colorChoice, rtl && styles.reverse]}><Ionicons name="color-palette-outline" size={22} color={theme.accent} /><Text style={[styles.choiceText, textStyle]}>{bilingual(language, 'لون التطبيق', 'App color')} · {bilingual(language, theme.arabicName, theme.name)}</Text></View>
          <Text style={styles.mark}>›</Text>
        </Pressable>
        {section === 'quran' ? quran : section === 'qibla' ? <>
          <Text style={[styles.label, textStyle]}>{c.compass}</Text>
          {choice(c.live, compassMode === 'live', () => onCompassModeChange('live'))}
          {choice(c.north, compassMode === 'north', () => onCompassModeChange('north'))}
          <Text style={[styles.note, textStyle]}>{compassMode === 'live' ? c.liveNote : c.northNote}</Text>
        </> : <>
          {notifications}
          <Text style={[styles.label, textStyle]}>{t.method}</Text>
          {methods.map(method => <View key={method.id}>{choice(t[method.label], prayer.method === method.id, () => onPrayerChange({ ...prayer, method: method.id }))}</View>)}
          <Text style={[styles.label, textStyle]}>{t.asrSchool}</Text>
          {choice(t.standardAsr, !prayer.hanafi, () => onPrayerChange({ ...prayer, hanafi: false }))}
          {choice(t.hanafiAsr, prayer.hanafi, () => onPrayerChange({ ...prayer, hanafi: true }))}
          {prayer.method === 0 && <><View style={[styles.switchRow, rtl && styles.reverse]}>
            <Text style={[styles.choiceText, textStyle]}>{t.ramadan}</Text>
            <Switch accessibilityLabel={t.ramadan} value={prayer.ramadan} onValueChange={ramadan => onPrayerChange({ ...prayer, ramadan })}
              trackColor={{ false: '#35544B', true: '#D6BA7A' }} thumbColor="#F4EFE4" />
          </View><Text style={[styles.note, textStyle]}>{t.normalIsha}</Text></>}
          {[t.highLatitude, t.verifyTimes, `${t.phoneTimezone}: ${timezone}`].map(note => <Text key={note} style={[styles.note, textStyle]}>{note}</Text>)}
        </>}
      </ScrollView>
    </View>
  </Modal>;
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B211D' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, minHeight: 58 },
  title: { color: '#F4EFE4', fontSize: 21, fontWeight: '600' }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, closeText: { color: '#D6BA7A', fontSize: 32 },
  sections: { flexDirection: 'row', gap: 8, padding: 14 }, section: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#35544B' },
  content: { paddingHorizontal: 18, paddingBottom: 28, gap: 10 }, label: { color: '#D6BA7A', fontWeight: '700', fontSize: 15, marginTop: 12 },
  choice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#35544B', borderRadius: 12, gap: 8 },
  colorChoice: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  choiceText: { color: '#F4EFE4', fontSize: 14, flexShrink: 1 }, mark: { color: '#D6BA7A', fontSize: 18 }, selected: { borderColor: '#D6BA7A', backgroundColor: '#193A32' },
  note: { color: '#A8C1B8', fontSize: 13, lineHeight: 22 }, switchRow: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' }, reverse: { flexDirection: 'row-reverse' },
});
