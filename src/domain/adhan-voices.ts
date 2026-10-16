import { NOTIFIABLE_PRAYERS, type NotifiablePrayer } from './prayer-notifications.ts';

/** These are separate source recordings. Recorder credits are not muezzin identities. */
export const ADHAN_VOICES = [
  { id: 'short', name: 'Short Adhan', nameAr: 'أذان قصير', androidSound: 'adhan_brief.ogg', iosSound: 'adhan_brief.wav', fajrAndroidSound: 'adhan_brief_fajr.ogg', fajrIosSound: 'adhan_brief_fajr.wav', author: 'Atcovi / Aaqib Azeez; Fajr phrase: Islamic Center Malmö / Besim Azemi', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Eid_al-Fitr_Fajr_azan_at_Malm%C3%B6_Mosque_-_19_August_2012.webm', fajr: false },
  { id: 'makkah', name: 'Makkah', nameAr: 'مكة المكرمة', androidSound: 'adhan_makkah_clean.ogg', iosSound: 'adhan_makkah_clean_short.wav', author: 'Seyfula Islam', license: 'CC BY 3.0', source: 'https://commons.wikimedia.org/wiki/File:Adhan,_Great_Mosque_of_Mecca_-_Jan_21,_2013.webm', fajr: false },
  { id: 'madinah', name: 'Al-Madinah', nameAr: 'المدينة المنورة', androidSound: 'adhan_madinah_clean.ogg', iosSound: 'adhan_madinah_clean_short.wav', author: 'ejaz215', license: 'CC BY 3.0', source: 'https://commons.wikimedia.org/wiki/File:33937_ejaz215_call-to-prayer-from-the-prophet-s-mo.ogg', fajr: false },
  { id: 'andrewler', name: 'Adhan · Andrewler recording', nameAr: 'أذان · تسجيل Andrewler', androidSound: 'adhan_andrewler_clean.ogg', iosSound: 'adhan_andrewler_clean_short.wav', author: 'Andrewler', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Azan.ogg', fajr: false },
  { id: 'original', name: 'Original Adhan', nameAr: 'الأذان الأصلي', androidSound: 'adhan_clean.ogg', iosSound: 'adhan_clean_short.wav', author: 'Adam-synagda', license: 'CC0 1.0', source: 'https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg', fajr: false },
] as const;

export type AdhanVoiceId = typeof ADHAN_VOICES[number]['id'];
export type PrayerSoundChoice = { enabled: boolean; voiceId: AdhanVoiceId };
export type PrayerSoundSettings = Record<NotifiablePrayer, PrayerSoundChoice>;
export const DEFAULT_PRAYER_SOUNDS: PrayerSoundSettings = {
  fajr: { enabled: true, voiceId: 'short' },
  dhuhr: { enabled: true, voiceId: 'short' },
  asr: { enabled: true, voiceId: 'short' },
  maghrib: { enabled: true, voiceId: 'short' },
  isha: { enabled: true, voiceId: 'short' },
};

export function isAdhanVoiceId(value: unknown): value is AdhanVoiceId {
  return ADHAN_VOICES.some(voice => voice.id === value);
}

/** Saved voice IDs are retained; absent or invalid voices use the short default. */
export function normalizePrayerSounds(value: unknown): PrayerSoundSettings {
  const saved = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(NOTIFIABLE_PRAYERS.map(prayer => {
    const raw = saved[prayer];
    const choice = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    return [prayer, {
      enabled: typeof choice.enabled === 'boolean' ? choice.enabled : true,
      voiceId: isAdhanVoiceId(choice.voiceId)
        ? choice.voiceId : DEFAULT_PRAYER_SOUNDS[prayer].voiceId,
    }];
  })) as PrayerSoundSettings;
}

/** A muted prayer still has its scheduled visual notification. */
export function adhanSoundForPrayer(settings: PrayerSoundSettings, prayer: NotifiablePrayer, platform: string): string | null {
  const choice = settings[prayer];
  if (!choice.enabled) return null;
  const voice = ADHAN_VOICES.find(item => item.id === choice.voiceId) ?? ADHAN_VOICES[0];
  if(prayer==='fajr'&&'fajrAndroidSound'in voice)return platform==='ios'?voice.fajrIosSound:voice.fajrAndroidSound;
  return platform === 'ios' ? voice.iosSound : voice.androidSound;
}

export function adhanSoundFiles(): string[] {
  return ADHAN_VOICES.flatMap(voice=>[voice.androidSound,voice.iosSound,...('fajrAndroidSound'in voice?[voice.fajrAndroidSound,voice.fajrIosSound]:[])]);
}

/** Android channel sounds are immutable, so different files need different channel IDs. */
export function prayerSoundChannelId(sound: string | null): string {
  return 'prayer-v1-' + (sound ? sound.replace(/[^a-zA-Z0-9_-]/g, '_') : 'silent');
}
