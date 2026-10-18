import { Pressable } from './Pressable';
import { Text } from '../text-size';
import {useMemo, useState} from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, View } from 'react-native';
import {LocationControl} from './LocationControl';
import {highLatitudeCopy} from './HighLatitudeSettings';
import type {PrayerSettings} from '../domain/prayers';
import {countdownParts, nextPrayerOccurrence, prayerNames, prayerOccurrenceFor} from '../domain/prayers';
import {useForegroundMinuteClock} from '../use-foreground-minute-clock';
import { bilingual, isRTL, localeFor, localizeCopy, translations, type Language } from '../i18n';
import type {useLocation} from '../use-location';
import { useReaderStyles } from '../quran-theme-context';

type Props = {
  language: Language;
  state: ReturnType<typeof useLocation>;
  times: Date[] | null;
  tomorrowTimes: Date[] | null;
  error: 'polarUnsupported' | 'prayerError' | null;
  calculationAvailable: boolean;
  now: Date;
  active: boolean;
  onChangeLocation: () => void;
  settings?: PrayerSettings;
  onPrayerSettings?: () => void;
};

const screenCopy = {
  en: {prayerTimes: 'Prayer times', nextAdhan: 'Next Adhan', tomorrow: 'Tomorrow'},
  ar: {prayerTimes: 'مواقيت الصلاة', nextAdhan: 'الأذان القادم', tomorrow: 'غدًا'},
} as const;

export function AdhanScreen({language, state, times, tomorrowTimes, error, calculationAvailable, now: scheduleNow, active, onChangeLocation, settings, onPrayerSettings}: Props) {
  const { styles, colors } = useReaderStyles(baseStyles);
  const t = translations[language];
  const copy = localizeCopy(language, screenCopy);
  const rtl = isRTL(language);
  const locale = localeFor(language);
  const now = useForegroundMinuteClock(active, scheduleNow);
  const [settingsError, setSettingsError] = useState(false);
  const [viewport, setViewport] = useState({width:0,height:0});
  const availableHeight=viewport.height;
  const landscape=viewport.width>=680&&viewport.width>viewport.height;
  const compact = availableHeight > 0 && availableHeight <= 500;
  const upcoming = useMemo(() => times?.length === prayerNames.length ? nextPrayerOccurrence(times, tomorrowTimes, now) : null, [times, tomorrowTimes, now]);
  const location = state.location;
  const highLatitude = localizeCopy(language, highLatitudeCopy);
  const remainingLabel = (time: Date) => {
    const parts = countdownParts(time, now);
    if (!parts) return null;
    const number = (value: number) => value.toLocaleString(locale, {useGrouping: false});
    return parts.hours
      ? bilingual(language,'بعد {hours} س و{minutes} د','In {hours}h {minutes}min',{hours:number(parts.hours),minutes:number(parts.minutes)})
      : bilingual(language,'بعد {minutes} د','In {minutes} min',{minutes:number(parts.minutes)});
  };
  const retryLocation = () => { void state.locate(); };
  const locationError = state.error ? t[state.error] : null;

  return <ScrollView style={styles.viewport} onLayout={event => setViewport(event.nativeEvent.layout)} contentContainerStyle={[styles.container, compact && styles.containerCompact,landscape&&styles.containerWide]}>
    <View style={[styles.heading, rtl && styles.rowRtl]}>
      <View style={styles.headingCopy}>
        <Text style={[styles.title, compact && styles.titleCompact, rtl && styles.textRtl]}>{copy.prayerTimes}</Text>
      </View>

    </View>

    <LocationControl testID="adhan-location" language={language} state={state} onPress={onChangeLocation} />
    {location && Math.abs(location.latitude) >= 48 && settings && <Pressable testID="prayer-latitude-policy" accessibilityRole="button" onPress={onPrayerSettings} disabled={!onPrayerSettings} style={styles.latitudePolicy}>
      <Text style={[styles.prayerRemaining, rtl && styles.textRtl]}>{Math.abs(location.latitude) >= 65 && settings.polarRule === 'nearest-latitude'
        ? highLatitude.estimates : `${highLatitude.title} · ${highLatitude[settings.highLatitudeRule ?? 'middle']}`}</Text>
    </Pressable>}
    {!location ? <View style={styles.emptyState}>
      <Text style={[styles.emptyBody, rtl && styles.textRtl]}>{t.adhanBody}</Text>
      {(locationError || settingsError) && <Text accessibilityRole="alert" style={[styles.error, rtl && styles.textRtl]}>{settingsError ? t.locationError : locationError}</Text>}
      {state.error === 'blocked' && <Pressable accessibilityRole="button" onPress={() => { setSettingsError(false); void Linking.openSettings().catch(() => setSettingsError(true)); }} style={styles.linkButton}>
        <Text style={styles.linkText}>{t.openSettings}</Text>
      </Pressable>}
      <View style={[styles.actionRow, rtl && styles.rowRtl]}>
        <Pressable accessibilityRole="button" accessibilityState={{disabled: state.loading}} disabled={state.loading} onPress={retryLocation} style={[styles.primaryButton, state.loading && styles.disabled]}>
          {state.loading ? <ActivityIndicator color={colors.appAccentInk} size="small" /> : null}
          <Text style={styles.primaryText}>{state.loading ? t.locating : t.useLocation}</Text>
        </Pressable>

      </View>
      {!calculationAvailable && <Text accessibilityRole="alert" style={[styles.error, rtl && styles.textRtl]}>{t.unavailable}</Text>}
    </View> : <>
      {(locationError || settingsError) && <View style={styles.errorPanel}>
        <Text accessibilityRole="alert" style={[styles.error, rtl && styles.textRtl]}>{settingsError ? t.locationError : locationError}</Text>
        <Pressable accessibilityRole="button" disabled={state.loading} onPress={state.error === 'blocked' ? () => {setSettingsError(false); void Linking.openSettings().catch(() => setSettingsError(true));} : retryLocation} style={styles.retryButton}>
          <Text style={styles.retryText}>{state.error === 'blocked' ? t.openSettings : t.useLocation}</Text>
        </Pressable>
      </View>}

      {error || !calculationAvailable || !times ? <View style={styles.errorPanel}>
        <Text accessibilityRole="alert" style={[styles.error, rtl && styles.textRtl]}>{error === 'polarUnsupported' ? highLatitude.disabled : error ? t[error] : !calculationAvailable ? t.unavailable : locationError ?? t.prayerError}</Text>
        {error === 'polarUnsupported' && onPrayerSettings && <Pressable accessibilityRole="button" onPress={onPrayerSettings} style={styles.retryButton}><Text style={styles.retryText}>{t.settings}</Text></Pressable>}
      </View> : <>
        <View style={[styles.schedule,landscape&&styles.scheduleWide]}><View style={landscape?styles.nextColumn:undefined}>
        {upcoming ? <View style={[styles.nextCard, compact && styles.nextCardCompact, rtl && styles.rowRtl]}>
          <View style={styles.nextCopy}>
            <Text style={[styles.nextLabel, compact && styles.nextLabelCompact, rtl && styles.textRtl]}>{copy.nextAdhan}{upcoming.tomorrow ? ` · ${copy.tomorrow}` : ''}</Text>
            <Text style={[styles.nextName, compact && styles.nextNameCompact, rtl && styles.textRtl]}>{t[upcoming.name]}</Text>
            <Text testID="next-adhan-countdown" style={[styles.nextRemaining, rtl && styles.textRtl]}>{remainingLabel(upcoming.time)}</Text>
          </View>
          <Text style={[styles.nextTime, compact && styles.nextTimeCompact]}>{upcoming.time.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}</Text>
        </View> : <View style={styles.errorPanel}><Text accessibilityRole="alert" style={[styles.error, rtl && styles.textRtl]}>{t.prayerError}</Text></View>}

        </View><View style={[styles.prayerList,landscape&&styles.listWide]}>
          {prayerNames.map((name, index) => {
            const occurrence = prayerOccurrenceFor(name, times, tomorrowTimes, now);
            const isNext = name === upcoming?.name;
            const displayTime = occurrence?.time ?? times[index]!;
            return <View testID={`prayer-row-${name}`} key={name} style={[styles.prayerRow, compact && styles.prayerRowCompact, rtl && styles.rowRtl, isNext && styles.prayerRowNext]}>
              <View style={styles.prayerNameGroup}>
                <Text style={[styles.prayerName, compact && styles.prayerNameCompact, name === 'sunrise' && styles.sunriseText, isNext && styles.prayerNameNext, rtl && styles.textRtl]}>{t[name]}{occurrence?.tomorrow ? ` · ${copy.tomorrow}` : ''}</Text>
                {occurrence && <Text testID={`prayer-countdown-${name}`} style={[styles.prayerRemaining, rtl && styles.textRtl]}>{remainingLabel(occurrence.time)}</Text>}
              </View>
              <Text style={[styles.prayerTime, compact && styles.prayerTimeCompact, name === 'sunrise' && styles.sunriseText, isNext && styles.prayerTimeNext]}>{displayTime.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}</Text>
            </View>;
          })}
        </View>

        </View>
      </>}
    </>}

  </ScrollView>;
}

const baseStyles = StyleSheet.create({
  viewport:{flex:1},schedule:{gap:10},scheduleWide:{flexDirection:'row-reverse',direction:'ltr',gap:24,alignItems:'center'},nextColumn:{flex:1},listWide:{flex:1},containerWide:{maxWidth:1100},
  container: {flexGrow: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 12, paddingBottom: 8, gap: 10},
  containerCompact: {paddingHorizontal: 18, paddingTop: 4, paddingBottom: 4, gap: 3},
  heading: {minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10},
  headingCopy: {flex: 1, gap: 2},
  title: {color: '#F4EFE4', fontSize: 22, lineHeight: 28, fontWeight: '600'},
  titleCompact: {fontSize: 19, lineHeight: 25},
  emptyState: {flex: 1, justifyContent: 'center', gap: 18},
  emptyBody: {color: '#B8CDC4', fontSize: 17, lineHeight: 26},
  actionRow: {flexDirection: 'row', gap: 10},
  primaryButton: {minHeight: 44, flex: 1.2, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#D6BA7A', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center'},
  primaryText: {color: '#102A25', fontSize: 15, fontWeight: '700'},
  linkButton: {minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 2},
  linkText: {color: '#D6BA7A', fontSize: 14, textDecorationLine: 'underline'},
  disabled: {opacity: 0.6},
  latitudePolicy: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  nextCard: {minHeight: 84, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: '#806E42', backgroundColor: '#193A32'},
  nextCardCompact: {minHeight: 54, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 13},
  nextCopy: {flex: 1, gap: 2},
  nextLabel: {color: '#D6BA7A', fontSize: 12, fontWeight: '600'},
  nextLabelCompact: {fontSize: 11},
  nextRemaining: {color: '#B8CDC4', fontSize: 13},
  nextName: {color: '#F4EFE4', fontSize: 22, lineHeight: 29, fontWeight: '700'},
  nextNameCompact: {fontSize: 19, lineHeight: 23},
  nextTime: {color: '#D6BA7A', fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums']},
  nextTimeCompact: {fontSize: 22},
  prayerList: {gap: 1},
  prayerRow: {minHeight: 54, gap: 10, paddingVertical: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, borderRadius: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#29463E'},
  prayerRowCompact: {minHeight: 44, paddingVertical: 4, paddingHorizontal: 11, borderRadius: 8},
  prayerRowNext: {backgroundColor: '#284C40', borderBottomColor: 'transparent'},
  prayerNameGroup: {flex: 1, gap: 2},
  prayerRemaining: {color: '#A8C1B8', fontSize: 12},
  prayerName: {color: '#F4EFE4', fontSize: 16, flexShrink: 1},
  prayerNameCompact: {fontSize: 15},
  prayerNameNext: {color: '#D6BA7A', fontWeight: '700'},
  prayerTime: {color: '#B8CDC4', fontSize: 17, fontVariant: ['tabular-nums']},
  prayerTimeCompact: {fontSize: 16},
  prayerTimeNext: {color: '#F4EFE4', fontWeight: '700'},
  sunriseText: {color: '#A8C1B8'},
  errorPanel: {padding: 14, gap: 10, borderRadius: 14, backgroundColor: '#2C3027'},
  error: {color: '#FFB3A8', fontSize: 14, lineHeight: 21},
  retryButton: {minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 2},
  retryText: {color: '#D6BA7A', fontSize: 14, fontWeight: '700'},
  textRtl: {textAlign: 'right', writingDirection: 'rtl'},
  rowRtl: {flexDirection: 'row-reverse'},
});
