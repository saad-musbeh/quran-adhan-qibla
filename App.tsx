import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { isQiblaAvailable, qiblaBearing } from './modules/islamic-core';
import { parseCoordinate } from './src/domain/coordinates';
import { translations, type Language } from './src/i18n';

type Tab = 'quran' | 'adhan' | 'qibla';
const tabs: Tab[] = ['quran', 'adhan', 'qibla'];
const icons = { quran: '۞', adhan: '◷', qibla: '↗' };

export default function App() {
  return <SafeAreaProvider><Main /></SafeAreaProvider>;
}

function Main() {
  const [language, setLanguage] = useState<Language>('ar');
  const [tab, setTab] = useState<Tab>('quran');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [bearing, setBearing] = useState<number | null>(null);
  const [error, setError] = useState<'invalid' | 'undefined' | null>(null);
  const t = translations[language];
  const alignment = language === 'ar' ? styles.rtlText : styles.ltrText;

  function updateCoordinates(nextLatitude: string, nextLongitude: string) {
    setLatitude(nextLatitude);
    setLongitude(nextLongitude);
    setBearing(null);
    setError(null);
  }

  function calculate() {
    const lat = parseCoordinate(latitude, 'latitude');
    const lon = parseCoordinate(longitude, 'longitude');
    setBearing(null);
    if (lat === null || lon === null) {
      setError('invalid');
      return;
    }
    try {
      setBearing(qiblaBearing(lat, lon));
      setError(null);
    } catch {
      setError('undefined');
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={[styles.header, language === 'ar' && styles.reverseRow]}>
        <Text style={styles.brand}>{t.brand}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t.language}
          hitSlop={12} style={styles.languageButton}
          onPress={() => setLanguage(language === 'ar' ? 'en' : 'ar')}>
          <Text style={styles.languageLabel}>{language === 'ar' ? 'EN' : 'عربي'}</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView style={styles.content} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.eyebrow, alignment]}>{t.preview}</Text>
          <Text style={[styles.tagline, alignment]}>{t.tagline}</Text>
          {tab !== 'qibla' ? (
            <>
              <View style={styles.hero}>
                <Text style={styles.heroIcon}>{icons[tab]}</Text>
                <Text style={[styles.title, alignment]}>{tab === 'quran' ? t.quranTitle : t.adhanTitle}</Text>
                <Text style={[styles.body, alignment]}>{tab === 'quran' ? t.quranBody : t.adhanBody}</Text>
              </View>
              <View style={styles.card}>
                <Text style={[styles.eyebrow, alignment]}>{t.planned}</Text>
                <Text style={[styles.cardTitle, alignment]}>{tab === 'quran' ? t.quranEmpty : t.adhanEmpty}</Text>
                <Text style={[styles.body, alignment]}>{tab === 'quran' ? t.quranNote : t.adhanNote}</Text>
              </View>
              <Text style={[styles.footerNote, alignment]}>{tab === 'quran' ? t.quranNext : t.adhanNext}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.title, alignment]}>{t.qiblaTitle}</Text>
              <Text style={[styles.body, alignment]}>{t.qiblaBody}</Text>
              <View style={styles.card}>
                <Text style={[styles.inputLabel, alignment]}>{t.latitude}</Text>
                <TextInput accessibilityLabel={t.latitude} value={latitude} placeholder="24.7136"
                  placeholderTextColor="#73988D" keyboardType="numbers-and-punctuation"
                  autoCorrect={false} autoCapitalize="none" style={styles.input}
                  onChangeText={value => updateCoordinates(value, longitude)} />
                <Text style={[styles.inputLabel, alignment]}>{t.longitude}</Text>
                <TextInput accessibilityLabel={t.longitude} value={longitude} placeholder="46.6753"
                  placeholderTextColor="#73988D" keyboardType="numbers-and-punctuation"
                  autoCorrect={false} autoCapitalize="none" style={styles.input}
                  onChangeText={value => updateCoordinates(latitude, value)} />
                <Pressable accessibilityRole="button" onPress={() => updateCoordinates('24.7136', '46.6753')}>
                  <Text style={[styles.example, alignment]}>{t.example}</Text>
                </Pressable>
                <Text style={[styles.small, alignment]}>{t.exampleNote}</Text>
                {!isQiblaAvailable && <Text style={[styles.notice, alignment]}>{t.unavailable}</Text>}
                {error && <Text accessibilityRole="alert" style={[styles.error, alignment]}>{t[error]}</Text>}
                <Pressable accessibilityRole="button" accessibilityState={{ disabled: !isQiblaAvailable }}
                  disabled={!isQiblaAvailable} onPress={calculate}
                  style={[styles.button, !isQiblaAvailable && styles.disabled]}>
                  <Text style={styles.buttonLabel}>{t.calculate}</Text>
                </Pressable>
              </View>
              {bearing !== null && (
                <View style={styles.result}>
                  <View style={styles.compass} accessible accessibilityLabel={`${bearing.toFixed(1)}° ${t.direction}`}>
                    <Text style={styles.north}>N</Text>
                    <Text style={[styles.arrow, { transform: [{ rotate: `${bearing}deg` }] }]}>↑</Text>
                  </View>
                  <Text style={styles.bearing}>{bearing.toLocaleString(language === 'ar' ? 'ar-SA' : 'en', { maximumFractionDigits: 1 })}°</Text>
                  <Text style={styles.small}>{t.direction}</Text>
                  <Text style={[styles.footerNote, alignment]}>{t.compassNote}</Text>
                </View>
              )}
              <Text style={[styles.footerNote, alignment]}>{t.noLocation}</Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.tabs, language === 'ar' && styles.reverseRow]}>
        {tabs.map(item => (
          <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: tab === item }}
            onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.activeTab]}>
            <Text style={[styles.tabIcon, tab === item && styles.activeLabel]}>{icons[item]}</Text>
            <Text style={[styles.tabLabel, tab === item && styles.activeLabel]}>{t[item]}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B211D' },
  content: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, gap: 12 },
  reverseRow: { flexDirection: 'row-reverse' },
  brand: { color: '#F4EFE4', fontSize: 19, fontWeight: '600', flexShrink: 1 },
  languageButton: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#35544B', borderRadius: 20 },
  languageLabel: { color: '#D6BA7A', fontSize: 12, fontWeight: '700' },
  scroll: { padding: 24, paddingBottom: 40, gap: 18, maxWidth: 620, width: '100%', alignSelf: 'center' },
  rtlText: { textAlign: 'right', writingDirection: 'rtl' },
  ltrText: { textAlign: 'left', writingDirection: 'ltr' },
  eyebrow: { color: '#D6BA7A', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  tagline: { color: '#A8C1B8', fontSize: 16, lineHeight: 26 },
  hero: { paddingVertical: 20, gap: 18 },
  heroIcon: { color: '#D6BA7A', fontSize: 76, textAlign: 'center', marginBottom: 8 },
  title: { color: '#F4EFE4', fontSize: 32, fontWeight: '600', lineHeight: 46 },
  body: { color: '#B8CDC4', fontSize: 16, lineHeight: 28 },
  card: { backgroundColor: '#15342E', borderRadius: 22, padding: 22, gap: 16, borderWidth: 1, borderColor: '#2B4B41' },
  cardTitle: { color: '#F4EFE4', fontSize: 22, lineHeight: 34, fontWeight: '500' },
  footerNote: { color: '#A8C1B8', fontSize: 13, lineHeight: 23 },
  inputLabel: { color: '#F4EFE4', fontSize: 14 },
  input: { backgroundColor: '#0B211D', color: '#F4EFE4', borderRadius: 12, borderWidth: 1, borderColor: '#35544B', padding: 14, fontSize: 18, textAlign: 'left' },
  example: { color: '#D6BA7A', fontSize: 14, textDecorationLine: 'underline', lineHeight: 24 },
  small: { color: '#A8C1B8', fontSize: 12, lineHeight: 22 },
  notice: { color: '#D6BA7A', fontSize: 14, lineHeight: 24 },
  error: { color: '#FFB3A8', fontSize: 14, lineHeight: 24 },
  button: { backgroundColor: '#D6BA7A', padding: 16, borderRadius: 14, alignItems: 'center' },
  disabled: { opacity: 0.4 },
  buttonLabel: { color: '#102A25', fontSize: 16, fontWeight: '700' },
  result: { alignItems: 'center', gap: 12 },
  compass: { width: 160, height: 160, borderRadius: 80, borderWidth: 1, borderColor: '#D6BA7A', alignItems: 'center', justifyContent: 'center' },
  north: { position: 'absolute', top: 10, color: '#A8C1B8', fontSize: 12 },
  arrow: { color: '#D6BA7A', fontSize: 72, lineHeight: 100 },
  bearing: { color: '#F4EFE4', fontSize: 42, fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: 8, margin: 16, marginTop: 0, padding: 6, backgroundColor: '#15342E', borderRadius: 22 },
  tab: { flex: 1, minHeight: 68, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 16 },
  activeTab: { backgroundColor: '#284C40' },
  tabIcon: { color: '#A8C1B8', fontSize: 23 },
  tabLabel: { color: '#A8C1B8', fontSize: 13, fontWeight: '600' },
  activeLabel: { color: '#D6BA7A' },
});
