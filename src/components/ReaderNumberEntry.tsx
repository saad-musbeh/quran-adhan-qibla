import { Pressable } from './Pressable';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type TextInput as NativeTextInput } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, TextInput } from '../text-size';
import { bilingual, isRTL, localeFor, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';
import { readerNavigationTarget } from '../domain/reader-navigation';

export function ReaderNumberEntry({kind, value, language, onNavigate, onEditingChange}: {
  kind: 'page' | 'juz'; value: number; language: Language;
  onNavigate: (page: number) => void; onEditingChange: (editing: boolean) => void;
}) {
  const { styles, colors } = useReaderStyles(baseStyles), rtl = isRTL(language);
  const format = (value: number) => value.toLocaleString(localeFor(language), {useGrouping: false});
  const [input, setInput] = useState(format(value));
  const [editing, setEditing] = useState(false), [invalid, setInvalid] = useState(false);
  const field = useRef<NativeTextInput>(null);
  const dirty = useRef(false);
  const label = kind === 'page' ? bilingual(language, 'الصفحة', 'Page') : bilingual(language, 'الجزء', 'Juz');
  const error = kind === 'page'
    ? bilingual(language, 'أدخل صفحة من ١ إلى ٦٠٤', 'Enter a page from 1 to 604')
    : bilingual(language, 'أدخل جزءًا من ١ إلى ٣٠', 'Enter a juz from 1 to 30');
  useEffect(() => { if (!editing && !invalid) setInput(format(value)); }, [value, language, editing, invalid]);
  const commit = (force = false) => {
    if (!force && !dirty.current) return true;
    const target = readerNavigationTarget(kind, input);
    if (target === null) { setInvalid(true); return false; }
    setInvalid(false);
    dirty.current = false;
    onNavigate(target);
    return true;
  };
  return <View style={styles.group}>
    <View style={[styles.entry, rtl && styles.reverse, {borderColor: invalid ? colors.mode === 'light' ? '#9E3429' : '#FFB3A8' : editing ? colors.accent : colors.appBorder}]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput ref={field} testID={`reader-${kind}-input`} accessibilityLabel={label} accessibilityHint={error}
        value={input} onChangeText={value => {dirty.current = true; setInput(value); setInvalid(false);}} keyboardType="number-pad" returnKeyType="go"
        selectTextOnFocus autoCorrect={false} maxLength={4} style={styles.input}
        onFocus={() => {dirty.current = invalid; setEditing(true); onEditingChange(true);}}
        onBlur={() => {commit(); setEditing(false); onEditingChange(false);}}
        onSubmitEditing={() => {if (commit(true)) field.current?.blur();}} />
      {editing && <Pressable testID={`reader-${kind}-go`} accessibilityRole="button" accessibilityLabel={bilingual(language, 'انتقل', 'Go')}
        onPress={() => {if (commit(true)) field.current?.blur();}} style={styles.go}>
        <Ionicons name="checkmark" size={21} color={colors.accent} />
      </Pressable>}
    </View>
    {invalid && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}
const baseStyles = StyleSheet.create({
  group: { flex: 1, minWidth: 0 }, entry: { minHeight: 44, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, gap: 4, paddingStart: 6 },
  label: { fontSize: 12, color: '#A8C1B8', flexShrink: 1 }, input: { flex: 1, minWidth: 48, height: 44, color: '#F4EFE4', fontSize: 15, paddingHorizontal: 3, paddingVertical: 4, textAlign: 'center', writingDirection: 'ltr', fontVariant: ['tabular-nums'] },
  go: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }, error: { color: '#FFB3A8', fontSize: 11, paddingTop: 4 }, reverse: { flexDirection: 'row-reverse' },
});
