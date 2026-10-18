import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { enqueueNotificationReconcile } from './notification-queue';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';
import type { PrayerSettings } from './domain/prayers';
import type { Coordinates } from './domain/location';
import { adhanSoundForPrayer, prayerSoundChannelId, type PrayerSoundSettings } from './domain/adhan-voices';
import { isPrayerTimesAvailable, prayerTimes } from '../modules/islamic-core';
import { allowsPrayerNotifications, prayerSoundMuted } from './domain/notification-permission';
import { canScheduleExactAlarms } from './prayer-notification-permissions';
import { buildPrayerNotificationSchedule, isPrayerNotificationOwned, isPrayerTestNotification, IOS_PENDING_NOTIFICATION_LIMIT, PRAYER_NOTIFICATION_NAMESPACE, type NotifiablePrayer, NOTIFIABLE_PRAYERS } from './domain/prayer-notifications';

if (Platform.OS === 'android' || Platform.OS === 'ios') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export type PrayerNotificationStatus =
  | 'unsupported'
  | 'disabled'
  | 'needs-location'
  | 'permission-required'
  | 'calculation-unavailable'
  | 'ready'
  | 'channel-muted'
  | 'error';
export type PrayerNotificationTiming = 'exact' | 'may-be-delayed';
export type PrayerNotificationLabels = {
  title: string;
  channelName: string;
  body: (prayer: NotifiablePrayer) => string;
  testTitle?: string;
  testBody?: string;
};
type Inputs = {
  /** Wait until persisted preferences and location have hydrated before reconciling OS alarms. */
  ready?: boolean;
  enabled: boolean;
  /** iOS budget after reserving enabled devotional reminders and test alerts. */
  notificationLimit?: number;
  location: Pick<Coordinates, 'latitude' | 'longitude'> | null;
  settings: PrayerSettings;
  /** Rebuild existing notifications after app-language changes. */
  language: string;
  labels: PrayerNotificationLabels;
  /** Each prayer keeps its reminder when its Adhan sound is disabled. */
  prayerSounds?: PrayerSoundSettings;
  /** Legacy single sound, used only without per-prayer settings. */
  sound?: string | null;
};

const initialState = {
  status: 'disabled' as PrayerNotificationStatus,
  scheduledCount: 0,
  error: null as string | null,
  timing: null as PrayerNotificationTiming | null,
};

function soundForPrayer(input: Inputs, prayer: NotifiablePrayer): string | null {
  return input.prayerSounds ? adhanSoundForPrayer(input.prayerSounds, prayer, Platform.OS) : input.sound ?? null;
}

async function ensureSoundChannel(sound: string | null, name: string): Promise<string> {
  const channelId = prayerSoundChannelId(sound);
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(channelId, {
    name,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound,
  });
  return channelId;
}

export function usePrayerNotifications(input: Inputs) {
  const [state, setState] = useState(initialState);
  const generation = useRef(0);
  const inputs = useRef(input);
  inputs.current = input;
  const mounted = useRef(true);
  const appPackage = Constants.expoConfig?.android?.package ?? 'org.saadmusbeh.quranadhanqibla';

  const enqueueReconcile = useCallback(() => {
    if (!mounted.current || inputs.current.ready === false) return;
    const ownGeneration = ++generation.current;
    enqueueNotificationReconcile(async () => {
      const current = () => ownGeneration === generation.current && inputs.current.ready !== false;
      const value = inputs.current;
      if (value.ready === false) return;
      const setStatus = (status: PrayerNotificationStatus, scheduledCount = 0, error: string | null = null) => {
        if (mounted.current && current()) setState({
          status,
          scheduledCount,
          error,
          timing: Platform.OS === 'android' ? (canScheduleExactAlarms() ? 'exact' : 'may-be-delayed') : null,
        });
      };
      if (Platform.OS !== 'android' && Platform.OS !== 'ios') { setStatus('unsupported'); return; }
      const newlyScheduled: string[] = [];
      let owned: Notifications.NotificationRequest[] = [];
      try {
        const pending = await Notifications.getAllScheduledNotificationsAsync();
        if (!current()) return;
        const allOwned = pending.filter(item => isPrayerNotificationOwned(item));
        owned = allOwned.filter(item => !isPrayerTestNotification(item));
        const cancelAllOwned = async () => {
          for (const item of allOwned) {
            if (!current()) return;
            await Notifications.cancelScheduledNotificationAsync(item.identifier);
          }
        };
        const cancelOwned = async () => {
          for (const item of owned) {
            if (!current()) return;
            await Notifications.cancelScheduledNotificationAsync(item.identifier);
          }
        };
        if (!value.enabled) {
          // The master toggle cancels every owned reminder, including a pending test alert.
          await cancelAllOwned();
          setStatus('disabled');
          return;
        }
        if (!value.location) {
          await cancelOwned();
          setStatus('needs-location');
          return;
        }
        const permission = await Notifications.getPermissionsAsync();
        if (!current()) return;
        if (!allowsPrayerNotifications(permission, Platform.OS)) {
          await cancelOwned();
          setStatus('permission-required');
          return;
        }
        if (!isPrayerTimesAvailable) {
          await cancelOwned();
          setStatus('calculation-unavailable');
          return;
        }
        const sounds = [...new Set(NOTIFIABLE_PRAYERS.map(prayer => soundForPrayer(value, prayer)))];
        let channelMuted = prayerSoundMuted(permission, Platform.OS, sounds.some(Boolean));
        for (const sound of sounds) {
          const channelId = await ensureSoundChannel(sound, value.labels.channelName);
          const channel = Platform.OS === 'android' ? await Notifications.getNotificationChannelAsync(channelId) : null;
          if (!current()) return;
          channelMuted ||= Platform.OS === 'android' && (channel?.importance === Notifications.AndroidImportance.NONE || (Boolean(sound) && channel?.sound === null));
        }
        const now = new Date();
        const schedule = buildPrayerNotificationSchedule(now, date => prayerTimes(
          value.location!.latitude, value.location!.longitude, date, value.settings,
        ), 8); // Remaining prayers today plus seven following dates cover a full week between launches.
        await cancelOwned();
        if (!current()) return;
        // Old devotional slots can still be pending while their replacement is queued.
        // Expand to the desired horizon again after devotional reconciliation completes.
        const remaining = Platform.OS === 'ios' ? await Notifications.getAllScheduledNotificationsAsync() : [];
        const limit = Platform.OS === 'ios' ? Math.min(value.notificationLimit ?? 40, Math.max(0, IOS_PENDING_NOTIFICATION_LIMIT - remaining.length)) : 40;
        let count = 0;
        for (const item of schedule.slice(0, limit)) {
          if (!current()) {
            await Promise.all(newlyScheduled.map(identifier => Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {})));
            return;
          }
          const sound = soundForPrayer(value, item.prayer);
          const channelId = prayerSoundChannelId(sound);
          const identifier = await Notifications.scheduleNotificationAsync({
            content: {
              title: value.labels.title,
              body: value.labels.body(item.prayer),
              sound: sound ?? false,
              data: {
                namespace: PRAYER_NOTIFICATION_NAMESPACE,
                prayer: item.prayer,
                date: item.date.join('-'),
              },
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.at, ...(Platform.OS === 'android' ? {channelId} : {}) },
          });
          newlyScheduled.push(identifier);
          count++;
        }
        setStatus(channelMuted ? 'channel-muted' : 'ready', count);
      } catch (error) {
        // A failed recalculation must not leave alerts for the previous city or prayer settings.
        const obsolete = new Set([...newlyScheduled, ...owned.map(item => item.identifier)]);
        await Promise.all([...obsolete].map(identifier => Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {})));
        setStatus('error', 0, error instanceof Error ? error.message : String(error));
      }
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; };
  }, []);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Primitive dependency also notices callers changing nested prayer choices in place.
  const prayerSoundsKey = input.prayerSounds ? NOTIFIABLE_PRAYERS.map(prayer => {
    const choice = input.prayerSounds![prayer];
    return `${prayer}:${choice.enabled}:${choice.voiceId}`;
  }).join('|') : '';
  useEffect(() => { enqueueReconcile(); }, [enqueueReconcile, input.ready, input.enabled, input.notificationLimit, input.location?.latitude, input.location?.longitude, input.settings.method, input.settings.hanafi, input.settings.ramadan, input.settings.highLatitudeRule, input.settings.polarRule, input.language, input.sound, prayerSoundsKey, timezone]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') enqueueReconcile();
    });
    return () => subscription.remove();
  }, [enqueueReconcile]);

  // One calendar-midnight wake-up refreshes the seven-date horizon; this is not polling.
  useEffect(() => {
    if ((Platform.OS !== 'android' && Platform.OS !== 'ios') || !input.enabled || input.ready === false) return;
    let timer: ReturnType<typeof setTimeout>;
    const armNextMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(() => {
        enqueueReconcile();
        armNextMidnight();
      }, Math.max(1, nextMidnight.getTime() - now.getTime() + 500));
    };
    armNextMidnight();
    return () => clearTimeout(timer);
  }, [enqueueReconcile, input.ready, input.enabled, input.notificationLimit, input.location?.latitude, input.location?.longitude, input.settings.method, input.settings.hanafi, input.settings.ramadan, input.settings.highLatitudeRule, input.settings.polarRule, input.language, input.sound, prayerSoundsKey, timezone]);

  /** Call only from the user's explicit enable action. Mount and foreground never prompt. */
  const requestPermission = useCallback(async () => {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;
    const sounds = [...new Set(NOTIFIABLE_PRAYERS.map(prayer => soundForPrayer(inputs.current, prayer)))];
    for (const sound of sounds) await ensureSoundChannel(sound, inputs.current.labels.channelName);
    const existing = await Notifications.getPermissionsAsync();
    const result = allowsPrayerNotifications(existing, Platform.OS) && !prayerSoundMuted(existing, Platform.OS, sounds.some(Boolean)) ? existing : await Notifications.requestPermissionsAsync({ios:{allowAlert:true,allowSound:true,allowBadge:false}});
    enqueueReconcile();
    return allowsPrayerNotifications(result, Platform.OS);
  }, [enqueueReconcile]);

  /** Opens Android's Alarms & reminders access screen; the user can return to trigger reconciliation. */
  const openExactAlarmSettings = useCallback(async () => {
    if (Platform.OS !== 'android') return false;
    try {
      await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM, {
        data: 'package:' + appPackage,
      });
      enqueueReconcile();
      return true;
    } catch {
      try {
        await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, {
          data: 'package:' + appPackage,
        });
        enqueueReconcile();
        return true;
      } catch { return false; }
    }
  }, [enqueueReconcile]);

  const openAppSettings = useCallback(async () => {
    if (Platform.OS === 'ios') {
      try { await Linking.openSettings(); return true; } catch { return false; }
    }
    if (Platform.OS !== 'android') return false;
    try {
      await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS, {
        extra: { 'android.provider.extra.APP_PACKAGE': appPackage },
      });
      enqueueReconcile();
      return true;
    } catch {
      try {
        await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, {
          data: 'package:' + appPackage,
        });
        enqueueReconcile();
        return true;
      } catch { return false; }
    }
  }, [enqueueReconcile]);

  /** Explicitly schedule a five-second test reminder on the configured prayer channel. */
  const testAlert = useCallback(async (prayer: NotifiablePrayer = 'fajr') => {
    if ((Platform.OS !== 'android' && Platform.OS !== 'ios') || inputs.current.ready === false) return false;
    try {
      const value = inputs.current;
      if (!allowsPrayerNotifications(await Notifications.getPermissionsAsync(), Platform.OS)) return false;
      const sound = soundForPrayer(value, prayer);
      const channelId = await ensureSoundChannel(sound, value.labels.channelName);
      const pending = await Notifications.getAllScheduledNotificationsAsync();
      for (const item of pending) {
        if (isPrayerTestNotification(item)) await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: value.labels.testTitle ?? value.labels.title,
          body: value.labels.testBody ?? value.labels.body(prayer),
          sound: sound ?? false,
          data: { namespace: PRAYER_NOTIFICATION_NAMESPACE, test: true, prayer },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Date.now() + 5_000),
          ...(Platform.OS === 'android' ? {channelId} : {}),
        },
      });
      // A disable that lands while this async test was scheduling must still win.
      if (inputs.current.enabled !== true) {
        await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
        return false;
      }
      return true;
    } catch { return false; }
  }, []);

  return {
    ...state,
    reconcile: enqueueReconcile,
    requestPermission,
    openExactAlarmSettings,
    openAppSettings,
    testAlert,
  };
}
