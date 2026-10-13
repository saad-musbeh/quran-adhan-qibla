import { Text } from '../text-size';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bilingual, isRTL, localeFor, translations, type Language } from '../i18n';
import type { useLocation } from '../use-location';
import { LocationAlternatives } from './LocationAlternatives';
import { useReaderStyles } from '../quran-theme-context';

type Props = { language: Language; visible: boolean; state: ReturnType<typeof useLocation>; onClose: () => void };

export function LocationSheet({ language, visible, state, onClose }: Props) {
  const { styles } = useReaderStyles(baseStyles);
  const [settingsError, setSettingsError] = useState(false);
  const wasLoading = useRef(false);
  const { location, loading, error } = state;
  const t = translations[language];
  const rtl = isRTL(language);
  const align = rtl ? styles.rtl : styles.ltr;
  useEffect(() => {
    if (wasLoading.current && !loading && !error && location?.source === 'device') onClose();
    wasLoading.current = loading;
  }, [loading, error, location, onClose]);

  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.screen}>
      <View style={[styles.header, rtl && styles.reverse]}>
        <Text style={[styles.title, align]}>{t.locationTitle}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={bilingual(language, 'إغلاق خيارات الموقع', 'Close location options')}
          onPress={onClose} style={styles.close}><Text style={styles.closeText}>✕</Text></Pressable>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.body, align]}>{t.locationWhy}</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading, ...(loading ? { busy: true } : {}) }} disabled={loading}
            style={[styles.primary, loading && styles.disabled]} onPress={() => { setSettingsError(false); void state.locate(); }}>
            {loading && <ActivityIndicator color="#102A25" />}
            <Text style={styles.primaryText}>{loading ? t.locating : location?.source === 'device' ? t.refreshLocation : t.useLocation}</Text>
          </Pressable>
          {(error || settingsError) && <Text accessibilityRole="alert" style={[styles.error, align]}>{t[settingsError ? 'locationError' : error ?? 'locationError']}</Text>}
          {(error === 'blocked'||error==='servicesDisabled') && <Pressable accessibilityRole="button" style={styles.settings}
            onPress={() => { void (error==='servicesDisabled'&&Platform.OS==='android'?IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS):Linking.openSettings()).catch(() => setSettingsError(true)); }}>
            <Text style={[styles.link, align]}>{error==='servicesDisabled'?bilingual(language,'افتح إعدادات الموقع','Open location settings'):t.openSettings}</Text>
          </Pressable>}
          <LocationAlternatives language={language} disabled={loading} coordinates={location ?? undefined}
            onSelect={selection => { state.useAlternative(selection); onClose(); }} />
          <Text style={[styles.note, align]}>{t.locationPrivacy}</Text>
          {location && <Text style={[styles.note, align]}>{t.updated}: {new Date(location.timestamp).toLocaleString(localeFor(language))}
            {location.source === 'device' && location.accuracy != null && Number.isFinite(location.accuracy)
              ? ` · ${t.accuracy}: ±${Math.round(location.accuracy).toLocaleString(localeFor(language))} ${t.meters}` : ''}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B211D' }, flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8 }, reverse: { flexDirection: 'row-reverse' },
  title: { color: '#F4EFE4', fontSize: 22, fontWeight: '600' }, close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, closeText: { color: '#D6BA7A', fontSize: 24 },
  content: { padding: 20, gap: 18, width: '100%', maxWidth: 620, alignSelf: 'center' }, body: { color: '#B8CDC4', fontSize: 15, lineHeight: 25 },
  primary: { minHeight: 52, backgroundColor: '#D6BA7A', borderRadius: 14, padding: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }, primaryText: { color: '#102A25', fontSize: 16, fontWeight: '700' }, disabled: { opacity: 0.45 },
  settings: { minHeight: 44, justifyContent: 'center' }, link: { color: '#D6BA7A', fontSize: 14, textDecorationLine: 'underline' },
  error: { color: '#FFB3A8', fontSize: 14, lineHeight: 23 }, note: { color: '#A8C1B8', fontSize: 12, lineHeight: 21 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' }, ltr: { textAlign: 'left', writingDirection: 'ltr' },
});
