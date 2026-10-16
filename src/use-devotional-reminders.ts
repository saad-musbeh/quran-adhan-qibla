import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { isPrayerTimesAvailable, prayerTimes } from '../modules/islamic-core';
import { bilingual, type Language } from './i18n';
import { collectionTitle } from './adhkar-i18n';
import { allowsPrayerNotifications, prayerSoundMuted } from './domain/notification-permission';
import { buildPrayerNotificationSchedule } from './domain/prayer-notifications';
import { devotionalSchedule, DEVOTIONAL_NAMESPACE, DEVOTIONAL_SOUNDS, isDevotionalNotification, salawatMinutes, type DevotionalPreferences, type ReminderKind } from './domain/devotional-reminders';
import type { Coordinates } from './domain/location';
import type { PrayerSettings } from './domain/prayers';

type Inputs = { ready: boolean; preferences: DevotionalPreferences; language: Language; location: Coordinates | null; prayer: PrayerSettings; onOpen: (kind: ReminderKind) => void };
export type DevotionalStatus = 'disabled' | 'ready' | 'permission-required' | 'muted' | 'needs-location' | 'unavailable' | 'invalid-window' | 'error';

const soundFor = (kind: ReminderKind, settings: DevotionalPreferences): string | null => {
  const style = kind !== 'salawat' ? 'tone' : settings.salawat.style;
  return style==='silent' ? null : DEVOTIONAL_SOUNDS[style][Platform.OS==='ios'?'ios':'android'];
};
const channelFor = (sound: string | null) => `devotional-v1-${sound?.replace(/[^a-zA-Z0-9]/g,'_') ?? 'silent'}`;

export function useDevotionalReminders(input: Inputs) {
  const inputs = useRef(input); inputs.current = input;
  const [status,setStatus] = useState<DevotionalStatus>('disabled');
  const [scheduledCount,setScheduledCount] = useState(0);
  const revision = useRef(0), mounted = useRef(true), queue = useRef(Promise.resolve());
  const reconcile = useCallback(() => {
    if (!inputs.current.ready || !mounted.current) return;
    const generation = ++revision.current;
    queue.current = queue.current.catch(()=>{}).then(async()=>{
      if (generation!==revision.current || !mounted.current) return;
      const value=inputs.current, prefs=value.preferences;
      const current=()=>generation===revision.current && mounted.current;
      const finish=(next:DevotionalStatus,count=0)=>{if(current()){setStatus(next);setScheduledCount(count);}};
      if(Platform.OS!=='ios'&&Platform.OS!=='android'){finish('unavailable');return;}
      const added:string[]=[];
      try {
        const all=await Notifications.getAllScheduledNotificationsAsync();
        if(!current())return;
        // User-triggered five-second tests are independent of the recurring schedule.
        for(const item of all.filter(item=>isDevotionalNotification(item)&&item.content.data?.namespace===DEVOTIONAL_NAMESPACE)) await Notifications.cancelScheduledNotificationAsync(item.identifier);
        if(!current())return;
        if(!prefs.salawat.enabled&&!prefs.morning.enabled&&!prefs.evening.enabled){finish('disabled');return;}
        const permission=await Notifications.getPermissionsAsync();
        if(!allowsPrayerNotifications(permission,Platform.OS)){finish('permission-required');return;}
        let next:ReturnType<typeof buildPrayerNotificationSchedule>=[];
        let dependency:DevotionalStatus|null=null;
        if(prefs.salawat.enabled&&prefs.salawat.mode==='prayers'){
          if(!value.location)dependency='needs-location';
          else if(!isPrayerTimesAvailable)dependency='unavailable';
          else {
            try { next=buildPrayerNotificationSchedule(new Date(),date=>prayerTimes(value.location!.latitude,value.location!.longitude,date,value.prayer),8); }
            catch { dependency='unavailable'; }
          }
        }
        if(prefs.salawat.enabled&&prefs.salawat.mode==='interval'&&!salawatMinutes(prefs.salawat).length)dependency='invalid-window';
        const schedule=devotionalSchedule(prefs,next);
        let muted=false;
        const sounds=[...new Set(schedule.map(item=>soundFor(item.kind,prefs)))];
        for(const sound of sounds){
          if(Platform.OS==='android'){
            await Notifications.setNotificationChannelAsync(channelFor(sound),{name:bilingual(value.language,'التذكيرات','Reminders'),importance:Notifications.AndroidImportance.DEFAULT,sound,vibrationPattern:[0]});
            const channel=await Notifications.getNotificationChannelAsync(channelFor(sound));
            muted ||= channel?.importance===Notifications.AndroidImportance.NONE || (Boolean(sound)&&channel?.sound===null);
          }
        }
        muted ||= prayerSoundMuted(permission,Platform.OS,sounds.some(Boolean));
        for(const item of schedule){
          if(!current())break;
          const sound=soundFor(item.kind,prefs);
          const channelId=channelFor(sound);
          const title=item.kind==='salawat'?bilingual(value.language,'الصلاة على النبي','Salawat'):collectionTitle(value.language,item.kind);
          const id=await Notifications.scheduleNotificationAsync({
            content:{title,body:item.kind==='salawat'?bilingual(value.language,'صلِّ على رسول الله','Send blessings upon the Prophet'):title,sound:sound??false,data:{namespace:DEVOTIONAL_NAMESPACE,kind:item.kind}},
            trigger:'minute'in item?{type:Notifications.SchedulableTriggerInputTypes.DAILY,hour:Math.floor(item.minute/60),minute:item.minute%60,...(Platform.OS==='android'?{channelId}:{})}:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:item.at,...(Platform.OS==='android'?{channelId}:{})},
          });
          added.push(id);
        }
        if(!current()){await Promise.all(added.map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(()=>{})));return;}
        finish(dependency??(muted?'muted':'ready'),added.length);
      }catch{
        await Promise.all(added.map(id=>Notifications.cancelScheduledNotificationAsync(id).catch(()=>{})));
        finish('error');
      }
    });
  },[]);
  const key=JSON.stringify(input.preferences),prayerKey=JSON.stringify(input.prayer),timezone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  useEffect(()=>{reconcile();},[reconcile,input.ready,key,input.language,input.location?.latitude,input.location?.longitude,prayerKey,timezone]);
  useEffect(()=>{
    mounted.current=true;
    const listener=AppState.addEventListener('change',state=>{if(state==='active')reconcile();});
    let timer:ReturnType<typeof setTimeout>;
    const midnight=()=>{const next=new Date();next.setHours(24,0,0,100);timer=setTimeout(()=>{reconcile();midnight();},Math.max(100,next.getTime()-Date.now()));};midnight();
    return()=>{mounted.current=false;revision.current++;listener.remove();clearTimeout(timer);};
  },[reconcile]);
  useEffect(()=>{
    if(!input.ready || (Platform.OS!=='ios'&&Platform.OS!=='android'))return;
    let alive=true;
    const handle=(response:Notifications.NotificationResponse|null)=>{
      if(!alive||!response||!isDevotionalNotification(response.notification.request))return;
      const kind=response.notification.request.content.data?.kind;
      if(kind==='salawat'||kind==='morning'||kind==='evening')inputs.current.onOpen(kind);
      void Notifications.clearLastNotificationResponseAsync().catch(()=>{});
    };
    const listener=Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync().then(handle).catch(()=>{});
    return()=>{alive=false;listener.remove();};
  },[input.ready]);
  const requestPermission=useCallback(async()=>{
    if(Platform.OS!=='ios'&&Platform.OS!=='android')return false;
    const permission=await Notifications.requestPermissionsAsync({ios:{allowAlert:true,allowSound:true,allowBadge:false}});
    reconcile();return allowsPrayerNotifications(permission,Platform.OS);
  },[reconcile]);
  const test=useCallback(async()=>{
    if(Platform.OS!=='ios'&&Platform.OS!=='android')return false;
    const permission=await Notifications.getPermissionsAsync();
    if(!allowsPrayerNotifications(permission,Platform.OS))return false;
    const value=inputs.current,sound=soundFor('salawat',value.preferences),channelId=channelFor(sound);
    if(Platform.OS==='android')await Notifications.setNotificationChannelAsync(channelId,{name:bilingual(value.language,'التذكيرات','Reminders'),importance:Notifications.AndroidImportance.DEFAULT,sound,vibrationPattern:[0]});
    const pending=await Notifications.getAllScheduledNotificationsAsync();
    for(const item of pending.filter(item=>item.content.data?.namespace===`${DEVOTIONAL_NAMESPACE}.test`))await Notifications.cancelScheduledNotificationAsync(item.identifier);
    await Notifications.scheduleNotificationAsync({content:{title:bilingual(value.language,'الصلاة على النبي','Salawat'),body:bilingual(value.language,'صلِّ على رسول الله','Send blessings upon the Prophet'),sound:sound??false,data:{namespace:`${DEVOTIONAL_NAMESPACE}.test`}},trigger:{type:Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,seconds:5,...(Platform.OS==='android'?{channelId}:{})}});
    return true;
  },[]);
  return {status,scheduledCount,reconcile,requestPermission,test,openSettings:()=>Linking.openSettings()};
}
