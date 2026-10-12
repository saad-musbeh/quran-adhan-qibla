import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { bilingual, localeFor, isRTL, type Language } from '../i18n';
import { notificationCopy } from '../notification-i18n';
import type { usePrayerNotifications } from '../use-prayer-notifications';
import { useReaderStyles } from '../quran-theme-context';

type Props = {
  language: Language; enabled: boolean; ready: boolean; onChange: (enabled: boolean) => void;
  notifications: ReturnType<typeof usePrayerNotifications>; onChooseLocation: () => void;
};

export function PrayerNotificationSettings({ language, enabled, ready, onChange, notifications, onChooseLocation }: Props) {
  const { styles } = useReaderStyles(baseStyles);
  const c = notificationCopy(language, Platform.OS), rtl = isRTL(language);
  const [busy, setBusy] = useState(false), [testSent, setTestSent] = useState(false), [failed, setFailed] = useState(false);
  const text = rtl ? styles.rtl : undefined;
  async function toggle(value: boolean) {
    setFailed(false); setTestSent(false); onChange(value);
    if (!value) return;
    setBusy(true);
    try { await notifications.requestPermission(); } catch { setFailed(true); }
    finally { setBusy(false); }
  }
  async function test() {
    setBusy(true); setFailed(false); setTestSent(false);
    try { const sent = await notifications.testAlert(); setTestSent(sent); setFailed(!sent); } catch { setFailed(true); }
    finally { setBusy(false); }
  }
  const action = (label: string, onPress: () => void, testID?: string) => <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={busy} style={styles.button}><Text style={[styles.buttonText, text]}>{label}</Text></Pressable>;
  const status = notifications.status;
  return <View style={styles.root}>
    <Text style={[styles.title, text]}>{c.title}</Text>
    {Platform.OS !== 'android' && Platform.OS !== 'ios' ? <Text style={[styles.note, text]}>{c.unsupported}</Text> : <>
      <View style={[styles.row, rtl && styles.reverse]}>
        <Text style={[styles.label, text]}>{c.toggle}</Text>
        <Switch testID="prayer-alert-toggle" accessibilityLabel={c.toggle} value={enabled} disabled={!ready || busy} onValueChange={value => { void toggle(value); }} trackColor={{ false: '#35544B', true: '#D6BA7A' }} thumbColor="#F4EFE4" />
      </View>
      <Text style={[styles.note, text]}>{c.note}</Text>
      {enabled && status === 'needs-location' && action(c.location, onChooseLocation)}
      {enabled && (status === 'permission-required' || status === 'channel-muted') && <>
        <Text style={[styles.note, text]}>{status === 'channel-muted' ? c.channelOff : c.permission}</Text>
        {action(c.settings, () => { void notifications.openAppSettings().then(ok => { if (!ok) setFailed(true); }); })}
      </>}
      {enabled && notifications.timing === 'may-be-delayed' && <>
        <Text style={[styles.note, text]}>{c.exact}</Text>
        {action(c.exactSettings, () => { void notifications.openExactAlarmSettings().then(ok => { if (!ok) setFailed(true); }); })}
      </>}
      {enabled && status === 'ready' && action(c.test, () => { void test(); }, 'prayer-test-alert')}
      {enabled && notifications.scheduledCount > 0 && <Text testID="prayer-scheduled-count" style={[styles.note,text]}>{bilingual(language,'التنبيهات القادمة: {n}','Upcoming alerts: {n}',{n:notifications.scheduledCount.toLocaleString(localeFor(language))})}</Text>}
      {enabled && testSent && <Text testID="prayer-test-sent" accessibilityRole="alert" style={[styles.note, text]}>{c.testNote}</Text>}
      {(failed || (enabled && (status === 'error' || status === 'calculation-unavailable'))) && <Text accessibilityRole="alert" style={[styles.error, text]}>{c.error}</Text>}
    </>}
  </View>;
}

const baseStyles = StyleSheet.create({
  root: { gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#35544B' },
  title: { color: '#D6BA7A', fontWeight: '700', fontSize: 15, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 },
  label: { color: '#F4EFE4', fontSize: 14, flex: 1 },
  note: { color: '#A8C1B8', fontSize: 13, lineHeight: 22 },
  button: { minHeight: 48, justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: '#D6BA7A', borderRadius: 12 },
  buttonText: { color: '#F4EFE4', fontSize: 14 }, error: { color: '#F0B9A1', fontSize: 13, lineHeight: 22 },
  reverse: { flexDirection: 'row-reverse' }, rtl: { textAlign: 'right', writingDirection: 'rtl' },
});
