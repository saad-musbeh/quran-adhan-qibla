import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { adhanSoundFiles } from './adhan-voices.ts';
import { DEVOTIONAL_SOUNDS, SALAWAT_PHRASES } from './devotional-reminders.ts';

test('native notification sounds match their manifests, include Fajr, and obey iOS format limits', () => {
  const config = JSON.parse(readFileSync(new URL('../../app.json', import.meta.url), 'utf8'));
  const sounds = config.expo.plugins.find((plugin: unknown) => Array.isArray(plugin) && plugin[0] === './plugins/withPlatformNotificationSounds.cjs')[1].sounds;
  const expected = [...new Set([...adhanSoundFiles(),...Object.values(DEVOTIONAL_SOUNDS).flatMap(sound=>[sound.android,sound.ios]),...SALAWAT_PHRASES.flatMap(phrase=>[phrase.android,phrase.ios])])].sort();
  assert.deepEqual(sounds.map((path: string) => path.split('/').at(-1)).sort(), expected);
  const manifest = JSON.parse(readFileSync(new URL('../../assets/adhan/clean-audio-manifest.json', import.meta.url), 'utf8'));
  const devotional=JSON.parse(readFileSync(new URL('../../assets/adhan/devotional-audio-manifest.json', import.meta.url),'utf8'));
  const phrases=JSON.parse(readFileSync(new URL('../../assets/adhan/salawat-phrases-manifest.json', import.meta.url),'utf8'));
  const files = [...manifest.recordings.flatMap((recording: { files: { file: string; sha256: string }[] }) => recording.files),...devotional.files,...phrases.files];
  assert.deepEqual(files.map((file: { file: string }) => file.file).sort(), expected);
  for (const file of files) {
    const bytes = readFileSync(new URL(`../../assets/adhan/${file.file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.file);
    if (file.file.endsWith('.ogg')) { assert.equal(bytes.toString('ascii', 0, 4), 'OggS'); continue; }
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
    let byteRate = 0, dataSize = 0;
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const size = bytes.readUInt32LE(offset + 4), kind = bytes.toString('ascii', offset, offset + 4);
      if (kind === 'fmt ') {
        assert.equal(bytes.readUInt16LE(offset + 8), 1); // PCM
        assert.equal(bytes.readUInt16LE(offset + 10), 1); // Mono
        assert.equal(bytes.readUInt32LE(offset + 12), file.file.startsWith('reminder_salawat') ? 44100 : 22050);
        assert.equal(bytes.readUInt16LE(offset + 22), 16);
        byteRate = bytes.readUInt32LE(offset + 16);
      }
      if (kind === 'data') dataSize = size;
      offset += 8 + size + size % 2;
    }
    assert.ok(dataSize / byteRate > 0 && dataSize / byteRate < 30, `${file.file}: custom iOS sound must remain below 30 seconds`);
    if(file.file.includes('_clean_short'))assert.equal(dataSize/byteRate,29);
  }
});
