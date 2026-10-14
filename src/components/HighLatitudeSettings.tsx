import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../text-size';
import { bilingual, isRTL, localizeCopy, type Language } from '../i18n';
import type { PrayerSettings } from '../domain/prayers';
import { useReaderStyles } from '../quran-theme-context';

export const highLatitudeCopy = {
  en: {
    title: 'High-latitude twilight', middle: 'Middle of the night', seventh: 'One seventh of the night', angle: 'Twilight angle',
    twilightNote: 'Limits Fajr and Isha when twilight is missing or the night is short. Fixed Isha intervals and Moonsighting Committee rules still follow the selected calculation method.',
    polar: 'Polar day and night', none: 'No approximation', nearest: 'Nearest usable latitude',
    polarNote: 'When sunrise or sunset is missing, estimate using a lower latitude at the same longitude and date. These are estimated times; follow the timetable agreed by your local mosque.',
    disabled: 'For locations at or beyond 65°, choose a polar approximation in Settings to calculate a schedule.',
    estimates: 'Polar approximation enabled · nearest usable latitude',
  },
  ar: {
    title: 'الشفق في خطوط العرض العليا', middle: 'منتصف الليل', seventh: 'سُبع الليل', angle: 'زاوية الشفق',
    twilightNote: 'تحدد الفجر والعشاء عند غياب الشفق أو قصر الليل. تبقى مدة العشاء الثابتة وقواعد لجنة رؤية الهلال وفق طريقة الحساب المختارة.',
    polar: 'النهار والليل القطبيان', none: 'دون تقدير', nearest: 'أقرب خط عرض قابل للحساب',
    polarNote: 'عند غياب الشروق أو الغروب، تُقدّر المواقيت بخط عرض أقرب إلى خط الاستواء، مع الإبقاء على خط الطول والتاريخ. هذه مواقيت تقديرية؛ اتبع الجدول المعتمد في مسجدك المحلي.',
    disabled: 'للمواقع عند خط عرض ٦٥° أو أكثر، اختر تقديرًا قطبيًا في الإعدادات لحساب المواقيت.',
    estimates: 'التقدير القطبي مفعّل · أقرب خط عرض قابل للحساب',
  },
};

export function HighLatitudeSettings({ language, settings, onChange }: {
  language: Language; settings: PrayerSettings; onChange: (value: PrayerSettings) => void;
}) {
  const { styles, colors } = useReaderStyles(baseStyles);
  const c = localizeCopy(language, highLatitudeCopy), rtl = isRTL(language);
  const [expanded, setExpanded] = useState(false);
  const rule = settings.highLatitudeRule ?? 'middle';
  const polar = settings.polarRule ?? 'none';
  const choice = (id: string, label: string, selected: boolean, onPress: () => void) =>
    <Pressable key={id} testID={id} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress}
      style={[styles.choice, rtl && styles.reverse, selected && { backgroundColor: colors.appRaised }]}>
      <Text style={[styles.text, rtl && styles.rtl]}>{label}</Text>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={21} color={colors.accent} />
    </Pressable>;
  return <View style={styles.section}>
    <Pressable testID="high-latitude-settings" accessibilityRole="button" accessibilityState={{ expanded }}
      onPress={() => setExpanded(value => !value)} style={[styles.choice, rtl && styles.reverse]}>
      <Text style={[styles.text, rtl && styles.rtl]}>{c.title} · {c[rule]}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.accent} />
    </Pressable>
    {expanded && <>
      {(['middle', 'seventh', 'angle'] as const).map(value => choice(`high-latitude-${value}`, c[value], rule === value,
        () => onChange({ ...settings, highLatitudeRule: value })))}
      <Text style={[styles.note, rtl && styles.rtl]}>{c.twilightNote}</Text>
      <Text accessibilityRole="header" style={[styles.heading, rtl && styles.rtl]}>{c.polar}</Text>
      {choice('polar-none', c.none, polar === 'none', () => onChange({ ...settings, polarRule: 'none' }))}
      {choice('polar-nearest-latitude', c.nearest, polar === 'nearest-latitude', () => onChange({ ...settings, polarRule: 'nearest-latitude' }))}
      <Text style={[styles.note, rtl && styles.rtl]}>{c.polarNote}</Text>
      <Text style={[styles.note, rtl && styles.rtl]}>{bilingual(language, 'تُستخدم القاعدة المختارة للتنبيهات أيضًا.', 'Prayer alerts use the same selected rules.')}</Text>
    </>}
  </View>;
}
const baseStyles = StyleSheet.create({
  section: { gap: 8 }, choice: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#35544B', borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { flex: 1, color: '#F4EFE4', fontSize: 14 }, note: { color: '#A8C1B8', fontSize: 13, lineHeight: 22 },
  heading: { color: '#D6BA7A', fontSize: 15, fontWeight: '600', marginTop: 6 }, reverse: { flexDirection: 'row-reverse' }, rtl: { textAlign: 'right', writingDirection: 'rtl' },
});
