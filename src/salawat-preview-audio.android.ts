import type { SalawatPhrase } from './domain/devotional-reminders';

// Metro chooses OGG on Android and WAV on iOS, matching notification packaging.
export const SALAWAT_PREVIEW_AUDIO: Record<SalawatPhrase, number> = {
  rasul: require('../assets/adhan/reminder_salawat_rasul.ogg'),
  sallallahu: require('../assets/adhan/reminder_salawat_sallallahu.ogg'),
  prophet: require('../assets/adhan/reminder_salawat_prophet.ogg'),
  muhammad: require('../assets/adhan/reminder_salawat_muhammad.ogg'),
  english: require('../assets/adhan/reminder_salawat_english.ogg'),
};
