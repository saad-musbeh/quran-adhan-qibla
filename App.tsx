import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { isPrayerTimesAvailable, isQiblaAvailable, prayerTimes, qiblaBearing } from './modules/islamic-core';
import { AdhanScreen } from './src/components/AdhanScreen';
import { LocationSheet } from './src/components/LocationSheet';
import { QiblaScreen } from './src/components/QiblaScreen';
import { SwipeTabs, type Tab } from './src/components/SwipeTabs';
import { localCalendarDate } from './src/domain/prayers';
import { translations } from './src/i18n';
import { useLocation } from './src/use-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SettingsSheet } from './src/components/SettingsSheet';
import { QuranScreen, QuranSettings } from './src/components/QuranScreen';
import { useQuranAudio } from './src/use-quran-audio';
import { usePreferences } from './src/use-preferences';

export default function App() {
  return <SafeAreaProvider><Main /></SafeAreaProvider>;
}

function Main() {
  const { preferences, setPreferences } = usePreferences();
  const { language, prayer: settings, reader, compassMode } = preferences;
  const audio = useQuranAudio();
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState<Tab>('quran');
  const [tab, setTab] = useState<Tab>('quran');
  const [showLocation, setShowLocation] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const locationState = useLocation(tab !== 'quran' || showLocation);
  const { location } = locationState;
  const t = translations[language];
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
      <View style={[styles.tools, language === 'ar' && styles.reverse]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.language} accessibilityHint={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'} style={styles.iconButton}
          onPress={() => setPreferences(value => ({ ...value, language: value.language === 'ar' ? 'en' : 'ar' }))}>
          <Ionicons name="language-outline" color="#D6BA7A" size={23} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t.locationTitle} style={styles.iconButton} onPress={() => setShowLocation(true)}>
          <Ionicons name="location-outline" color="#D6BA7A" size={23} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t.settings} style={styles.iconButton} onPress={() => { setSettingsSection(tab); setShowSettings(true); }}>
          <Ionicons name="settings-outline" color="#D6BA7A" size={23} />
        </Pressable>
      </View>
    </View>
    <SwipeTabs language={language} tab={tab} onChange={next => { setTab(next); setNow(new Date()); }}>
      {tab === 'qibla' ? <QiblaScreen language={language} state={locationState} bearing={qibla.bearing}
        calculationAvailable={isQiblaAvailable} calculationError={qibla.error}
        active={!showLocation && !showSettings} mode={compassMode}
        onModeChange={mode => setPreferences(value => ({ ...value, compassMode: mode }))} />
        : tab === 'adhan' ? <AdhanScreen language={language} state={locationState} times={schedule.times}
          error={schedule.error} calculationAvailable={isPrayerTimesAvailable} now={now} timezone={timezone}
          />
        : <QuranScreen language={language} audio={audio} settings={reader} />}

    </SwipeTabs>
    <SettingsSheet language={language} visible={showSettings} section={settingsSection} onSectionChange={setSettingsSection}
      onClose={() => setShowSettings(false)} prayer={settings} timezone={timezone}
      onPrayerChange={prayer => setPreferences(value => ({ ...value, prayer }))}
      compassMode={compassMode} onCompassModeChange={mode => setPreferences(value => ({ ...value, compassMode: mode }))}
      quran={<QuranSettings language={language} audio={audio} settings={reader}
        onSettingsChange={reader => setPreferences(value => ({ ...value, reader }))} />} />
    <LocationSheet language={language} visible={showLocation} state={locationState} onClose={() => setShowLocation(false)} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B211D' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 2, gap: 6 },
  reverse: { flexDirection: 'row-reverse' },
  brand: { color: '#F4EFE4', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  tools: { flexDirection: 'row', gap: 2 },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22 },
});
