import type { SalawatPhrase } from './domain/devotional-reminders';

// Metro chooses OGG on Android and WAV on iOS, matching notification packaging.
export const SALAWAT_PREVIEW_AUDIO: Record<SalawatPhrase, number> = {
  rasul: require('../assets/adhan/reminder_salawat_rasul.wav'),
  sallallahu: require('../assets/adhan/reminder_salawat_sallallahu.wav'),
  prophet: require('../assets/adhan/reminder_salawat_prophet.wav'),
  muhammad: require('../assets/adhan/reminder_salawat_muhammad.wav'),
  english: require('../assets/adhan/reminder_salawat_english.wav'),
};
