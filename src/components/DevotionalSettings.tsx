import { useEffect, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SalawatReminders } from './SalawatReminders';
import { Pressable } from './Pressable';
import { Text, TextInput } from '../text-size';
import { bilingual, isRTL, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';
import { formatClock, normalizeDevotionalPreferences, parseClock, type DevotionalPreferences, type ReminderMode, type ReminderStyle } from '../domain/devotional-reminders';
import { collectionTitle } from '../adhkar-i18n';
import type { useDevotionalReminders } from '../use-devotional-reminders';

type Props = { visible: boolean; onClose: () => void; language: Language; preferences: DevotionalPreferences; onChange: (value: DevotionalPreferences) => void; reminders: ReturnType<typeof useDevotionalReminders> };

function ClockField({ value, onChange, language, label, testID }: { value:string; onChange:(value:string)=>void; language:Language; label:string; testID:string }) {
  const { styles, colors }=useReaderStyles(baseStyles);
  const [text,setText]=useState(value),[invalid,setInvalid]=useState(false);
  useEffect(()=>{setText(value);setInvalid(false);},[value]);
  const save=()=>{const minute=parseClock(text);setInvalid(minute===null);if(minute!==null){const next=formatClock(minute);setText(next);onChange(next);}};
  return <View style={styles.clockField}><TextInput testID={testID} accessibilityLabel={label} value={text} onChangeText={value=>{setText(value);setInvalid(false)}} onBlur={save} onSubmitEditing={save} placeholder="HH:MM" maxLength={5} autoCorrect={false} autoCapitalize="none" selectTextOnFocus keyboardType="numbers-and-punctuation" placeholderTextColor={colors.appMuted} style={[styles.input,{color:colors.appText,borderColor:invalid?'#C56D56':colors.appBorder}]} />{invalid&&<Text accessibilityRole="alert" style={styles.error}>{bilingual(language,'أدخل الوقت بصيغة ٠٧:٣٠','Enter a time such as 07:30')}</Text>}</View>;
}

export function DevotionalSettings({visible,onClose,language,preferences:value,onChange,reminders}:Props){
  const {styles,colors}=useReaderStyles(baseStyles),rtl=isRTL(language),insets=useSafeAreaInsets();
  const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState<'sent'|'failed'|null>(null);
  const align=rtl?styles.rtl:undefined;
  const salawat=bilingual(language,'الصلاة على النبي','Salawat');
  const save=(next:DevotionalPreferences)=>{setFeedback(null);onChange(normalizeDevotionalPreferences(next));};
  async function enable(kind:'salawat'|'morning'|'evening',enabled:boolean){
    save({...value,[kind]:{...value[kind],enabled}});
    if(!enabled)return;
    setBusy(true);try{await reminders.requestPermission();}catch{setFeedback('failed');}finally{setBusy(false);}
  }
  const toggle=(label:string,enabled:boolean,action:(next:boolean)=>void,id:string)=><View style={[styles.row,rtl&&styles.reverse]}><Text style={[styles.label,styles.flex,align]}>{label}</Text><Switch testID={id} accessibilityLabel={label} disabled={busy} value={enabled} onValueChange={action} trackColor={{false:colors.appBorder,true:colors.accent}} thumbColor={colors.lightPaper}/></View>;
  const choice=(label:string,selected:boolean,action:()=>void,id:string)=><Pressable key={id} testID={id} accessibilityRole="radio" accessibilityState={{checked:selected}} onPress={action} style={[styles.choice,rtl&&styles.reverse]}><Ionicons name={selected?'radio-button-on':'radio-button-off'} size={22} color={colors.accent}/><Text style={[styles.label,align]}>{label}</Text></Pressable>;
  const modeLabel=(mode:ReminderMode)=>mode==='times'?bilingual(language,'أوقات أختارها','Chosen times'):mode==='interval'?bilingual(language,'كل فترة','Repeat interval'):bilingual(language,'مع مواقيت الصلاة','At prayer times');
  const styleLabel=(style:ReminderStyle)=>style==='spoken'?bilingual(language,'تذكير صوتي','Spoken reminder'):style==='tone'?bilingual(language,'نغمة ونص','Tone and text'):bilingual(language,'نص صامت','Silent text');
  const status=reminders.status;
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><View accessibilityViewIsModal style={[styles.root,{paddingTop:insets.top,paddingBottom:insets.bottom}]}>
    <View style={[styles.header,rtl&&styles.reverse]}><Text accessibilityRole="header" style={[styles.title,align]}>{bilingual(language,'التذكيرات','Reminders')}</Text><Pressable testID="reminders-close" accessibilityRole="button" accessibilityLabel={bilingual(language,'إغلاق','Close')} style={styles.icon} onPress={onClose}><Ionicons name="close" size={28} color={colors.accent}/></Pressable></View>
    <ScrollView testID="reminders-settings" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {toggle(salawat,value.salawat.enabled,next=>{void enable('salawat',next)},'salawat-enabled')}
      <SalawatReminders language={language} value={value.salawat} visible={visible} onChange={salawat=>save({...value,salawat})}/>
      {toggle(bilingual(language,'تفعيل التنبيه الصوتي','Enable reminder sound'),value.salawat.style!=='silent',sound=>save({...value,salawat:{...value.salawat,style:sound?'spoken':'silent'}}),'salawat-sound-enabled')}
      {value.salawat.enabled&&<View style={styles.section}>
        {value.testing.styles&&(['spoken','silent','tone'] as const).map(style=>choice(styleLabel(style),value.salawat.style===style,()=>save({...value,salawat:{...value.salawat,style}}),`salawat-style-${style}`))}
        {value.testing.schedules&&(['times','interval','prayers'] as const).map(mode=>choice(modeLabel(mode),value.salawat.mode===mode,()=>save({...value,salawat:{...value.salawat,mode}}),`salawat-mode-${mode}`))}
        {value.salawat.mode==='times'&&<>
          {value.salawat.times.map((time,index)=><View key={index} style={[styles.row,rtl&&styles.reverse]}>
            <ClockField testID={`salawat-time-${index}`} language={language} label={`${salawat} ${index+1}`} value={time} onChange={next=>save({...value,salawat:{...value.salawat,times:value.salawat.times.map((item,i)=>i===index?next:item)}})}/>
            {value.salawat.times.length>1&&<Pressable testID={`salawat-remove-${index}`} accessibilityRole="button" accessibilityLabel={bilingual(language,'حذف الوقت','Remove time')} style={styles.icon} onPress={()=>save({...value,salawat:{...value.salawat,times:value.salawat.times.filter((_,i)=>i!==index)}})}><Ionicons name="trash-outline" size={22} color={colors.accent}/></Pressable>}
          </View>)}
          {value.salawat.times.length<6&&<Pressable testID="salawat-add-time" accessibilityRole="button" style={styles.button} onPress={()=>{const used=new Set(value.salawat.times);let minute=9*60;while(used.has(formatClock(minute))&&minute<24*60-1)minute++;save({...value,salawat:{...value.salawat,times:[...value.salawat.times,formatClock(minute)]}})}}><Text style={styles.buttonText}>{bilingual(language,'إضافة وقت','Add time')}</Text></Pressable>}
        </>}
        {value.salawat.mode==='prayers'&&<Text style={[styles.note,align]}>{bilingual(language,'افتح التطبيق يوميًا لتحديث هذه التذكيرات التجريبية.','Open the app daily to refresh these testing reminders.')}</Text>}
      </View>}
      {(['morning','evening'] as const).map(kind=><View key={kind} style={styles.section}>
        {toggle(collectionTitle(language,kind),value[kind].enabled,next=>{void enable(kind,next)},`reminder-${kind}-enabled`)}
        {value[kind].enabled&&<ClockField testID={`reminder-${kind}-time`} language={language} label={collectionTitle(language,kind)} value={value[kind].time} onChange={time=>save({...value,[kind]:{...value[kind],time}})}/>}
      </View>)}
      {status==='permission-required'&&<Text accessibilityRole="alert" style={[styles.note,align]}>{bilingual(language,'اسمح بالإشعارات من إعدادات الهاتف.','Allow notifications in phone settings.')}</Text>}
      {status==='muted'&&<Text accessibilityRole="alert" style={[styles.note,align]}>{bilingual(language,'صوت الإشعارات مغلق في إعدادات الهاتف.','Notification sound is off in phone settings.')}</Text>}
      {(status==='muted'||status==='permission-required')&&<Pressable accessibilityRole="button" style={styles.button} onPress={()=>{void reminders.openSettings().catch(()=>setFeedback('failed'))}}><Text style={styles.buttonText}>{bilingual(language,'إعدادات الهاتف','Phone settings')}</Text></Pressable>}
      {status==='needs-location'&&<Text accessibilityRole="alert" style={[styles.note,align]}>{bilingual(language,'اختر موقعًا من صفحة الأذان.','Choose a location on the Adhan page.')}</Text>}
      {status==='invalid-window'&&<Text accessibilityRole="alert" style={[styles.error,align]}>{bilingual(language,'اجعل وقت النهاية بعد البداية، أو قصّر المدة بين البداية والنهاية أو اختر فترة تكرار أطول.','Set the end after the start, shorten the daily window, or choose a longer repeat interval.')}</Text>}
      {(status==='error'||status==='unavailable')&&<Text accessibilityRole="alert" style={[styles.error,align]}>{bilingual(language,'التذكيرات غير متاحة. حاول مجددًا.','Reminders are unavailable. Try again.')}</Text>}
      {Platform.OS==='ios'&&value.salawat.enabled&&value.salawat.mode==='interval'&&<Text style={[styles.note,align]}>{bilingual(language,'مع التذكيرات المتكررة، افتح التطبيق يوميًا لتحديث تنبيهات الأذان القادمة.','With frequent reminders, open the app daily to refresh upcoming Adhan alerts.')}</Text>}
      <Pressable testID="salawat-test" accessibilityRole="button" disabled={busy||Platform.OS==='web'} style={styles.button} onPress={()=>{void(async()=>{setBusy(true);setFeedback(null);try{const allowed=await reminders.requestPermission();setFeedback(allowed&&await reminders.test()?'sent':'failed')}catch{setFeedback('failed')}finally{setBusy(false)}})()}}><Text style={styles.buttonText}>{bilingual(language,'تجربة التذكير','Test reminder')}</Text></Pressable>
      {feedback&&<Text accessibilityRole="alert" style={[feedback==='failed'?styles.error:styles.note,align]}>{feedback==='sent'?bilingual(language,'سيصلك التذكير بعد ٥ ثوانٍ.','The reminder will arrive in 5 seconds.'):bilingual(language,'تعذر إرسال التذكير.','Could not send the reminder.')}</Text>}
    </ScrollView>
  </View></Modal>;
}

export function DevotionalTestingSettings({language,preferences:value,onChange}:{language:Language;preferences:DevotionalPreferences;onChange:(value:DevotionalPreferences)=>void}){
  const {styles,colors}=useReaderStyles(baseStyles),rtl=isRTL(language);
  const labels:Record<keyof DevotionalPreferences['testing'],string>={counters:bilingual(language,'عدادات الأذكار','Adhkar counters'),single:bilingual(language,'ذِكر واحد في كل صفحة','One dhikr at a time'),styles:bilingual(language,'أنماط التذكير','Reminder styles'),schedules:bilingual(language,'جداول التذكير التجريبية','Testing reminder schedules')};
  return <View>{(Object.keys(labels) as (keyof typeof labels)[]).map(key=><View key={key} style={[styles.row,rtl&&styles.reverse]}><Text style={[styles.label,styles.flex,rtl&&styles.rtl]}>{labels[key]}</Text><Switch testID={`testing-devotional-${key}`} accessibilityLabel={labels[key]} value={value.testing[key]} onValueChange={enabled=>onChange(normalizeDevotionalPreferences({...value,testing:{...value.testing,[key]:enabled}}))} trackColor={{false:colors.appBorder,true:colors.accent}} thumbColor={colors.lightPaper}/></View>)}</View>;
}

const baseStyles=StyleSheet.create({root:{flex:1,backgroundColor:'#0B211D'},header:{minHeight:58,paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{flex:1,fontSize:23,color:'#FAF7EF',fontWeight:'600'},content:{width:'100%',maxWidth:760,alignSelf:'center',padding:18,gap:12},row:{minHeight:52,flexDirection:'row',gap:12,alignItems:'center',justifyContent:'space-between'},reverse:{flexDirection:'row-reverse'},label:{fontSize:16,color:'#FAF7EF',flexShrink:1},flex:{flex:1},icon:{minWidth:44,minHeight:48,alignItems:'center',justifyContent:'center'},section:{gap:10,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'#35544B',paddingBottom:16},input:{minWidth:112,minHeight:48,borderWidth:1,borderRadius:12,paddingHorizontal:14,fontSize:20,textAlign:'center',writingDirection:'ltr'},clockField:{flexShrink:1,gap:4},choice:{minHeight:48,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:8},button:{minHeight:48,padding:12,borderWidth:1,borderColor:'#DBAB68',borderRadius:12,justifyContent:'center'},buttonText:{fontSize:15,color:'#FAF7EF',textAlign:'center'},note:{fontSize:13,lineHeight:22,color:'#A8C1B8'},error:{fontSize:14,lineHeight:22,color:'#F0B9A1'},rtl:{textAlign:'right',writingDirection:'rtl'}});
