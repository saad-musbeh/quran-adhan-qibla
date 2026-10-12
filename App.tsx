import * as SystemUI from 'expo-system-ui';
import { ScreenLayer } from './src/components/ScreenLayer';
import { QuranThemeContext } from './src/quran-theme-context';
import { useQuranTheme } from './src/use-quran-theme';
import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { isPrayerTimesAvailable, isQiblaAvailable, prayerTimes, qiblaBearing } from './modules/islamic-core';
import { AdhanScreen } from './src/components/AdhanScreen';
import { LocationSheet } from './src/components/LocationSheet';
import { QiblaScreen } from './src/components/QiblaScreen';
import { SwipeTabs, type Tab } from './src/components/SwipeTabs';
import { localCalendarDate } from './src/domain/prayers';
import { translations, isRTL } from './src/i18n';
import { LanguagePicker } from './src/components/LanguagePicker';
import { useLocation } from './src/use-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SettingsSheet } from './src/components/SettingsSheet';
import { QuranSettings } from './src/components/QuranScreen';
import { QuranLibrary } from './src/components/QuranLibrary';
import { useTafsirLibrary } from './src/use-tafsir-library';
import { useQuranAudio } from './src/use-quran-audio';
import { usePreferences } from './src/use-preferences';
import { usePrayerNotifications } from './src/use-prayer-notifications';
import { notificationCopy } from './src/notification-i18n';
import { PrayerNotificationSettings } from './src/components/PrayerNotificationSettings';

export default function App() {
  return <SafeAreaProvider><Main /></SafeAreaProvider>;
}

function Main() {
  const insets = useSafeAreaInsets();
  const { preferences, setPreferences, ready: preferencesReady } = usePreferences();
  const { language, prayer: settings, reader, compassMode } = preferences;
  const audio = useQuranAudio();
  const tafsirLibrary = useTafsirLibrary();
  const quranTheme = useQuranTheme();
  useEffect(() => { void SystemUI.setBackgroundColorAsync(quranTheme.theme.appBackground).catch(() => undefined); }, [quranTheme.theme.appBackground]);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSection, setSettingsSection] = useState<Tab>('quran');
  const [tab, setTab] = useState<Tab>('quran');
  const [readingBook,setReadingBook]=useState(false);
  const [readingChromeVisible, setReadingChromeVisible] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const locationState = useLocation(tab !== 'quran' || showLocation || preferences.prayerNotifications);
  const { location } = locationState;
  const t = translations[language];
  const notificationLabels = notificationCopy(language);
  const notifications = usePrayerNotifications({
    ready: preferencesReady && locationState.ready,
    enabled: preferences.prayerNotifications,
    location, settings, language, sound: Platform.OS === 'ios' ? 'adhan_short.wav' : 'adhan.ogg',
    labels: { title: t.brand, channelName: notificationLabels.title, body: name => t[name], testTitle: notificationLabels.test, testBody: t.brand },
  });
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

  return <QuranThemeContext.Provider value={quranTheme}><SafeAreaView style={[styles.screen, { backgroundColor: quranTheme.theme.appBackground }]}>
    <StatusBar style="light" />
    <View pointerEvents={tab !== 'quran' || readingChromeVisible ? 'auto' : 'none'}
      accessibilityElementsHidden={tab === 'quran' && !readingChromeVisible}
      importantForAccessibility={tab === 'quran' && !readingChromeVisible ? 'no-hide-descendants' : 'auto'}
      style={[styles.header, styles.readingHeader, {top:insets.top, backgroundColor:quranTheme.theme.appBackground, opacity:tab !== 'quran' || readingChromeVisible ? 1 : 0}, isRTL(language) && styles.reverse]}>
      <Text style={styles.brand}>{t.brand}</Text>
      <View style={[styles.tools, isRTL(language) && styles.reverse]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t.language} style={styles.iconButton}
          onPress={() => setShowLanguages(true)}>
          <Ionicons name="language-outline" color={quranTheme.theme.accent} size={23} />
        </Pressable>
        <Pressable accessibilityRole="button" testID="open-location" accessibilityLabel={t.locationTitle} style={styles.iconButton} onPress={() => setShowLocation(true)}>
          <Ionicons name="location-outline" color={quranTheme.theme.accent} size={23} />
        </Pressable>
        <Pressable accessibilityRole="button" testID="open-settings" accessibilityLabel={t.settings} style={styles.iconButton} onPress={() => { setSettingsSection(tab); setShowSettings(true); }}>
          <Ionicons name="settings-outline" color={quranTheme.theme.accent} size={23} />
        </Pressable>
      </View>
    </View>
    <SwipeTabs hideNavigation={readingBook} language={language} tab={tab} theme={tab === 'quran' ? 'navy' : 'green'} reading={tab === 'quran'} chromeVisible={readingChromeVisible} onChange={next => { setTab(next); setReadingChromeVisible(false); setNow(new Date()); }}>
      <ScreenLayer testID="screen-qibla" active={tab === 'qibla'} background={quranTheme.theme.appBackground} top={48} bottom={64}>
        <QiblaScreen language={language} state={locationState} bearing={qibla.bearing}
          calculationAvailable={isQiblaAvailable} calculationError={qibla.error}
          active={tab === 'qibla' && !showLocation && !showSettings && !showLanguages} mode={compassMode}
          onModeChange={mode => setPreferences(value => ({ ...value, compassMode: mode }))} />
      </ScreenLayer>
      <ScreenLayer testID="screen-adhan" active={tab === 'adhan'} background={quranTheme.theme.appBackground} top={48} bottom={64}>
        <AdhanScreen language={language} state={locationState} times={schedule.times}
          error={schedule.error} calculationAvailable={isPrayerTimesAvailable} now={now} timezone={timezone}/>
      </ScreenLayer>
      <ScreenLayer testID="screen-quran" active={tab === 'quran'} background={quranTheme.theme.appBackground}>
        <QuranLibrary tafsirLibrary={tafsirLibrary} onBookOpenChange={setReadingBook} active={tab === 'quran'} language={language} audio={audio} settings={reader}
          onReadingChromeChange={setReadingChromeVisible}
          onSettingsChange={reader => setPreferences(value => ({ ...value, reader }))} />
      </ScreenLayer>

    </SwipeTabs>
    <SettingsSheet language={language} visible={showSettings} section={settingsSection} onSectionChange={setSettingsSection}
      onClose={() => setShowSettings(false)} prayer={settings} timezone={timezone}
      onPrayerChange={prayer => setPreferences(value => ({ ...value, prayer }))}
      compassMode={compassMode} onCompassModeChange={mode => setPreferences(value => ({ ...value, compassMode: mode }))}
      notifications={<PrayerNotificationSettings language={language} ready={preferencesReady && locationState.ready}
        enabled={preferences.prayerNotifications} notifications={notifications}
        onChange={prayerNotifications => setPreferences(value => ({ ...value, prayerNotifications }))}
        onChooseLocation={() => { setShowSettings(false); setShowLocation(true); }} />}
      quran={<QuranSettings library={tafsirLibrary} language={language} audio={audio} settings={reader}
        onSettingsChange={reader => setPreferences(value => ({ ...value, reader }))} />} />
    <LanguagePicker language={language} visible={showLanguages} onChoose={language => setPreferences(value => ({ ...value, language }))} onClose={() => setShowLanguages(false)} />
    <LocationSheet language={language} visible={showLocation} state={locationState} onClose={() => setShowLocation(false)} />
  </SafeAreaView></QuranThemeContext.Provider>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B211D' },
  quranScreen: { backgroundColor: '#18334A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 2, gap: 6 },
  readingHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5, elevation: 12, backgroundColor: '#18334A' },
  reverse: { flexDirection: 'row-reverse' },
  brand: { color: '#F4EFE4', fontSize: 14, fontWeight: '600', flexShrink: 1 },
  tools: { flexDirection: 'row', gap: 2 },
  iconButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22 },
});
