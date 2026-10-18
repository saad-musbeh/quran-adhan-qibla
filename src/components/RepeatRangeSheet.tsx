import { Pressable as NativePressable } from 'react-native';
import { Pressable } from './Pressable';
import { Text, TextInput } from '../text-size';
import { parseLocalizedInteger } from '../domain/localized-number';
import { localizeCopy, isRTL, localeFor, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getSurah, surahs } from '../domain/quran';
import type { AudioRange, QuranAudioController } from '../use-quran-audio';

type Props = {
  visible: boolean;
  language: Language;
  audio: QuranAudioController;
  initialVerseKey: string | null;
  initialRange?: AudioRange | null;
  onChooseOnPage?: () => void;
  onClose: () => void;
};

const localizedNumber = (number: number, language: Language) => number.toLocaleString(localeFor(language), { useGrouping: false });

export function RepeatRangeSheet({ visible, language, audio, initialVerseKey, initialRange, onChooseOnPage, onClose }: Props) { const {colors,styles}=useReaderStyles(baseStyles);
  const insets = useSafeAreaInsets();
  const rtl = isRTL(language);
  const copy = localizeCopy(language, { ar: {
    title: 'تكرار آيات', close: 'إغلاق', chapter: 'السورة', from: 'من الآية', to: 'إلى الآية',
    choose: 'اختر السورة', start: 'بدء التكرار', stop: 'إيقاف التكرار', invalid: 'أدخل نطاق آيات صحيحًا ضمن السورة المختارة.',
    playError: 'تعذر بدء التلاوة. حاول مرة أخرى.', active: 'النطاق النشط', surahEnd: 'فارغة = نهاية السورة', onPage: 'اختيار الآيات من الصفحة',
  }, en: {
    title: 'Repeat verses', close: 'Close', chapter: 'Surah', from: 'From verse', to: 'To verse',
    choose: 'Choose surah', start: 'Start repeating', stop: 'Stop repeating', invalid: 'Enter a valid verse range within the selected surah.',
    playError: 'Could not start recitation. Try again.', active: 'Active range', surahEnd: 'Empty = end of surah', onPage: 'Choose ayahs on the page',
  } });
  const ink = colors.ink;
  const muted = colors.muted;
  const paper = colors.lightPaper;
  const accent = colors.border;
  const paleBlue = colors.pale;
  const seed = useMemo(() => {
    const active = initialRange ?? audio.repeatRange;
    const parsed = (active ? `${active.surah}:${active.start}` : initialVerseKey ?? audio.currentVerseKey ?? '1:1').split(':').map(Number);
    const surah = getSurah(parsed[0]) ? parsed[0] : 1;
    const start = Math.min(Math.max(1, parsed[1] || 1), getSurah(surah)!.verseCount);
    const end = active?.surah === surah ? active.end : null;
    return { surah, start, end };
  }, [audio.currentVerseKey, audio.repeatRange, initialVerseKey, initialRange]);
  const [surahNumber, setSurahNumber] = useState(seed.surah);
  const [startText, setStartText] = useState(String(seed.start));
  const [endText, setEndText] = useState(String(seed.end??''));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [validationError, setValidationError] = useState(false);
  const beginRevision=useRef(0);
  const [starting,setStarting]=useState(false);
  const [playError, setPlayError] = useState(false);
  const chapter = getSurah(surahNumber)!;
  const activeRange = audio.repeatRange;

  const wasVisible = useRef(false);
  useEffect(() => {
    const opening = visible && !wasVisible.current;
    wasVisible.current = visible;
    if (!opening) return;
    beginRevision.current+=1;setStarting(false);
    setSurahNumber(seed.surah);
    setStartText(String(seed.start));
    setEndText(String(seed.end??''));
    setValidationError(false);
    setPlayError(false);
    setPickerVisible(false);
  }, [visible, seed.surah, seed.start, seed.end]);

  const close = () => {
    beginRevision.current+=1;setStarting(false);
    Keyboard.dismiss();
    setPickerVisible(false);
    onClose();
  };

  const chooseSurah = (number: number) => {
    setSurahNumber(number);
    setStartText('1');
    setEndText('');
    setValidationError(false);
    setPickerVisible(false);
  };

  const beginRepeat = async () => {
    const start = parseLocalizedInteger(startText);
    const end = endText.trim()?parseLocalizedInteger(endText):chapter.verseCount;
    if (!start || !end || start < 1 || end < start || end > chapter.verseCount) {
      setValidationError(true);
      setPlayError(false);
      return;
    }
    Keyboard.dismiss();
    setValidationError(false);
    setPlayError(false);
    const revision=++beginRevision.current;setStarting(true);
    try {
      await audio.playRange(surahNumber, start, end);
      if(revision===beginRevision.current)close();
    } catch {
      if(revision===beginRevision.current)setPlayError(true);
    } finally {if(revision===beginRevision.current)setStarting(false)}
  };

  const stopRepeat = () => {
    audio.setRepeatRange(null);
    close();
  };

  return <>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={[styles.overlay, { paddingTop: Math.max(12, insets.top), paddingBottom: Math.max(8, insets.bottom) }]}>
        <NativePressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={copy.close} onPress={close} />
        <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: paper, borderColor: '#D2DDE3' }]}>
          <View style={[styles.header, rtl && styles.rtlRow]}>
            <Pressable testID="repeat-close" style={styles.close} accessibilityRole="button" accessibilityLabel={copy.close} onPress={close}>
              <Ionicons name="close" size={23} color={ink} />
            </Pressable>
            <View style={styles.titleGroup}>
              <Text accessibilityRole="header" style={[styles.title, { color: ink }, rtl && styles.rtlText]}>{copy.title}</Text>
              {activeRange ? <Text style={[styles.active, { color: muted }, rtl && styles.rtlText]}>{copy.active}: {getSurah(activeRange.surah)?.arabicName} · {localizedNumber(activeRange.start, language)}–{localizedNumber(activeRange.end, language)}</Text> : null}
            </View>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={[styles.label, { color: ink }, rtl && styles.rtlText]}>{copy.chapter}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`${copy.choose}: ${chapter.arabicName}`} onPress={() => { Keyboard.dismiss(); setPickerVisible(true); }} style={[styles.surahButton, { backgroundColor: paleBlue }, rtl && styles.rtlRow]}>
              <Text style={[styles.surahName, { color: ink }]}>{chapter.arabicName}</Text>
              <Text style={[styles.surahMeta, { color: muted }]}>{localizedNumber(surahNumber, language)} · {localizedNumber(chapter.verseCount, language)}</Text>
              <Ionicons name="chevron-down" size={18} color={ink} />
            </Pressable>

            <View style={[styles.inputsRow, rtl && styles.rtlRow]}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: ink }, rtl && styles.rtlText]}>{copy.from}</Text>
                <TextInput testID="repeat-from" accessibilityLabel={copy.from} keyboardType="number-pad" value={startText} onChangeText={value => { setStartText(value); setValidationError(false); }} selectTextOnFocus style={[styles.input, { color: ink, borderColor: validationError ? '#B6533F' : '#CAD7DF' }, rtl && styles.rtlText]} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: ink }, rtl && styles.rtlText]}>{copy.to}</Text>
                <TextInput testID="repeat-to" accessibilityLabel={copy.to} accessibilityHint={copy.surahEnd} placeholder={localizedNumber(chapter.verseCount,language)} placeholderTextColor={muted} keyboardType="number-pad" value={endText} onChangeText={value => { setEndText(value); setValidationError(false); }} selectTextOnFocus style={[styles.input, { color: ink, borderColor: validationError ? '#B6533F' : '#CAD7DF' }, rtl && styles.rtlText]} />
              </View>
            </View>
            <Text style={[styles.active,{color:muted},rtl&&styles.rtlText]}>{copy.surahEnd}</Text>
            {validationError ? <Text accessibilityRole="alert" style={[styles.error, rtl && styles.rtlText]}>{copy.invalid}</Text> : null}
            {playError ? <Text accessibilityRole="alert" style={[styles.error, rtl && styles.rtlText]}>{copy.playError}</Text> : null}
          </ScrollView>
          <View style={styles.footer}>
            {onChooseOnPage?<Pressable accessibilityRole="button" onPress={()=>{beginRevision.current+=1;setStarting(false);Keyboard.dismiss();setPickerVisible(false);onChooseOnPage()}} style={[styles.secondaryButton,{borderColor:accent,backgroundColor:paleBlue}]}><Text style={[styles.secondaryText,{color:ink}]}>{copy.onPage}</Text></Pressable>:null}
            <Pressable testID="repeat-start" accessibilityRole="button" disabled={starting} accessibilityState={{disabled:starting,busy:starting}} onPress={() => { void beginRepeat(); }} style={[styles.primaryButton, { backgroundColor: ink }]}>
              <Text style={[styles.primaryText, { color: paper }]}>{copy.start}</Text>
            </Pressable>
            {activeRange ? <Pressable accessibilityRole="button" onPress={stopRepeat} style={[styles.secondaryButton, { borderColor: accent }]}>
              <Text style={[styles.secondaryText, { color: ink }]}>{copy.stop}</Text>
            </Pressable> : null}
          </View>
        </View>
      </View>
    </Modal>

    <Modal visible={visible && pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
      <View style={[styles.overlay, styles.pickerOverlay, { paddingTop: Math.max(12, insets.top), paddingBottom: Math.max(8, insets.bottom) }]}>
        <NativePressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={copy.close} onPress={() => setPickerVisible(false)} />
        <View accessibilityViewIsModal style={[styles.picker, { backgroundColor: paper, borderColor: '#D2DDE3' }]}>
          <Text accessibilityRole="header" style={[styles.pickerTitle, { color: ink }]}>{copy.choose}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.surahList}>
            {surahs.map(item => <Pressable key={item.number} accessibilityRole="button" accessibilityState={{ selected: item.number === surahNumber }} onPress={() => chooseSurah(item.number)} style={[styles.surahOption, item.number === surahNumber && { backgroundColor: paleBlue }, rtl && styles.rtlRow]}>
              <Text style={[styles.optionNumber, { color: muted }]}>{localizedNumber(item.number, language)}</Text>
              <Text style={[styles.optionName, { color: ink }]}>{item.arabicName}</Text>
              {item.number === surahNumber ? <Ionicons name="checkmark" size={19} color={accent} /> : null}
            </Pressable>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const baseStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(12,28,40,.55)', paddingHorizontal: 8 },
  sheet: { maxHeight: '90%', borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#D2DDE3' },
  close: { width: 46, height: 48, alignItems: 'center', justifyContent: 'center' },
  titleGroup: { flex: 1, paddingHorizontal: 8, gap: 3 },
  title: { fontSize: 20, fontWeight: '700' },
  active: { fontSize: 13 },
  content: { padding: 18, gap: 10 },
  label: { fontSize: 15, fontWeight: '600', marginBottom: 5 },
  surahButton: { minHeight: 50, borderRadius: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  surahName: { flex: 1, textAlign: 'right', writingDirection: 'rtl', fontSize: 17, fontWeight: '700' },
  surahMeta: { fontSize: 13 },
  inputsRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  inputGroup: { flex: 1 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontSize: 19, backgroundColor: '#FFFDF8' },
  error: { color: '#A44130', fontSize: 14, lineHeight: 20 },
  footer: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 14, gap: 9, borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#D2DDE3' },
  primaryButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 9 },
  primaryText: { color: '#FAF7EF', fontWeight: '700', fontSize: 16 },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1 },
  secondaryText: { fontWeight: '700', fontSize: 15 },
  pickerOverlay: { justifyContent: 'center' },
  picker: { maxHeight: '82%', borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  pickerTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#D2DDE3' },
  surahList: { padding: 10 },
  surahOption: { minHeight: 44, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 6 },
  optionNumber: { minWidth: 36, flexShrink: 0, fontSize: 13, textAlign: 'center' },
  optionName: { flex: 1, fontSize: 17, textAlign: 'right', writingDirection: 'rtl' },
  rtlRow: { flexDirection: 'row-reverse' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
});
