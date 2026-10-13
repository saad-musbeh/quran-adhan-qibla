import { NOTIFIABLE_PRAYERS, type NotifiablePrayer } from './prayer-notifications.ts';

/** These are separate source recordings. Recorder credits are not muezzin identities. */
export const ADHAN_VOICES = [
  { id: 'original', name: 'Original Adhan', nameAr: 'الأذان الأصلي', androidSound: 'adhan.ogg', iosSound: 'adhan_short.wav', author: 'Adam-synagda', license: 'CC0 1.0', source: 'https://commons.wikimedia.org/wiki/File:Beautiful_adhan.ogg', fajr: false },
  { id: 'aaqib', name: 'Aaqib Azeez', nameAr: 'عاقب عزيز', androidSound: 'adhan_aaqib.ogg', iosSound: 'adhan_aaqib_short.wav', author: 'Atcovi', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:The_Adhan_-_Muslim_Call_to_Prayer_-_Aaqib_Azeez.mp3', fajr: false },
  { id: 'andrewler', name: 'Adhan · Andrewler recording', nameAr: 'أذان · تسجيل Andrewler', androidSound: 'adhan_andrewler.ogg', iosSound: 'adhan_andrewler_short.wav', author: 'Andrewler', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Azan.ogg', fajr: false },
  { id: 'shalqar', name: 'Shalqar Mosque', nameAr: 'مسجد شالقار', androidSound: 'adhan_shalqar.ogg', iosSound: 'adhan_shalqar_short.wav', author: 'Esetok', license: 'CC BY-SA 4.0', source: 'https://commons.wikimedia.org/wiki/File:Adhan_in_Shalqar_mosque.webm', fajr: false },
  { id: 'makkah', name: 'Makkah · 2013', nameAr: 'مكة · ٢٠١٣', androidSound: 'adhan_makkah.ogg', iosSound: 'adhan_makkah_short.wav', author: 'Seyfula Islam', license: 'CC BY 3.0', source: 'https://commons.wikimedia.org/wiki/File:Adhan,_Great_Mosque_of_Mecca_-_Jan_21,_2013.webm', fajr: false },
  { id: 'fajr-malmo', name: 'Besim Azemi · Strong Fajr', nameAr: 'بسيم أزيمي · فجر قوي', androidSound: 'adhan_fajr_malmo.ogg', iosSound: 'adhan_fajr_malmo_short.wav', author: 'Islamic Center Malmö', license: 'CC BY 3.0', source: 'https://commons.wikimedia.org/wiki/File:Eid_al-Fitr_Fajr_azan_at_Malm%C3%B6_Mosque_-_19_August_2012.webm', fajr: true },
] as const;

export type AdhanVoiceId = typeof ADHAN_VOICES[number]['id'];
export type PrayerSoundChoice = { enabled: boolean; voiceId: AdhanVoiceId };
export type PrayerSoundSettings = Record<NotifiablePrayer, PrayerSoundChoice>;
export const DEFAULT_PRAYER_SOUNDS: PrayerSoundSettings = {
  fajr: { enabled: true, voiceId: 'original' },
  dhuhr: { enabled: true, voiceId: 'original' },
  asr: { enabled: true, voiceId: 'original' },
  maghrib: { enabled: true, voiceId: 'original' },
  isha: { enabled: true, voiceId: 'original' },
};

export function isAdhanVoiceId(value: unknown): value is AdhanVoiceId {
  return ADHAN_VOICES.some(voice => voice.id === value);
}

/** Legacy preferences keep the original sound; Fajr recordings with special wording stay Fajr-only. */
export function normalizePrayerSounds(value: unknown): PrayerSoundSettings {
  const saved = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(NOTIFIABLE_PRAYERS.map(prayer => {
    const raw = saved[prayer];
    const choice = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    return [prayer, {
      enabled: typeof choice.enabled === 'boolean' ? choice.enabled : true,
      voiceId: isAdhanVoiceId(choice.voiceId) && (prayer === 'fajr' || !ADHAN_VOICES.find(voice => voice.id === choice.voiceId)?.fajr)
        ? choice.voiceId : 'original',
    }];
  })) as PrayerSoundSettings;
}

/** A muted prayer still has its scheduled visual notification. */
export function adhanSoundForPrayer(settings: PrayerSoundSettings, prayer: NotifiablePrayer, platform: string): string | null {
  const choice = settings[prayer];
  if (!choice.enabled) return null;
  const voice = ADHAN_VOICES.find(item => item.id === choice.voiceId && (prayer === 'fajr' || !item.fajr)) ?? ADHAN_VOICES[0];
  return platform === 'ios' ? voice.iosSound : voice.androidSound;
}

/** Android channel sounds are immutable, so different files need different channel IDs. */
export function prayerSoundChannelId(sound: string | null): string {
  return 'prayer-v1-' + (sound ? sound.replace(/[^a-zA-Z0-9_-]/g, '_') : 'silent');
}
