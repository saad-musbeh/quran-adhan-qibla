import assert from 'node:assert/strict';
import test from 'node:test';
import { ADHAN_VOICES, DEFAULT_PRAYER_SOUNDS, adhanSoundForPrayer, normalizePrayerSounds, prayerSoundChannelId } from './adhan-voices.ts';
import { NOTIFIABLE_PRAYERS, buildPrayerNotificationSchedule } from './prayer-notifications.ts';

test('legacy and malformed saved preferences use Makkah by default on all prayers', () => {
  for (const saved of [undefined, null, false, 'invalid', {}, { fajr: { enabled: 'false', voiceId: 'missing' }, dhuhr: null }]) {
    assert.deepEqual(normalizePrayerSounds(saved), DEFAULT_PRAYER_SOUNDS);
  }
  const normalized = normalizePrayerSounds({ fajr: { enabled: false, voiceId: 'madinah' }, dhuhr: { enabled: true, voiceId: 'original' }, sunrise: { enabled: false } });
  assert.deepEqual(normalized.fajr, { enabled: false, voiceId: 'madinah' });
  assert.deepEqual(normalized.dhuhr, { enabled: true, voiceId: 'original' });
  assert.deepEqual(normalized.isha, DEFAULT_PRAYER_SOUNDS.isha);
  assert.deepEqual(Object.keys(normalized), [...NOTIFIABLE_PRAYERS]);
});

test('normalizing separate preference objects does not share mutable prayer choices', () => {
  const first = normalizePrayerSounds(undefined);
  const second = normalizePrayerSounds(undefined);
  first.fajr.enabled = false;
  assert.equal(second.fajr.enabled, true);
  assert.equal(DEFAULT_PRAYER_SOUNDS.fajr.enabled, true);
});

test('each voice resolves to its full Android recording and short iOS excerpt', () => {
  for (const voice of ADHAN_VOICES) {
    const settings = normalizePrayerSounds({ fajr: { enabled: true, voiceId: voice.id } });
    assert.equal(adhanSoundForPrayer(settings, 'fajr', 'android'), voice.androidSound);
    assert.equal(adhanSoundForPrayer(settings, 'fajr', 'ios'), voice.iosSound);
    settings.fajr.enabled = false;
    assert.equal(adhanSoundForPrayer(settings, 'fajr', 'android'), null);
    assert.equal(adhanSoundForPrayer(settings, 'fajr', 'ios'), null);
  }
});

test('changing a voice or muting a prayer selects distinct immutable Android channels', () => {
  const channels = ADHAN_VOICES.map(voice => prayerSoundChannelId(voice.androidSound));
  channels.push(prayerSoundChannelId(null));
  assert.equal(new Set(channels).size, ADHAN_VOICES.length + 1);
  assert.equal(prayerSoundChannelId('adhan.ogg'), 'prayer-v1-adhan_ogg'); // Retain the existing user-customized channel.
});

test('the weekly schedule keeps muted reminders and applies each prayer sound independently', () => {
  const preferences = normalizePrayerSounds({
    fajr: { enabled: true, voiceId: 'madinah' },
    dhuhr: { enabled: false, voiceId: 'original' },
    asr: { enabled: true, voiceId: 'andrewler' },
    maghrib: { enabled: true, voiceId: 'makkah' },
    isha: { enabled: true, voiceId: 'makkah' },
  });
  const schedule = buildPrayerNotificationSchedule(new Date(2026, 9, 13), ([year, month, day]) => [5, 6, 12, 15, 18, 20].map(hour => new Date(year, month - 1, day, hour)), 8);
  assert.equal(schedule.length, 40);
  for (const item of schedule) {
    const sound = adhanSoundForPrayer(preferences, item.prayer, 'android');
    assert.equal(sound, ({ fajr: 'adhan_madinah_clean.ogg', dhuhr: null, asr: 'adhan_andrewler_clean.ogg', maghrib: 'adhan_makkah_clean.ogg', isha: 'adhan_makkah_clean.ogg' })[item.prayer]);
  }
});

test('removed voices migrate to Makkah while retained choices and mute settings survive upgrades', () => {
  for (const removed of ['aaqib','shalqar','fajr-malmo']) {
    const settings = normalizePrayerSounds(Object.fromEntries(NOTIFIABLE_PRAYERS.map(prayer => [prayer, { enabled: false, voiceId: removed }])));
    for (const prayer of NOTIFIABLE_PRAYERS) assert.deepEqual(settings[prayer], { enabled:false, voiceId:'makkah' });
  }
  for (const retained of ['original','andrewler','makkah','madinah']) {
    const settings = normalizePrayerSounds(Object.fromEntries(NOTIFIABLE_PRAYERS.map(prayer => [prayer, { enabled:true, voiceId:retained }])));
    for (const prayer of NOTIFIABLE_PRAYERS) assert.equal(settings[prayer].voiceId, retained);
  }
  assert.deepEqual(ADHAN_VOICES.map(voice => voice.id), ['makkah','madinah','andrewler','original']);
  for (const voice of ADHAN_VOICES) {
    assert.notEqual(prayerSoundChannelId(voice.androidSound), prayerSoundChannelId(voice.androidSound.replace('_clean','')));
  }
});
