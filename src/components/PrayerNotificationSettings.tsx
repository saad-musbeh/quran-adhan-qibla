import { Text } from '../text-size';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { bilingual, localeFor, isRTL, translations, type Language } from '../i18n';
import { notificationCopy } from '../notification-i18n';
import { ADHAN_VOICES, type PrayerSoundSettings } from '../domain/adhan-voices';
import { NOTIFIABLE_PRAYERS, type NotifiablePrayer } from '../domain/prayer-notifications';
import type { usePrayerNotifications } from '../use-prayer-notifications';
import { useReaderStyles } from '../quran-theme-context';

type Props = {
  language: Language; enabled: boolean; ready: boolean; onChange: (enabled: boolean) => void;
  notifications: ReturnType<typeof usePrayerNotifications>; onChooseLocation: () => void;
  prayerSounds: PrayerSoundSettings; onPrayerSoundsChange: (settings: PrayerSoundSettings) => void;
};

export function PrayerNotificationSettings({ language, enabled, ready, onChange, notifications, onChooseLocation, prayerSounds, onPrayerSoundsChange }: Props) {
  const { styles, colors } = useReaderStyles(baseStyles);
  const c = notificationCopy(language, Platform.OS), rtl = isRTL(language);
  const t = translations[language];
  const [choosingPrayer, setChoosingPrayer] = useState<NotifiablePrayer | null>(null);
  const [busy, setBusy] = useState(false), [testSent, setTestSent] = useState(false), [failed, setFailed] = useState(false);
  const text = rtl ? styles.rtl : undefined;
  async function toggle(value: boolean) {
    setFailed(false); setTestSent(false); onChange(value);
    if (!value) return;
    setBusy(true);
    try { await notifications.requestPermission(); } catch { setFailed(true); }
    finally { setBusy(false); }
  }
  async function test(prayer: NotifiablePrayer = 'fajr') {
    setBusy(true); setFailed(false); setTestSent(false);
    try { const sent = await notifications.testAlert(prayer); setTestSent(sent); setFailed(!sent); } catch { setFailed(true); }
    finally { setBusy(false); }
  }
  const action = (label: string, onPress: () => void, testID?: string) => <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={busy} style={styles.button}><Text style={[styles.buttonText, text]}>{label}</Text></Pressable>;
  const status = notifications.status;
  return <View style={styles.root}>
    <Text style={[styles.title, text]}>{c.title}</Text>
    {Platform.OS !== 'android' && Platform.OS !== 'ios' ? <Text style={[styles.note, text]}>{c.unsupported}</Text> : <>
      <View style={[styles.row, rtl && styles.reverse]}>
        <Text style={[styles.label, text]}>{c.toggle}</Text>
        <Switch testID="prayer-alert-toggle" accessibilityLabel={c.toggle} value={enabled} disabled={!ready || busy} onValueChange={value => { void toggle(value); }} trackColor={{ false: colors.appBorder, true: colors.accent }} thumbColor={colors.lightPaper} />
      </View>
      {enabled && <Text style={[styles.note, text]}>{c.note}</Text>}
      {enabled && NOTIFIABLE_PRAYERS.map(prayer => {
        const choice = prayerSounds[prayer];
        const selectedVoice = ADHAN_VOICES.find(voice => voice.id === choice.voiceId)!;
        const open = choosingPrayer === prayer;
        const voiceLabel = (voice: typeof ADHAN_VOICES[number]) => language === 'ar' ? voice.nameAr : voice.name;
        return <View key={prayer} style={styles.prayer}>
          <View style={[styles.row, rtl && styles.reverse]}>
            <Text style={[styles.label, text]}>{t[prayer]}</Text>
            <Switch testID={`adhan-${prayer}-toggle`} accessibilityLabel={`${c.toggle}: ${t[prayer]}`} value={choice.enabled} disabled={!ready || busy} trackColor={{false:colors.appBorder,true:colors.accent}} thumbColor={colors.lightPaper}
              onValueChange={value=>{onPrayerSoundsChange({...prayerSounds,[prayer]:{...choice,enabled:value}});setTestSent(false)}}/>
          </View>
          {choice.enabled ? <>
            <Pressable testID={`adhan-${prayer}-voice`} accessibilityRole="button" accessibilityState={{expanded:open}} disabled={busy} onPress={()=>setChoosingPrayer(open?null:prayer)} style={[styles.voice,rtl&&styles.reverse]}>
              <Ionicons name="volume-high-outline" size={20} color={colors.accent}/>
              <Text style={[styles.label,text]}>{voiceLabel(selectedVoice)}</Text><Ionicons name={open?'chevron-up':'chevron-down'} size={18} color={colors.accent}/>
            </Pressable>
            {open && <View style={styles.voices}>
              {ADHAN_VOICES.filter(voice=>!voice.fajr||prayer==='fajr').map(voice=><Pressable testID={`adhan-${prayer}-${voice.id}`} key={voice.id} accessibilityRole="radio" accessibilityState={{checked:choice.voiceId===voice.id}} disabled={busy} style={[styles.voice,rtl&&styles.reverse]} onPress={()=>{onPrayerSoundsChange({...prayerSounds,[prayer]:{...choice,voiceId:voice.id}});setTestSent(false)}}>
                <Ionicons name={voice.id===choice.voiceId?'radio-button-on':'radio-button-off'} size={21} color={colors.accent}/><Text style={[styles.label,text]}>{voiceLabel(voice)}</Text>
              </Pressable>)}
              {status==='ready'&&action(`${c.test} · ${t[prayer]}`,()=>{void test(prayer)},`test-adhan-${prayer}`)}
            </View>}
          </> : <View style={[styles.voice,rtl&&styles.reverse]}><Ionicons name="volume-mute-outline" size={18} color={colors.appMuted}/><Text style={[styles.note,text]}>{bilingual(language,'تنبيه صامت','Silent notification')}</Text></View>}
        </View>;
      })}
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
  prayer: { borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'#35544B',paddingTop:4 },
  voice: { minHeight:48,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:8 },
  voices: { paddingHorizontal:8,paddingBottom:8,gap:2 },
  root: { gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#35544B' },
  title: { color: '#D6BA7A', fontWeight: '700', fontSize: 15, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48 },
  label: { color: '#F4EFE4', fontSize: 14, flex: 1 },
  note: { color: '#A8C1B8', fontSize: 13, lineHeight: 22 },
  button: { minHeight: 48, justifyContent: 'center', padding: 12, borderWidth: 1, borderColor: '#D6BA7A', borderRadius: 12 },
  buttonText: { color: '#F4EFE4', fontSize: 14 }, error: { color: '#F0B9A1', fontSize: 13, lineHeight: 22 },
  reverse: { flexDirection: 'row-reverse' }, rtl: { textAlign: 'right', writingDirection: 'rtl' },
});
