import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SALAWAT_PREVIEW_AUDIO } from '../salawat-preview-audio';
import { Pressable } from './Pressable';
import { Text, useTextScale } from '../text-size';
import { bilingual, isRTL, localeFor, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';
import { formatClock, parseClock, SALAWAT_INTERVALS, SALAWAT_PHRASES, salawatMinutes, salawatPhrase, type DevotionalPreferences } from '../domain/devotional-reminders';

type Salawat = DevotionalPreferences['salawat'];

function intervalLabel(language: Language, minutes: number): string {
  if (minutes === 20) return bilingual(language, 'عشرون دقيقة', '20 minutes');
  if (minutes === 30) return bilingual(language, 'ثلاثون دقيقة', '30 minutes');
  if (minutes === 60) return bilingual(language, 'ساعة', '1 hour');
  if (minutes === 120) return bilingual(language, 'ساعتان', '2 hours');
  return bilingual(language, 'ثلاث ساعات', '3 hours');
}

function clockLabel(language: Language, value: string): string {
  const minute = parseClock(value) ?? 0;
  const date = new Date(2000, 0, 1, Math.floor(minute / 60), minute % 60);
  return date.toLocaleTimeString(localeFor(language), { hour: 'numeric', minute: '2-digit', hour12: true });
}

/** Three visible rows, snapping to the central selection; taps and screen-reader actions work too. */
function Wheel({ options, selected, onChange, label, testID, compact = false }: { options: { value: number; label: string }[]; selected: number; onChange: (value: number) => void; label: string; testID: string; compact?: boolean }) {
  const { styles } = useReaderStyles(baseStyles);
  const scale = useTextScale(), height = Math.max(48, 40 * scale);
  const scroll = useRef<ScrollView>(null);
  const index = Math.max(0, options.findIndex(option => option.value === selected));
  useEffect(() => { scroll.current?.scrollTo({ y: index * height, animated: false }); }, [index, height]);
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.max(0, Math.min(options.length - 1, Math.round(event.nativeEvent.contentOffset.y / height)));
    onChange(options[next].value);
  };
  return <View style={[styles.wheel, { height: height * 3 }, compact && { flex: 1, width: 'auto' }]}>
    <View pointerEvents="none" style={[styles.wheelBand, { top: height, height }]} />
    <ScrollView ref={scroll} testID={testID} snapToInterval={height} decelerationRate="fast" showsVerticalScrollIndicator={false} nestedScrollEnabled
      contentContainerStyle={{ paddingVertical: height }} style={{ flex: 1, minHeight: 0 }} onMomentumScrollEnd={settle}
      onScrollEndDrag={event => { if (!event.nativeEvent.velocity?.y) settle(event); }}
      accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ text: options[index].label }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => { const next = index + (event.nativeEvent.actionName === 'increment' ? 1 : -1); if (options[next]) onChange(options[next].value); }}>
      {options.map((option, optionIndex) => <Pressable key={option.value} testID={`${testID}-${option.value}`} accessibilityRole="button" accessibilityState={{ selected: optionIndex === index }} onPress={() => onChange(option.value)} style={[styles.wheelItem, { height }]}>
        <Text style={[styles.wheelText, optionIndex !== index && styles.faded]}>{option.label}</Text>
      </Pressable>)}
    </ScrollView>
  </View>;
}

function TimePicker({ value, onChange, language, label, testID }: { value: string; onChange: (value: string) => void; language: Language; label: string; testID: string }) {
  const { styles } = useReaderStyles(baseStyles);
  const [expanded, setExpanded] = useState(false);
  const minute = parseClock(value) ?? 480, hour = Math.floor(minute / 60);
  const number = (value: number) => value.toLocaleString(localeFor(language), { minimumIntegerDigits: 2, useGrouping: false });
  return <View style={styles.timeField}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={`${label}: ${clockLabel(language, value)}`} accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={styles.timeButton}>
      <Text style={styles.timeText}>{clockLabel(language, value)}</Text>
    </Pressable>
    {expanded && <View style={styles.timeWheels}>
      <Wheel compact testID={`${testID}-hour`} label={bilingual(language, 'الساعة', 'Hour')} options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: number(i + 1) }))} selected={hour % 12 || 12} onChange={next => onChange(formatClock(((next % 12) + (hour >= 12 ? 12 : 0)) * 60 + minute % 60))} />
      <Wheel compact testID={`${testID}-minute`} label={bilingual(language, 'الدقيقة', 'Minute')} options={Array.from({ length: 60 }, (_, i) => ({ value: i, label: number(i) }))} selected={minute % 60} onChange={next => onChange(formatClock(hour * 60 + next))} />
      <Wheel compact testID={`${testID}-period`} label={bilingual(language, 'الفترة', 'AM or PM')} options={[{ value: 0, label: bilingual(language, 'ص', 'AM') }, { value: 1, label: bilingual(language, 'م', 'PM') }]} selected={hour >= 12 ? 1 : 0} onChange={next => onChange(formatClock((hour % 12 + next * 12) * 60 + minute % 60))} />
    </View>}
  </View>;
}

export function SalawatReminders({ language, value, onChange, visible }: { language: Language; value: Salawat; onChange: (value: Salawat) => void; visible: boolean }) {
  const { styles, colors } = useReaderStyles(baseStyles), rtl = isRTL(language), insets = useSafeAreaInsets();
  const [dialog, setDialog] = useState<'schedule' | 'phrase' | null>(null);
  const [draft, setDraft] = useState(value);
  const [previewFailed, setPreviewFailed] = useState(false);
  const player = useAudioPlayer(null);
  const close = () => { player.pause(); setDialog(null); setPreviewFailed(false); };
  useEffect(() => { if (!visible) { player.pause(); setDialog(null); } }, [visible, player]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state !== 'active') player.pause(); });
    return () => listener.remove();
  }, [player]);
  const open = (next: 'schedule' | 'phrase') => { setDraft(value); setPreviewFailed(false); setDialog(next); };
  const row = (id: string, icon: React.ComponentProps<typeof Ionicons>['name'], title: string, detail: string, action: () => void) => <Pressable testID={id} accessibilityRole="button" onPress={action} style={[styles.row, rtl && styles.reverse]}>
    <Ionicons name={icon} size={24} color={colors.accent} />
    <View style={styles.rowCopy}><Text style={[styles.rowTitle, rtl && styles.rtl]}>{title}</Text><Text style={[styles.detail, rtl && styles.rtl]}>{detail}</Text></View>
    <Ionicons name={rtl ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.appMuted} />
  </Pressable>;
  const scheduleLabel = bilingual(language, 'اختيار وقت مخصص للتنبيه', 'Set reminder schedule');
  const phraseLabel = bilingual(language, 'صيغة الصلاة على النبي', 'Salawat phrase');
  const invalid = dialog === 'schedule' && !salawatMinutes({ ...draft, mode: 'interval' }).length;
  return <View style={styles.section}>
    {row('salawat-schedule', 'alarm-outline', scheduleLabel, value.mode === 'interval' ? `${clockLabel(language, value.start)} – ${clockLabel(language, value.end)} · ${intervalLabel(language, value.intervalMinutes)}` : value.mode === 'times' ? value.times.map(time => clockLabel(language, time)).join(' · ') : bilingual(language, 'مع مواقيت الصلاة', 'At prayer times'), () => open('schedule'))}
    {row('salawat-phrase', 'volume-medium-outline', phraseLabel, salawatPhrase(value.phrase).text, () => open('phrase'))}
    <Modal visible={visible && dialog !== null} transparent animationType="fade" onRequestClose={close}>
      <View style={[styles.overlay, { paddingTop: Math.max(20, insets.top), paddingBottom: Math.max(20, insets.bottom) }]}>
        <View accessibilityViewIsModal style={styles.dialog}>
          <ScrollView contentContainerStyle={styles.dialogContent} keyboardShouldPersistTaps="handled">
            {dialog === 'schedule' ? <>
              <Text accessibilityRole="header" style={styles.dialogTitle}>{scheduleLabel}</Text>
              <TimePicker language={language} label={bilingual(language, 'وقت بداية التنبيه', 'Reminder start time')} testID="salawat-window-start" value={draft.start} onChange={start => setDraft(value => ({ ...value, start }))} />
              <TimePicker language={language} label={bilingual(language, 'وقت نهاية التنبيه', 'Reminder end time')} testID="salawat-window-end" value={draft.end} onChange={end => setDraft(value => ({ ...value, end }))} />
              <Text style={styles.fieldLabel}>{bilingual(language, 'تكرار التنبيه كل', 'Repeat reminder every')}</Text>
              <View style={styles.intervalWheel}><Wheel testID="salawat-interval" label={bilingual(language, 'تكرار التنبيه كل', 'Repeat reminder every')} options={SALAWAT_INTERVALS.map(minutes => ({ value: minutes, label: intervalLabel(language, minutes) }))} selected={draft.intervalMinutes} onChange={intervalMinutes => setDraft(value => ({ ...value, intervalMinutes }))} /></View>
              {invalid && <Text accessibilityRole="alert" style={styles.error}>{bilingual(language, 'اجعل وقت النهاية بعد البداية، أو قصّر المدة بين البداية والنهاية أو اختر فترة تكرار أطول.', 'Set the end after the start, shorten the daily window, or choose a longer repeat interval.')}</Text>}
              {value.mode !== 'interval' && <Text style={styles.note}>{bilingual(language, 'حفظ هذا الجدول يستبدل أوقات التذكير الحالية.', 'Saving this schedule replaces the current reminder times.')}</Text>}
            </> : <>
              <Text accessibilityRole="header" style={styles.dialogTitle}>{phraseLabel}</Text>
              {SALAWAT_PHRASES.map(phrase => <Pressable key={phrase.id} testID={`salawat-phrase-${phrase.id}`} accessibilityRole="radio" accessibilityState={{ checked: draft.phrase === phrase.id }} onPress={() => {
                setDraft(value => ({ ...value, phrase: phrase.id })); setPreviewFailed(false);
                try { player.pause(); player.replace(SALAWAT_PREVIEW_AUDIO[phrase.id]); player.play(); } catch { setPreviewFailed(true); }
              }} style={[styles.phraseRow, rtl && styles.reverse]}>
                <Text style={styles.phraseText}>{phrase.text}</Text><Ionicons name="checkmark" size={28} color={draft.phrase === phrase.id ? colors.accent : colors.appMuted} style={{ opacity: draft.phrase === phrase.id ? 1 : 0.35 }} />
              </Pressable>)}
              {previewFailed && <Text accessibilityRole="alert" style={styles.error}>{bilingual(language, 'تعذر تشغيل الصوت. حاول مجددًا.', 'Could not play the sound. Try again.')}</Text>}
            </>}
          </ScrollView>
          <View style={[styles.actions, rtl && styles.reverse]}>
            <Pressable testID="salawat-dialog-save" accessibilityRole="button" disabled={invalid} accessibilityState={{ disabled: invalid }} onPress={() => {
              onChange(dialog === 'schedule' ? { ...value, start: draft.start, end: draft.end, intervalMinutes: draft.intervalMinutes, mode: 'interval' } : { ...value, phrase: draft.phrase }); close();
            }} style={[styles.save, invalid && styles.disabled]}><Text style={styles.saveText}>{bilingual(language, 'حفظ', 'Save')}</Text></Pressable>
            <Pressable testID="salawat-dialog-cancel" accessibilityRole="button" onPress={close} style={styles.cancel}><Text style={styles.cancelText}>{bilingual(language, 'إلغاء', 'Cancel')}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </View>;
}

const baseStyles = StyleSheet.create({
  section: { gap: 10 }, row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, minHeight: 78, borderRadius: 14, backgroundColor: '#15342E' }, reverse: { flexDirection: 'row-reverse' }, rowCopy: { flex: 1, gap: 6 }, rowTitle: { fontSize: 17, color: '#FAF7EF' }, detail: { fontSize: 14, lineHeight: 24, color: '#A8C1B8' }, rtl: { textAlign: 'right', writingDirection: 'rtl' },
  overlay: { flex: 1, backgroundColor: '#00000070', paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' }, dialog: { width: '100%', maxWidth: 480, maxHeight: '100%', backgroundColor: '#0B211D', borderRadius: 20, overflow: 'hidden' }, dialogContent: { padding: 22, gap: 20 }, dialogTitle: { color: '#A8C1B8', fontSize: 16, textAlign: 'center', lineHeight: 26 }, fieldLabel: { fontSize: 22, lineHeight: 34, color: '#FAF7EF', textAlign: 'center' }, timeField: { gap: 14, alignItems: 'center' }, timeButton: { minHeight: 48, backgroundColor: '#285146', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 8 }, timeText: { fontSize: 25, color: '#FAF7EF', textAlign: 'center' }, timeWheels: { flexDirection: 'row', direction: 'ltr', width: '100%', gap: 4 }, intervalWheel: { width: '100%' },
  wheel: { width: '100%', flexShrink: 0, overflow: 'hidden', minWidth: 56 }, wheelBand: { position: 'absolute', left: 0, right: 0, backgroundColor: '#15342E', borderRadius: 10 }, wheelItem: { alignItems: 'center', justifyContent: 'center' }, wheelText: { color: '#FAF7EF', fontSize: 23, fontWeight: '600', textAlign: 'center' }, faded: { opacity: 0.35 }, actions: { flexDirection: 'row', justifyContent: 'center', gap: 28, padding: 20, paddingTop: 6 }, save: { minHeight: 48, minWidth: 100, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#DBAB68', borderRadius: 10, justifyContent: 'center' }, saveText: { color: '#102A25', fontSize: 17, textAlign: 'center' }, cancel: { minHeight: 48, minWidth: 100, paddingHorizontal: 18, paddingVertical: 10, justifyContent: 'center', borderWidth: 1, borderColor: '#35544B', borderRadius: 10 }, cancelText: { fontSize: 17, color: '#FAF7EF', textAlign: 'center' }, disabled: { opacity: 0.4 }, phraseRow: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 58, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#35544B', paddingVertical: 10 }, phraseText: { flex: 1, fontSize: 21, lineHeight: 36, color: '#FAF7EF', textAlign: 'right', writingDirection: 'rtl' }, error: { color: '#F0B9A1', fontSize: 14, lineHeight: 24, textAlign: 'center' }, note: { color: '#A8C1B8', fontSize: 14, lineHeight: 24, textAlign: 'center' },
});
