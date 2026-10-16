import { prayerNotificationLimit } from './src/domain/devotional-reminders';
import { PressFeedbackProvider } from './src/components/Pressable';
import { Text, TextSizeContext, textScaleForSize } from './src/text-size';
import * as SystemUI from 'expo-system-ui';
import { ScreenLayer } from './src/components/ScreenLayer';
import { QuranThemeContext } from './src/quran-theme-context';
import { useQuranTheme } from './src/use-quran-theme';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, BackHandler, StyleSheet, useWindowDimensions } from 'react-native';
import { Pressable } from './src/components/Pressable';
import { bilingual, isRTL } from './src/i18n';
import { AdhkarScreen } from './src/components/AdhkarScreen';
import { DevotionalSettings, DevotionalTestingSettings } from './src/components/DevotionalSettings';
import { useDevotionalReminders } from './src/use-devotional-reminders';
import type { AdhkarCollection } from './src/domain/adhkar';
import { MainMenu } from './src/components/MainMenu';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { isPrayerTimesAvailable, isQiblaAvailable, prayerTimes, qiblaBearing } from './modules/islamic-core';
import { AdhanScreen } from './src/components/AdhanScreen';
import { LocationSheet } from './src/components/LocationSheet';
import { QiblaScreen } from './src/components/QiblaScreen';
import { SwipeTabs, type Tab } from './src/components/SwipeTabs';
import { localCalendarDate, nextLocalCalendarDate, polarCalculationDisabled } from './src/domain/prayers';
import { translations } from './src/i18n';
import { LanguagePicker } from './src/components/LanguagePicker';
import { useLocation } from './src/use-location';
import { AppBanner } from './src/components/AppBanner';
import { SettingsSheet } from './src/components/SettingsSheet';
import { QuranSettings } from './src/components/QuranScreen';
import { QuranLibrary } from './src/components/QuranLibrary';
import { useTafsirLibrary } from './src/use-tafsir-library';
import { QuranAudioProvider, useQuranAudioController } from './src/quran-audio-context';
import { restoreLanguagePreferences } from './src/domain/languages';
import { usePreferences } from './src/use-preferences';
import { usePrayerNotifications } from './src/use-prayer-notifications';
import { notificationCopy } from './src/notification-i18n';
import { PrayerNotificationSettings } from './src/components/PrayerNotificationSettings';
import { startupHomeVisible } from './src/domain/app-startup';

export default function App() {
  return <SafeAreaProvider><PressFeedbackProvider><QuranAudioProvider><Main /></QuranAudioProvider></PressFeedbackProvider></SafeAreaProvider>;
}

function Main() {
  const insets = useSafeAreaInsets();
  const {width,height}=useWindowDimensions();
  const largeScreen=width>=720||Math.min(width,height)>=600;
  const { preferences, setPreferences, ready: preferencesReady } = usePreferences();
  const { language, prayer: settings, reader, compassMode } = preferences;
  const textScale = textScaleForSize(reader.fontSize);
  const headerHeight = Math.max(48,48*textScale);
  const navigationHeight = Math.max(64,64*textScale);
  const tafsirLibrary = useTafsirLibrary();
  const quranTheme = useQuranTheme();
  useEffect(() => { void SystemUI.setBackgroundColorAsync(quranTheme.theme.appBackground).catch(() => undefined); }, [quranTheme.theme.appBackground]);
  const [showSettings, setShowSettings] = useState(false);
  const [showReminders,setShowReminders] = useState(false);
  const [adhkarReading,setAdhkarReading] = useState(false);
  const [adhkarRequest,setAdhkarRequest] = useState<{id:number;collection:AdhkarCollection|null}>({id:0,collection:null});
  const [tab, setTab] = useState<Tab>('adhan');
  const [readingBook,setReadingBook]=useState(false);
  const [homeRequest,setHomeRequest]=useState(0);
  const [homeVisible,setHomeVisible]=useState(true);
  const menuLoaded=useRef(false);
  const menuEnabled=largeScreen||preferences.mainMenuOnPhones;
  const goHome=()=>{setHomeRequest(value=>value+1);setHomeVisible(true);};
  useEffect(()=>{
    if (!preferencesReady||menuLoaded.current) return;
    menuLoaded.current=true;
    setHomeVisible(startupHomeVisible(largeScreen, preferences.mainMenuOnPhones));
  },[preferencesReady,largeScreen,preferences.mainMenuOnPhones]);
  const [readingChromeVisible, setReadingChromeVisible] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const locationState = useLocation((!homeVisible&&(tab === 'adhan'||tab === 'qibla')) || showLocation || preferences.prayerNotifications || (preferences.devotional.salawat.enabled&&preferences.devotional.salawat.mode==='prayers'));
  const { location } = locationState;
  const t = translations[language];
  const notificationLabels = notificationCopy(language);
  const chooseSection=(next:Tab)=>{setHomeVisible(false);setTab(next);setReadingChromeVisible(false);setNow(new Date());};
  useEffect(()=>{
    const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{
      if (!menuEnabled||homeVisible||readingBook||showSettings||showLocation||showLanguages||showReminders||(tab==='adhkar'&&adhkarReading)) return false;
      setHomeVisible(true);return true;
    });
    return()=>subscription.remove();
  },[menuEnabled,homeVisible,readingBook,showSettings,showLocation,showLanguages,showReminders,tab,adhkarReading]);
  const notifications = usePrayerNotifications({
    ready: preferencesReady && locationState.ready,
    enabled: preferences.prayerNotifications,
    notificationLimit: prayerNotificationLimit(preferences.devotional),
    location, settings, language, prayerSounds: preferences.prayerSounds,
    labels: { title: t.brand, channelName: notificationLabels.title, body: name => t[name], testTitle: notificationLabels.test, testBody: t.brand },
  });
  const devotional = useDevotionalReminders({onReconciled:notifications.reconcile,ready:preferencesReady&&locationState.ready,preferences:preferences.devotional,language,location,prayer:settings,onOpen:kind=>{
    chooseSection('adhkar');
    if(kind==='salawat')setShowReminders(true);
    else setAdhkarRequest(value=>({id:value.id+1,collection:kind}));
  }});
  // Calculations always use Gregorian date components, including in Arabic.
  const [year, month, day] = localCalendarDate(now);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const schedule = useMemo(() => {
    if (!location || !isPrayerTimesAvailable) return { times: null, tomorrowTimes: null, error: null };
    if (polarCalculationDisabled(location.latitude, settings)) return { times: null, tomorrowTimes: null, error: 'polarUnsupported' as const };
    try {
      const times = prayerTimes(location.latitude, location.longitude, [year, month, day], settings);
      let tomorrowTimes: Date[] | null = null;
      try {
        tomorrowTimes = prayerTimes(location.latitude, location.longitude,
          nextLocalCalendarDate(new Date(year, month - 1, day)), settings);
      } catch { /* Keep today's valid schedule; show an error if tomorrow is needed. */ }
      return { times, tomorrowTimes, error: null };
    } catch {
      return { times: null, tomorrowTimes: null, error: 'prayerError' as const };
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

  return <TextSizeContext.Provider value={textScale}><QuranThemeContext.Provider value={quranTheme}><SafeAreaView style={[styles.screen, { backgroundColor: quranTheme.theme.appBackground }]}>
    <StatusBar style={quranTheme.mode==='light'?'dark':'light'} />
    <AppBanner language={language} top={insets.top} showHome={menuEnabled||tab==='quran'} onHome={goHome}
      onLanguages={() => setShowLanguages(true)} onSettings={() => setShowSettings(true)} />
    <SwipeTabs hideNavigation={homeVisible||(tab === 'quran' && readingBook)} language={language} tab={tab} reading={homeVisible||(tab === 'quran' && readingBook)} chromeVisible={readingChromeVisible} onChange={chooseSection}>
      <ScreenLayer testID="screen-qibla" active={!homeVisible&&tab === 'qibla'} background={quranTheme.theme.appBackground} top={headerHeight} bottom={navigationHeight}>
        <QiblaScreen language={language} state={locationState} bearing={qibla.bearing}
          calculationAvailable={isQiblaAvailable} calculationError={qibla.error}
          active={!homeVisible&&tab === 'qibla' && !showLocation && !showSettings && !showLanguages} mode={compassMode}
          onChangeLocation={() => setShowLocation(true)}
          onModeChange={mode => setPreferences(value => ({ ...value, compassMode: mode }))} />
      </ScreenLayer>
      <ScreenLayer testID="screen-adhan" active={!homeVisible&&tab === 'adhan'} background={quranTheme.theme.appBackground} top={headerHeight} bottom={navigationHeight}>
        <AdhanScreen language={language} state={locationState} times={schedule.times} tomorrowTimes={schedule.tomorrowTimes}
          error={schedule.error} calculationAvailable={isPrayerTimesAvailable} now={now}
          settings={settings} onPrayerSettings={() => setShowSettings(true)}
          active={!homeVisible&&tab==='adhan'&&!showSettings&&!showLocation&&!showLanguages}
          onChangeLocation={()=>setShowLocation(true)}/>
      </ScreenLayer>
      <ScreenLayer testID="screen-quran" active={!homeVisible&&tab === 'quran'} background={quranTheme.theme.appBackground}>
        <ConnectedQuranLibrary homeRequest={homeRequest} onHome={goHome} tafsirLibrary={tafsirLibrary} onBookOpenChange={setReadingBook} active={!homeVisible&&tab === 'quran'} language={language} settings={{...reader, nightMode:quranTheme.mode === 'dark'}}
          onReadingChromeChange={setReadingChromeVisible}
          onSettingsChange={reader => setPreferences(value => ({ ...value, reader }))} />
      </ScreenLayer>
      <ScreenLayer testID="screen-adhkar" active={!homeVisible&&tab==='adhkar'} background={quranTheme.theme.appBackground} top={headerHeight} bottom={navigationHeight}>
        <AdhkarScreen language={language} active={!homeVisible&&tab==='adhkar'&&!showSettings&&!showReminders} testing={preferences.devotional.testing} request={adhkarRequest} onReadingChange={setAdhkarReading} onReminders={()=>setShowReminders(true)}/>
      </ScreenLayer>
      <ScreenLayer testID="screen-home" active={homeVisible} background={quranTheme.theme.appBackground} top={headerHeight}><MainMenu language={language} onChoose={chooseSection} onLocation={()=>setShowLocation(true)} onSettings={()=>setShowSettings(true)}/></ScreenLayer>

    </SwipeTabs>
    <SettingsSheet language={language} visible={showSettings}
      testingLanguages={preferences.testingLanguages} onTestingLanguagesChange={enabled=>setPreferences(value=>({...value,...restoreLanguagePreferences(value.language,enabled)}))}
      textSize={reader.fontSize} onTextSizeChange={fontSize=>setPreferences(value=>({...value,reader:{...value.reader,fontSize}}))}
      mainMenuOnPhones={preferences.mainMenuOnPhones} onMainMenuChange={enabled=>{setPreferences(value=>({...value,mainMenuOnPhones:enabled}));if(!largeScreen){setHomeVisible(enabled&&!readingBook);if(enabled&&!readingBook)setShowSettings(false);}}}
      onClose={() => setShowSettings(false)} prayer={settings} timezone={timezone}
      onPrayerChange={prayer => setPreferences(value => ({ ...value, prayer }))}
      compassMode={compassMode} onCompassModeChange={mode => setPreferences(value => ({ ...value, compassMode: mode }))}
      notifications={<PrayerNotificationSettings language={language} ready={preferencesReady && locationState.ready}
        enabled={preferences.prayerNotifications} notifications={notifications}
        prayerSounds={preferences.prayerSounds} onPrayerSoundsChange={prayerSounds=>setPreferences(value=>({...value,prayerSounds}))}
        onChange={prayerNotifications => setPreferences(value => ({ ...value, prayerNotifications }))}
        onChooseLocation={() => { setShowSettings(false); setShowLocation(true); }} />}
      devotional={<Pressable testID="settings-reminders" accessibilityRole="button" onPress={()=>{setShowSettings(false);setShowReminders(true)}} style={{minHeight:48,justifyContent:'center'}}><Text style={{color:quranTheme.theme.appText,fontSize:16,textAlign:isRTL(language)?'right':'left'}}>{bilingual(language,'التذكيرات','Reminders')}</Text></Pressable>}
      testing={<DevotionalTestingSettings language={language} preferences={preferences.devotional} onChange={devotional=>setPreferences(value=>({...value,devotional}))}/>}
      quran={<ConnectedQuranSettings library={tafsirLibrary} language={language} />} />
    <LanguagePicker extraTesting={preferences.testingLanguages} language={language} visible={showLanguages} onChoose={language => setPreferences(value => ({ ...value, language }))} onClose={() => setShowLanguages(false)} />
    <LocationSheet language={language} visible={showLocation} state={locationState} onClose={() => setShowLocation(false)} />
    <DevotionalSettings visible={showReminders} onClose={()=>setShowReminders(false)} language={language} preferences={preferences.devotional} onChange={devotional=>setPreferences(value=>({...value,devotional}))} reminders={devotional}/>
  </SafeAreaView></QuranThemeContext.Provider></TextSizeContext.Provider>;
}

function ConnectedQuranLibrary(props: Omit<React.ComponentProps<typeof QuranLibrary>, 'audio'>) {
  return <QuranLibrary {...props} audio={useQuranAudioController()}/>;
}
function ConnectedQuranSettings(props: Omit<React.ComponentProps<typeof QuranSettings>, 'audio'>) {
  return <QuranSettings {...props} audio={useQuranAudioController()}/>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B211D' },
});
