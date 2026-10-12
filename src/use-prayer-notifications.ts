import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';
import type { PrayerSettings } from './domain/prayers';
import type { Coordinates } from './domain/location';
import { isPrayerTimesAvailable, prayerTimes } from '../modules/islamic-core';
import { canScheduleExactAlarms } from './prayer-notification-permissions';
import { buildPrayerNotificationSchedule, isPrayerNotificationOwned, PRAYER_NOTIFICATION_NAMESPACE, type NotifiablePrayer } from './domain/prayer-notifications';

if (Platform.OS === 'android') {
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
  location: Pick<Coordinates, 'latitude' | 'longitude'> | null;
  settings: PrayerSettings;
  /** Rebuild existing notifications after app-language changes. */
  language: string;
  labels: PrayerNotificationLabels;
  /** Android raw sound filename registered with expo-notifications, or null for silent. */
  sound?: string | null;
};

const initialState = {
  status: 'disabled' as PrayerNotificationStatus,
  scheduledCount: 0,
  error: null as string | null,
  timing: null as PrayerNotificationTiming | null,
};

function channelIdForSound(sound: string | null): string {
  return 'prayer-v1-' + (sound ? sound.replace(/[^a-zA-Z0-9_-]/g, '_') : 'silent');
}

export function usePrayerNotifications(input: Inputs) {
  const [state, setState] = useState(initialState);
  const generation = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const inputs = useRef(input);
  inputs.current = input;
  const mounted = useRef(true);
  const appPackage = Constants.expoConfig?.android?.package ?? 'org.saadmusbeh.quranadhanqibla';

  const enqueueReconcile = useCallback(() => {
    if (!mounted.current || inputs.current.ready === false) return;
    const ownGeneration = ++generation.current;
    queue.current = queue.current.catch(() => {}).then(async () => {
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
      if (Platform.OS !== 'android') { setStatus('unsupported'); return; }
      const newlyScheduled: string[] = [];
      let owned: Notifications.NotificationRequest[] = [];
      try {
        const pending = await Notifications.getAllScheduledNotificationsAsync();
        if (!current()) return;
        owned = pending.filter(isPrayerNotificationOwned);
        const cancelOwned = async () => {
          for (const item of owned) {
            if (!current()) return;
            await Notifications.cancelScheduledNotificationAsync(item.identifier);
          }
        };
        if (!value.enabled) {
          await cancelOwned();
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
        if (permission.status !== 'granted') {
          await cancelOwned();
          setStatus('permission-required');
          return;
        }
        if (!isPrayerTimesAvailable) {
          await cancelOwned();
          setStatus('calculation-unavailable');
          return;
        }
        const sound = value.sound ?? null;
        const soundKey = sound ? sound.replace(/[^a-zA-Z0-9_-]/g, '_') : 'silent';
        const channelId = `prayer-v1-${soundKey}`;
        await Notifications.setNotificationChannelAsync(channelId, {
          name: value.labels.channelName,
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          sound,
        });
        const channel = await Notifications.getNotificationChannelAsync(channelId);
        if (!current()) return;
        const channelMuted = channel?.importance === Notifications.AndroidImportance.NONE || channel?.sound === null;
        const now = new Date();
        const schedule = buildPrayerNotificationSchedule(now, date => prayerTimes(
          value.location!.latitude, value.location!.longitude, date, value.settings,
        ), 8); // Remaining prayers today plus seven following dates cover a full week between launches.
        await cancelOwned();
        if (!current()) return;
        let count = 0;
        for (const item of schedule) {
          if (!current()) {
            await Promise.all(newlyScheduled.map(identifier => Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {})));
            return;
          }
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
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.at, channelId },
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
  useEffect(() => { enqueueReconcile(); }, [enqueueReconcile, input.ready, input.enabled, input.location?.latitude, input.location?.longitude, input.settings.method, input.settings.hanafi, input.settings.ramadan, input.language, input.sound, timezone]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') enqueueReconcile();
    });
    return () => subscription.remove();
  }, [enqueueReconcile]);

  // One calendar-midnight wake-up refreshes the seven-date horizon; this is not polling.
  useEffect(() => {
    if (Platform.OS !== 'android' || !input.enabled || input.ready === false) return;
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
  }, [enqueueReconcile, input.ready, input.enabled, input.location?.latitude, input.location?.longitude, input.settings.method, input.settings.hanafi, input.settings.ramadan, input.language, input.sound, timezone]);

  /** Call only from the user's explicit enable action. Mount and foreground never prompt. */
  const requestPermission = useCallback(async () => {
    if (Platform.OS !== 'android') return false;
    const sound = inputs.current.sound ?? null;
    const channelId = channelIdForSound(sound);
    await Notifications.setNotificationChannelAsync(channelId, {
      name: inputs.current.labels.channelName,
      importance: Notifications.AndroidImportance.HIGH,
      sound,
      vibrationPattern: [0, 250, 250, 250],
    });
    const existing = await Notifications.getPermissionsAsync();
    const result = existing.status === 'granted' ? existing : await Notifications.requestPermissionsAsync();
    enqueueReconcile();
    return result.status === 'granted';
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
  const testAlert = useCallback(async () => {
    if (Platform.OS !== 'android' || inputs.current.ready === false) return false;
    try {
      const value = inputs.current;
      if ((await Notifications.getPermissionsAsync()).status !== 'granted') return false;
      const sound = value.sound ?? null;
      const channelId = channelIdForSound(sound);
      await Notifications.setNotificationChannelAsync(channelId, {
        name: value.labels.channelName,
        importance: Notifications.AndroidImportance.HIGH,
        sound,
      });
      await Notifications.scheduleNotificationAsync({
        content: {
          title: value.labels.testTitle ?? value.labels.title,
          body: value.labels.testBody ?? value.labels.body('fajr'),
          sound: sound ?? false,
          data: { namespace: PRAYER_NOTIFICATION_NAMESPACE, test: true },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(Date.now() + 5_000),
          channelId,
        },
      });
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
