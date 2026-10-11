import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {methods, nextPrayer, prayerNames, type PrayerSettings} from '../domain/prayers';
import {translations, type Language} from '../i18n';
import type {useLocation} from '../use-location';

type Props = {
  language: Language;
  state: ReturnType<typeof useLocation>;
  times: Date[] | null;
  error: 'polarUnsupported' | 'prayerError' | null;
  calculationAvailable: boolean;
  now: Date;
  timezone: string;
  settings: PrayerSettings;
  onSettingsChange: (settings: PrayerSettings) => void;
  onChangeLocation: () => void;
};

const sourceNames = {
  en: {device: 'Device location', city: 'Selected city', map: 'Selected map point', manual: 'Manual location', location: 'Location', change: 'Change location', close: 'Close settings'},
  ar: {device: 'موقع الجهاز', city: 'المدينة المختارة', map: 'النقطة المختارة على الخريطة', manual: 'موقع مُدخل يدويًا', location: 'الموقع', change: 'تغيير الموقع', close: 'إغلاق الإعدادات'},
} as const;

export function AdhanScreen({language, state, times, error, calculationAvailable, now, timezone, settings, onSettingsChange, onChangeLocation}: Props) {
  const t = translations[language];
  const copy = sourceNames[language];
  const rtl = language === 'ar';
  const locale = language === 'ar' ? 'ar-SA-u-ca-gregory' : 'en';
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsError, setSettingsError] = useState(false);
  const [availableHeight, setAvailableHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const compact = availableHeight > 0 && availableHeight <= 500;
  const upcoming = useMemo(() => times?.length === prayerNames.length ? nextPrayer(times, now) : null, [times, now]);
  const location = state.location;
  const sourceLabel = location ? `${copy[location.source]}${location.label ? ` · ${location.label}` : ''}` : '';

  const retryLocation = () => { void state.locate(); };
  const locationError = state.error ? t[state.error] : null;

  return <View onLayout={event => setAvailableHeight(event.nativeEvent.layout.height)} style={[styles.container, compact && styles.containerCompact]}>
    <View style={[styles.heading, rtl && styles.rowRtl]}>
      <View style={styles.headingCopy}>
        <Text style={[styles.title, compact && styles.titleCompact, rtl && styles.textRtl]}>{t.adhanTitle}</Text>
        {location && times && <Text numberOfLines={1} style={[styles.date, compact && styles.dateCompact, rtl && styles.textRtl]}>{now.toLocaleDateString(locale, {weekday: compact ? 'short' : 'long', day: 'numeric', month: compact ? 'short' : 'long'})}{compact ? ` · ${timezone}` : ''}</Text>}
      </View>
      {location && <Pressable accessibilityRole="button" accessibilityLabel={copy.change} onPress={onChangeLocation} style={styles.changeButton}>
        <Text style={[styles.changeText, rtl && styles.textRtl]}>{copy.location}</Text>
      </Pressable>}
    </View>

    {!location ? <View style={styles.emptyState}>
      <Text style={[styles.emptyBody, rtl && styles.textRtl]}>{t.adhanBody}</Text>
      {(locationError || settingsError) && <Text accessibilityRole="alert" style={[styles.error, rtl && styles.textRtl]}>{settingsError ? t.locationError : locationError}</Text>}
      {state.error === 'blocked' && <Pressable accessibilityRole="button" onPress={() => { setSettingsError(false); void Linking.openSettings().catch(() => setSettingsError(true)); }} style={styles.linkButton}>
        <Text style={styles.linkText}>{t.openSettings}</Text>
      </Pressable>}
      <View style={[styles.actionRow, rtl && styles.rowRtl]}>
        <Pressable accessibilityRole="button" accessibilityState={{disabled: state.loading}} disabled={state.loading} onPress={retryLocation} style={[styles.primaryButton, state.loading && styles.disabled]}>
          {state.loading ? <ActivityIndicator color="#102A25" size="small" /> : null}
          <Text style={styles.primaryText}>{state.loading ? t.locating : t.useLocation}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onChangeLocation} style={styles.secondaryButton}>
          <Text style={[styles.secondaryText, rtl && styles.textRtl]}>{copy.change}</Text>
        </Pressable>
      </View>
      {!calculationAvailable && <Text accessibilityRole="alert" style={[styles.error, rtl && styles.textRtl]}>{t.unavailable}</Text>}
    </View> : <>
      <View style={[styles.locationStrip, rtl && styles.rowRtl]}>
        <Text numberOfLines={1} style={[styles.locationText, rtl && styles.textRtl]}>{sourceLabel}</Text>
        {state.loading ? <ActivityIndicator color="#D6BA7A" size="small" /> : null}
      </View>

      {error || !calculationAvailable || !times ? <View style={styles.errorPanel}>
        <Text accessibilityRole="alert" style={[styles.error, rtl && styles.textRtl]}>{error ? t[error] : !calculationAvailable ? t.unavailable : locationError ?? t.prayerError}</Text>
        {locationError && <Pressable accessibilityRole="button" onPress={retryLocation} style={styles.retryButton}>
          <Text style={styles.retryText}>{t.useLocation}</Text>
        </Pressable>}
      </View> : <>
        {upcoming ? <View style={[styles.nextCard, compact && styles.nextCardCompact, rtl && styles.rowRtl]}>
          <View style={styles.nextCopy}>
            <Text style={[styles.nextLabel, compact && styles.nextLabelCompact, rtl && styles.textRtl]}>{t.next}</Text>
            <Text style={[styles.nextName, compact && styles.nextNameCompact, rtl && styles.textRtl]}>{t[upcoming]}</Text>
          </View>
          <Text style={[styles.nextTime, compact && styles.nextTimeCompact]}>{times[prayerNames.indexOf(upcoming)]!.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}</Text>
        </View> : <View style={styles.finishedCard}><Text style={[styles.finishedText, rtl && styles.textRtl]}>{t.finishedToday}</Text></View>}

        <View style={styles.prayerList}>
          {prayerNames.map((name, index) => {
            const isNext = name === upcoming;
            return <View key={name} style={[styles.prayerRow, compact && styles.prayerRowCompact, rtl && styles.rowRtl, isNext && styles.prayerRowNext]}>
              <Text style={[styles.prayerName, compact && styles.prayerNameCompact, name === 'sunrise' && styles.sunriseText, isNext && styles.prayerNameNext, rtl && styles.textRtl]}>{t[name]}</Text>
              <Text style={[styles.prayerTime, compact && styles.prayerTimeCompact, name === 'sunrise' && styles.sunriseText, isNext && styles.prayerTimeNext]}>{times[index]!.toLocaleTimeString(locale, {hour: '2-digit', minute: '2-digit'})}</Text>
            </View>;
          })}
        </View>

        <View style={styles.bottomArea}>
          <Pressable accessibilityRole="button" accessibilityLabel={t.settings} accessibilityState={{expanded: settingsOpen}} onPress={() => setSettingsOpen(true)} style={styles.settingsButton}>
            <Text style={styles.settingsIcon}>⚙</Text>
            <Text style={[styles.settingsText, rtl && styles.textRtl]}>{t.settings}</Text>
          </Pressable>
          {!compact && <Text numberOfLines={1} style={[styles.timezone, rtl && styles.textRtl]}>{t.phoneTimezone}: {timezone}</Text>}
        </View>
      </>}
    </>}

    <Modal visible={settingsOpen} animationType="slide" transparent statusBarTranslucent onRequestClose={() => setSettingsOpen(false)}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.close} style={styles.scrim} onPress={() => setSettingsOpen(false)} />
        <View style={[styles.sheet, {paddingBottom: Math.max(20, insets.bottom + 12)}]}>
          <View style={[styles.sheetHeader, rtl && styles.rowRtl]}>
            <Text style={[styles.sheetTitle, rtl && styles.textRtl]}>{t.settings}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={copy.close} onPress={() => setSettingsOpen(false)} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.settingsScroll} contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator>
            <Text style={[styles.sectionLabel, rtl && styles.textRtl]}>{t.method}</Text>
            {methods.map(method => <Pressable key={method.id} accessibilityRole="radio" accessibilityState={{checked: settings.method === method.id}} onPress={() => onSettingsChange({...settings, method: method.id})} style={[styles.methodChoice, settings.method === method.id && styles.choiceSelected, rtl && styles.rowRtl]}>
              <Text style={[styles.choiceText, rtl && styles.textRtl]}>{t[method.label]}</Text>
              {settings.method === method.id && <Text style={styles.checkmark}>✓</Text>}
            </Pressable>)}

            <Text style={[styles.sectionLabel, rtl && styles.textRtl]}>{t.asrSchool}</Text>
            <View style={[styles.asrRow, rtl && styles.rowRtl]}>
              {[false, true].map(hanafi => <Pressable key={String(hanafi)} accessibilityRole="radio" accessibilityState={{checked: settings.hanafi === hanafi}} onPress={() => onSettingsChange({...settings, hanafi})} style={[styles.asrChoice, settings.hanafi === hanafi && styles.choiceSelected]}>
                <Text style={[styles.choiceText, rtl && styles.textRtl]}>{hanafi ? t.hanafiAsr : t.standardAsr}</Text>
              </Pressable>)}
            </View>

            {settings.method === 0 && <>
              <View style={[styles.ramadanRow, rtl && styles.rowRtl]}>
                <Text style={[styles.ramadanLabel, rtl && styles.textRtl]}>{t.ramadan}</Text>
                <Switch accessibilityLabel={t.ramadan} value={settings.ramadan} onValueChange={ramadan => onSettingsChange({...settings, ramadan})} trackColor={{false: '#35544B', true: '#D6BA7A'}} thumbColor={settings.ramadan ? '#0B211D' : '#D8E1DD'} />
              </View>
              <Text style={[styles.settingNote, rtl && styles.textRtl]}>{t.normalIsha}</Text>
            </>}
            <Text style={[styles.settingNote, rtl && styles.textRtl]}>{t.highLatitude}</Text>
            <Text style={[styles.settingNote, rtl && styles.textRtl]}>{t.verifyTimes}</Text>
            <Text style={[styles.settingNote, rtl && styles.textRtl]}>{t.phoneTimezone}: {timezone}</Text>
            <Text style={[styles.settingNote, rtl && styles.textRtl]}>{t.adhanNext}</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  container: {flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 12, paddingBottom: 8, gap: 10},
  containerCompact: {paddingHorizontal: 18, paddingTop: 4, paddingBottom: 4, gap: 3},
  heading: {minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10},
  headingCopy: {flex: 1, gap: 2},
  title: {color: '#F4EFE4', fontSize: 22, lineHeight: 28, fontWeight: '600'},
  titleCompact: {fontSize: 19, lineHeight: 25},
  date: {color: '#A8C1B8', fontSize: 12, lineHeight: 17},
  dateCompact: {fontSize: 11, lineHeight: 14},
  changeButton: {minHeight: 44, paddingHorizontal: 11, justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: '#35544B'},
  changeText: {color: '#D6BA7A', fontSize: 12, fontWeight: '700'},
  emptyState: {flex: 1, justifyContent: 'center', gap: 18},
  emptyBody: {color: '#B8CDC4', fontSize: 17, lineHeight: 26},
  actionRow: {flexDirection: 'row', gap: 10},
  primaryButton: {minHeight: 52, flex: 1.2, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#D6BA7A', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center'},
  primaryText: {color: '#102A25', fontSize: 15, fontWeight: '700'},
  secondaryButton: {minHeight: 52, flex: 1, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: '#35544B', alignItems: 'center', justifyContent: 'center'},
  secondaryText: {color: '#F4EFE4', fontSize: 14, fontWeight: '600'},
  linkButton: {minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 2},
  linkText: {color: '#D6BA7A', fontSize: 14, textDecorationLine: 'underline'},
  disabled: {opacity: 0.6},
  locationStrip: {minHeight: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  locationText: {flex: 1, color: '#A8C1B8', fontSize: 12},
  nextCard: {minHeight: 84, paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: '#806E42', backgroundColor: '#193A32'},
  nextCardCompact: {minHeight: 54, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 13},
  nextCopy: {flex: 1, gap: 2},
  nextLabel: {color: '#D6BA7A', fontSize: 12, fontWeight: '600'},
  nextLabelCompact: {fontSize: 11},
  nextName: {color: '#F4EFE4', fontSize: 22, lineHeight: 29, fontWeight: '700'},
  nextNameCompact: {fontSize: 19, lineHeight: 23},
  nextTime: {color: '#D6BA7A', fontSize: 26, fontWeight: '700', fontVariant: ['tabular-nums']},
  nextTimeCompact: {fontSize: 22},
  finishedCard: {padding: 14, borderRadius: 14, backgroundColor: '#15342E'},
  finishedText: {color: '#D6BA7A', fontSize: 14, lineHeight: 20},
  prayerList: {gap: 1},
  prayerRow: {minHeight: 42, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, borderRadius: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#29463E'},
  prayerRowCompact: {minHeight: 34, paddingHorizontal: 11, borderRadius: 8},
  prayerRowNext: {backgroundColor: '#284C40', borderBottomColor: 'transparent'},
  prayerName: {color: '#F4EFE4', fontSize: 16, flexShrink: 1},
  prayerNameCompact: {fontSize: 15},
  prayerNameNext: {color: '#D6BA7A', fontWeight: '700'},
  prayerTime: {color: '#B8CDC4', fontSize: 17, fontVariant: ['tabular-nums']},
  prayerTimeCompact: {fontSize: 16},
  prayerTimeNext: {color: '#F4EFE4', fontWeight: '700'},
  sunriseText: {color: '#80998F'},
  bottomArea: {marginTop: 'auto', gap: 4},
  settingsButton: {minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, borderWidth: 1, borderColor: '#35544B'},
  settingsIcon: {color: '#D6BA7A', fontSize: 16},
  settingsText: {color: '#F4EFE4', fontSize: 13, fontWeight: '600'},
  timezone: {color: '#A8C1B8', fontSize: 11, lineHeight: 14, textAlign: 'center'},
  errorPanel: {padding: 14, gap: 10, borderRadius: 14, backgroundColor: '#2C3027'},
  error: {color: '#FFB3A8', fontSize: 14, lineHeight: 21},
  retryButton: {minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 2},
  retryText: {color: '#D6BA7A', fontSize: 14, fontWeight: '700'},
  textRtl: {textAlign: 'right', writingDirection: 'rtl'},
  rowRtl: {flexDirection: 'row-reverse'},
  modalRoot: {flex: 1, justifyContent: 'flex-end'},
  scrim: {...StyleSheet.absoluteFill, backgroundColor: '#0009'},
  sheet: {maxHeight: '88%', minHeight: '45%', paddingTop: 12, paddingHorizontal: 20, paddingBottom: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#0B211D', borderWidth: 1, borderColor: '#35544B'},
  sheetHeader: {minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8},
  sheetTitle: {color: '#F4EFE4', fontSize: 19, fontWeight: '700'},
  closeButton: {width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#15342E'},
  closeText: {color: '#F4EFE4', fontSize: 28, lineHeight: 32},
  settingsScroll: {flexGrow: 0},
  settingsContent: {gap: 9, paddingBottom: 10},
  sectionLabel: {marginTop: 8, marginBottom: 2, color: '#D6BA7A', fontSize: 13, fontWeight: '700'},
  methodChoice: {minHeight: 46, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: '#29463E', borderRadius: 11, gap: 8},
  choiceSelected: {borderColor: '#D6BA7A', backgroundColor: '#193A32'},
  choiceText: {flex: 1, color: '#F4EFE4', fontSize: 13, lineHeight: 19},
  checkmark: {color: '#D6BA7A', fontSize: 17, fontWeight: '700'},
  asrRow: {flexDirection: 'row', gap: 9},
  asrChoice: {minHeight: 44, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderWidth: 1, borderColor: '#29463E', borderRadius: 11},
  ramadanRow: {minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  ramadanLabel: {flex: 1, color: '#F4EFE4', fontSize: 13, lineHeight: 19},
  settingNote: {color: '#A8C1B8', fontSize: 12, lineHeight: 19},
});
