import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('bundled iOS notification excerpt is PCM WAV shorter than 30 seconds', () => {
  const wav=readFileSync(new URL('../../assets/adhan/adhan_short.wav',import.meta.url));
  assert.equal(wav.toString('ascii',0,4),'RIFF');
  assert.equal(wav.toString('ascii',8,12),'WAVE');
  let byteRate=0, dataBytes=0;
  for(let offset=12;offset+8<=wav.length;) {
    const size=wav.readUInt32LE(offset+4), id=wav.toString('ascii',offset,offset+4);
    assert.ok(offset+8+size<=wav.length,'WAV chunk must be complete');
    if(id==='fmt ') { assert.equal(wav.readUInt16LE(offset+8),1); byteRate=wav.readUInt32LE(offset+16); }
    if(id==='data')dataBytes=size;
    offset+=8+size+(size%2);
  }
  assert.ok(byteRate>0&&dataBytes>0);
  assert.equal(dataBytes/byteRate,29);
  assert.ok(dataBytes/byteRate<30);
  const config=JSON.parse(readFileSync(new URL('../../app.json',import.meta.url),'utf8'));
  const notification=config.expo.plugins.find((entry:unknown)=>Array.isArray(entry)&&entry[0]==='expo-notifications');
  assert.ok(notification[1].sounds.includes('./assets/adhan/adhan_short.wav'));
  for(const file of notification[1].sounds)assert.match(file.split('/').at(-1).split('.')[0],/^[a-z][a-z0-9_]*$/,'shared sound filenames must also be valid Android resources');
});
