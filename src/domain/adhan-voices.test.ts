import assert from 'node:assert/strict';
import test from 'node:test';
import { ADHAN_VOICES, DEFAULT_PRAYER_SOUNDS, adhanSoundForPrayer, normalizePrayerSounds, prayerSoundChannelId } from './adhan-voices.ts';
import { NOTIFIABLE_PRAYERS, buildPrayerNotificationSchedule } from './prayer-notifications.ts';

test('legacy and malformed saved preferences retain the original Adhan on all prayers', () => {
  for (const saved of [undefined, null, false, 'invalid', {}, { fajr: { enabled: 'false', voiceId: 'missing' }, dhuhr: null }]) {
    assert.deepEqual(normalizePrayerSounds(saved), DEFAULT_PRAYER_SOUNDS);
  }
  const normalized = normalizePrayerSounds({ fajr: { enabled: false, voiceId: 'fajr-malmo' }, dhuhr: { enabled: true, voiceId: 'aaqib' }, sunrise: { enabled: false } });
  assert.deepEqual(normalized.fajr, { enabled: false, voiceId: 'fajr-malmo' });
  assert.deepEqual(normalized.dhuhr, { enabled: true, voiceId: 'aaqib' });
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
    fajr: { enabled: true, voiceId: 'fajr-malmo' },
    dhuhr: { enabled: false, voiceId: 'aaqib' },
    asr: { enabled: true, voiceId: 'andrewler' },
    maghrib: { enabled: true, voiceId: 'shalqar' },
    isha: { enabled: true, voiceId: 'makkah' },
  });
  const schedule = buildPrayerNotificationSchedule(new Date(2026, 9, 13), ([year, month, day]) => [5, 6, 12, 15, 18, 20].map(hour => new Date(year, month - 1, day, hour)), 8);
  assert.equal(schedule.length, 40);
  for (const item of schedule) {
    const sound = adhanSoundForPrayer(preferences, item.prayer, 'android');
    assert.equal(sound, ({ fajr: 'adhan_fajr_malmo.ogg', dhuhr: null, asr: 'adhan_andrewler.ogg', maghrib: 'adhan_shalqar.ogg', isha: 'adhan_makkah.ogg' })[item.prayer]);
  }
});

test('Fajr-specific wording is never selected for the other prayers, including old or malformed saved choices', () => {
  const preferences = normalizePrayerSounds(Object.fromEntries(NOTIFIABLE_PRAYERS.map(prayer => [prayer, { enabled: true, voiceId: 'fajr-malmo' }])));
  assert.equal(preferences.fajr.voiceId, 'fajr-malmo');
  for (const prayer of NOTIFIABLE_PRAYERS.filter(prayer => prayer !== 'fajr')) {
    assert.equal(preferences[prayer].voiceId, 'original');
    preferences[prayer].voiceId = 'fajr-malmo';
    assert.equal(adhanSoundForPrayer(preferences, prayer, 'android'), 'adhan.ogg');
    assert.equal(adhanSoundForPrayer(preferences, prayer, 'ios'), 'adhan_short.wav');
  }
});
