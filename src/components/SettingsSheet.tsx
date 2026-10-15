import { Pressable } from './Pressable';
import { TextSizeSetting } from './TextSizeSetting';
import { Text } from '../text-size';
import type { ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { methods, type PrayerSettings } from '../domain/prayers';
import { translations, isRTL, localizeCopy, bilingual, type Language } from '../i18n';
import { useReaderStyles, useReaderTheme } from '../quran-theme-context';
import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CreditsSheet } from './CreditsSheet';
import { QuranThemePicker } from './QuranThemePicker';
import { HighLatitudeSettings } from './HighLatitudeSettings';
import { PrivacySheet } from './PrivacySheet';

const copy = {
  ar: { close: 'إغلاق الإعدادات', compass: 'عرض اتجاه القبلة', live: 'بوصلة الهاتف', north: 'عرض ثابت نحو الشمال الحقيقي', liveNote: 'ضع الهاتف مستويًا، وابتعد عن المعادن. يستخدم اتجاه الشمال الحقيقي عند توفر قراءة موثوقة.', northNote: 'الشمال الحقيقي أعلى الشاشة. هذا العرض ثابت ولا يتبع حركة الهاتف.' },
  en: { close: 'Close settings', compass: 'Qibla direction view', live: 'Phone compass', north: 'Fixed true-north view', liveNote: 'Hold your phone flat, away from metal. Uses true north when a reliable heading is available.', northNote: 'True north is at the top. This view stays fixed as you move the phone.' },
};

type Props = {
  language: Language; visible: boolean;
  onClose: () => void; prayer: PrayerSettings; onPrayerChange: (value: PrayerSettings) => void;
  timezone: string; compassMode: 'live' | 'north'; onCompassModeChange: (mode: 'live' | 'north') => void;
  quran: ReactNode; notifications: ReactNode;
  textSize: number; onTextSizeChange: (size:number)=>void;
  testingLanguages: boolean; onTestingLanguagesChange: (enabled: boolean) => void;
  mainMenuOnPhones: boolean; onMainMenuChange: (enabled: boolean) => void;
};

export function SettingsSheet({ language, visible, onClose, prayer, onPrayerChange, timezone, compassMode, onCompassModeChange, quran, notifications, textSize, onTextSizeChange, mainMenuOnPhones, onMainMenuChange, testingLanguages, onTestingLanguagesChange }: Props) {
  const { styles } = useReaderStyles(baseStyles);
  const { theme, themeId, setThemeId, mode, setMode } = useReaderTheme();
  const [testingVisible,setTestingVisible]=useState(false);
  const [creditsVisible,setCreditsVisible]=useState(false);
  const [privacyVisible,setPrivacyVisible]=useState(false);
  const [themePickerVisible, setThemePickerVisible] = useState(false);
  const [methodChoicesVisible, setMethodChoicesVisible] = useState(false);
  useEffect(() => { if (!visible) { setThemePickerVisible(false); setMethodChoicesVisible(false);setCreditsVisible(false);setPrivacyVisible(false);setTestingVisible(false); } }, [visible]);
  const t = translations[language]; const c = localizeCopy(language, copy); const rtl = isRTL(language);
  const insets = useSafeAreaInsets();
  const textStyle = rtl ? styles.rtl : undefined;
  const selectedMethod = methods.find(method=>method.id===prayer.method) ?? methods[0];
  function choice(label: string, selected: boolean, onPress: () => void) {
    return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress}
      style={[styles.choice, selected && styles.selected, rtl && styles.reverse]}>
      <Text style={[styles.choiceText, textStyle]}>{label}</Text><Text style={styles.mark}>{selected ? '✓' : ''}</Text>
    </Pressable>;
  }
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View accessibilityViewIsModal style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={[styles.header, rtl && styles.reverse]}><Text style={styles.title}>{t.settings}</Text>
        <Pressable accessibilityRole="button" testID="settings-close" accessibilityLabel={c.close} onPress={onClose} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
      </View>
      <ScrollView testID="overall-settings" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextSizeSetting language={language} size={textSize} onChange={onTextSizeChange}/>
        <QuranThemePicker visible={themePickerVisible} language={language} themeId={themeId} mode={mode} onModeChange={setMode} onChoose={setThemeId} onClose={() => setThemePickerVisible(false)} />
        <Pressable accessibilityRole="button" accessibilityLabel={bilingual(language, 'لون التطبيق', 'App color')} style={[styles.choice, rtl && styles.reverse]} onPress={() => setThemePickerVisible(true)}>
          <View style={[styles.colorChoice, rtl && styles.reverse]}><Ionicons name="color-palette-outline" size={22} color={theme.accent} /><Text style={[styles.choiceText, textStyle]}>{bilingual(language, 'لون التطبيق', 'App color')} · {bilingual(language, theme.arabicName, theme.name)}</Text></View>
          <Text style={styles.mark}>›</Text>
        </Pressable>
        <View style={[styles.switchRow, rtl && styles.reverse]}>
          <Text style={[styles.choiceText, {flex:1}, textStyle]}>{bilingual(language,'القائمة الرئيسية على الشاشات الصغيرة','Main menu on small screens')}</Text>
          <Switch testID="settings-main-menu-toggle" accessibilityLabel={bilingual(language,'القائمة الرئيسية على الشاشات الصغيرة','Main menu on small screens')} value={mainMenuOnPhones} onValueChange={onMainMenuChange} trackColor={{false:theme.pale,true:theme.accent}} thumbColor={theme.lightPaper}/>
        </View>
        <Text accessibilityRole="header" style={[styles.label,textStyle]}>{t.quran}</Text>
        {quran}
        {notifications}
        <Text accessibilityRole="header" style={[styles.label,textStyle]}>{bilingual(language,'مواقيت الصلاة','Prayer times')}</Text>
        <Pressable testID="prayer-method-picker" accessibilityRole="button" accessibilityState={{expanded:methodChoicesVisible}} accessibilityLabel={`${t.method}: ${t[selectedMethod.label]}`} onPress={()=>setMethodChoicesVisible(value=>!value)} style={[styles.choice,rtl&&styles.reverse]}>
          <View style={styles.colorChoice}><Text style={[styles.choiceText,textStyle]}>{t.method} · {t[selectedMethod.label]}</Text></View><Ionicons name={methodChoicesVisible?'chevron-up':'chevron-down'} size={20} color={theme.accent}/>
        </Pressable>
        {methodChoicesVisible&&methods.map(method=><View key={method.id}>{choice(t[method.label],prayer.method===method.id,()=>{onPrayerChange({...prayer,method:method.id});setMethodChoicesVisible(false);})}</View>)}
          <Text style={[styles.label, textStyle]}>{t.asrSchool}</Text>
          {choice(t.standardAsr, !prayer.hanafi, () => onPrayerChange({ ...prayer, hanafi: false }))}
          {choice(t.hanafiAsr, prayer.hanafi, () => onPrayerChange({ ...prayer, hanafi: true }))}
          {prayer.method === 0 && <><View style={[styles.switchRow, rtl && styles.reverse]}>
            <Text style={[styles.choiceText, textStyle]}>{t.ramadan}</Text>
            <Switch accessibilityLabel={t.ramadan} value={prayer.ramadan} onValueChange={ramadan => onPrayerChange({ ...prayer, ramadan })}
              trackColor={{ false: '#35544B', true: '#D6BA7A' }} thumbColor="#F4EFE4" />
          </View><Text style={[styles.note, textStyle]}>{t.normalIsha}</Text></>}
          <HighLatitudeSettings language={language} settings={prayer} onChange={onPrayerChange} />
          {[t.verifyTimes, `${t.phoneTimezone}: ${timezone}`].map(note => <Text key={note} style={[styles.note, textStyle]}>{note}</Text>)}
        <Text accessibilityRole="header" style={[styles.label,textStyle]}>{c.compass}</Text>
        {choice(c.live,compassMode==='live',()=>onCompassModeChange('live'))}
        {choice(c.north,compassMode==='north',()=>onCompassModeChange('north'))}
        <Text style={[styles.note,textStyle]}>{compassMode==='live'?c.liveNote:c.northNote}</Text>
        <Pressable testID="settings-extra-testing" accessibilityRole="button" accessibilityState={{expanded:testingVisible}} onPress={()=>setTestingVisible(value=>!value)} style={[styles.choice,rtl&&styles.reverse]}>
          <Text style={[styles.choiceText,textStyle]}>{bilingual(language,'إعدادات الاختبار الإضافية','Extra testing settings')}</Text>
          <Ionicons name={testingVisible?'chevron-up':'chevron-down'} size={20} color={theme.accent}/>
        </Pressable>
        {testingVisible&&<View style={{gap:8}}>
          <View style={[styles.switchRow,rtl&&styles.reverse]}>
            <Text style={[styles.choiceText,{flex:1},textStyle]}>{bilingual(language,'إظهار اللغات التجريبية','Show testing languages')}</Text>
            <Switch testID="settings-testing-languages" accessibilityLabel={bilingual(language,'إظهار اللغات التجريبية','Show testing languages')} value={testingLanguages} onValueChange={onTestingLanguagesChange} trackColor={{false:theme.appBorder,true:theme.accent}} thumbColor={theme.lightPaper}/>
          </View>
          <Text style={[styles.note,textStyle]}>{bilingual(language,'تظهر العربية والإنجليزية افتراضيًا. فعّل هذا الخيار لاختبار مسودات ترجمة الواجهة الأخرى. إيقافه يعيد اللغة إلى العربية إذا كانت لغة تجريبية محددة.','Arabic and English appear by default. Enable this to test the other draft interface translations. Turning it off returns to Arabic if a testing language is selected.')}</Text>
        </View>}
        <Pressable testID="settings-privacy" accessibilityRole="button" style={[styles.choice,rtl&&styles.reverse]} onPress={()=>setPrivacyVisible(true)}><Text style={[styles.choiceText,textStyle]}>{bilingual(language,'الخصوصية','Privacy')}</Text><Ionicons name="shield-checkmark-outline" size={22} color={theme.accent}/></Pressable>
        <Pressable testID="settings-credits" accessibilityRole="button" style={[styles.choice,rtl&&styles.reverse]} onPress={()=>setCreditsVisible(true)}><Text style={[styles.choiceText,textStyle]}>{bilingual(language,'المصادر وحقوق النشر','Credits')}</Text><Ionicons name="information-circle-outline" size={22} color={theme.accent}/></Pressable>
      </ScrollView>
      <CreditsSheet language={language} visible={creditsVisible} onClose={()=>setCreditsVisible(false)}/>
      <PrivacySheet language={language} visible={privacyVisible} onClose={()=>setPrivacyVisible(false)}/>
    </View>
  </Modal>;
}

const baseStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B211D' }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, minHeight: 58 },
  title: { color: '#F4EFE4', fontSize: 21, fontWeight: '600' }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, closeText: { color: '#D6BA7A', fontSize: 32 },
  content: { width:'100%', maxWidth:760, alignSelf:'center', paddingHorizontal: 18, paddingBottom: 28, gap: 10 }, label: { color: '#D6BA7A', fontWeight: '700', fontSize: 15, marginTop: 12 },
  choice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#DBAB68', borderRadius: 12, gap: 8 },
  colorChoice: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  choiceText: { color: '#F4EFE4', fontSize: 14, flexShrink: 1 }, mark: { color: '#D6BA7A', fontSize: 18 }, selected: { borderColor: '#D6BA7A', backgroundColor: '#193A32' },
  note: { color: '#A8C1B8', fontSize: 13, lineHeight: 22 }, switchRow: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  source: {minHeight:44,justifyContent:'center'},
  rtl: { textAlign: 'right', writingDirection: 'rtl' }, reverse: { flexDirection: 'row-reverse' },
});
