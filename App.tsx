import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { isPrayerTimesAvailable, isQiblaAvailable, prayerTimes, qiblaBearing } from './modules/islamic-core';
import { AdhanScreen } from './src/components/AdhanScreen';
import { LocationSheet } from './src/components/LocationSheet';
import { QiblaScreen } from './src/components/QiblaScreen';
import { SwipeTabs, type Tab } from './src/components/SwipeTabs';
import { localCalendarDate, type PrayerSettings } from './src/domain/prayers';
import { translations, type Language } from './src/i18n';
import { useLocation } from './src/use-location';

export default function App() {
  return <SafeAreaProvider><Main /></SafeAreaProvider>;
}

function Main() {
  const [language, setLanguage] = useState<Language>('ar');
  const [tab, setTab] = useState<Tab>('quran');
  const [settings, setSettings] = useState<PrayerSettings>({ method: 0, hanafi: false, ramadan: false });
  const [showLocation, setShowLocation] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const locationState = useLocation(tab !== 'quran');
  const { location } = locationState;
  const t = translations[language];
  const alignment = language === 'ar' ? styles.rtl : styles.ltr;
  // Calculations always use Gregorian date components, including in Arabic.
  const [year, month, day] = localCalendarDate(now);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const schedule = useMemo(() => {
    if (!location || !isPrayerTimesAvailable) return { times: null, error: null };
    if (Math.abs(location.latitude) >= 65) return { times: null, error: 'polarUnsupported' as const };
    try {
      return { times: prayerTimes(location.latitude, location.longitude, [year, month, day], settings), error: null };
    } catch {
      return { times: null, error: 'prayerError' as const };
    }
  }, [location, year, month, day, settings, timezone]);
  const qibla = useMemo(() => {
    if (!location || !isQiblaAvailable) return { bearing: null, error: false };
    try { return { bearing: qiblaBearing(location.latitude, location.longitude), error: false }; }
    catch { return { bearing: null, error: true }; }
  }, [location]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60 * 60 * 1000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(new Date());
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, []);
  useEffect(() => {
    // Advance at prayer boundaries and midnight without minute polling or GPS reads.
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const boundary = schedule.times?.find(time => time.getTime() > now.getTime()) ?? midnight;
    const timer = setTimeout(() => setNow(new Date()), Math.max(100,
      Math.min(boundary.getTime(), midnight.getTime()) - Date.now() + 100));
    return () => clearTimeout(timer);
  }, [schedule.times, now]);

  return <SafeAreaView style={styles.screen}>
    <StatusBar style="light" />
    <View style={[styles.header, language === 'ar' && styles.reverse]}>
      <Text style={styles.brand}>{t.brand}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t.language} style={styles.languageButton}
        onPress={() => setLanguage(language === 'ar' ? 'en' : 'ar')}>
        <Text style={styles.languageLabel}>{language === 'ar' ? 'EN' : 'عربي'}</Text>
      </Pressable>
    </View>
    <SwipeTabs language={language} tab={tab} onChange={next => { setTab(next); setNow(new Date()); }}>
      {tab === 'qibla' ? <QiblaScreen language={language} state={locationState} bearing={qibla.bearing}
        calculationAvailable={isQiblaAvailable} calculationError={qibla.error} onChangeLocation={() => setShowLocation(true)} />
        : tab === 'adhan' ? <AdhanScreen language={language} state={locationState} times={schedule.times}
          error={schedule.error} calculationAvailable={isPrayerTimesAvailable} now={now} timezone={timezone}
          settings={settings} onSettingsChange={setSettings} onChangeLocation={() => setShowLocation(true)} />
        : <View style={styles.quran}>
          <Text style={[styles.preview, alignment]}>{t.preview}</Text>
          <View style={styles.quranCard}>
            <Text style={styles.quranIcon}>۞</Text>
            <Text style={[styles.title, alignment]}>{t.quranTitle}</Text>
            <Text style={[styles.body, alignment]}>{t.quranNote}</Text>
          </View>
          <Text style={[styles.swipeHint, alignment]}>↔ {t.swipeHint}</Text>
        </View>}
    </SwipeTabs>
    <LocationSheet language={language} visible={showLocation} state={locationState} onClose={() => setShowLocation(false)} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B211D' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6, gap: 12 },
  reverse: { flexDirection: 'row-reverse' },
  brand: { color: '#F4EFE4', fontSize: 17, fontWeight: '600', flexShrink: 1 },
  languageButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  languageLabel: { color: '#D6BA7A', fontSize: 13, fontWeight: '700' },
  quran: { flex: 1, padding: 18, justifyContent: 'center', gap: 12, width: '100%', maxWidth: 620, alignSelf: 'center' },
  preview: { color: '#D6BA7A', fontSize: 12 },
  quranCard: { backgroundColor: '#15342E', borderWidth: 1, borderColor: '#2B4B41', borderRadius: 24, padding: 20, gap: 14 },
  quranIcon: { color: '#D6BA7A', fontSize: 52, lineHeight: 70, textAlign: 'center' },
  title: { color: '#F4EFE4', fontSize: 26, lineHeight: 38, fontWeight: '600' },
  body: { color: '#B8CDC4', fontSize: 15, lineHeight: 24 },
  swipeHint: { color: '#D6BA7A', fontSize: 12, lineHeight: 20 },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  ltr: { textAlign: 'left', writingDirection: 'ltr' },
});
