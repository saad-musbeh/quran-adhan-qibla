import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeAudioDownload } from './audio-downloads.ts';

test('storage counts only valid final ayah files and distinguishes partial downloads', () => {
  const files=[{name:'001001.mp3',size:20},{name:'001002.mp3',size:30},{name:'001003.mp3.part',size:99},{name:'002003.mp3',size:88},{name:'001004.mp3',size:0},{name:'001999.mp3',size:1}];
  assert.deepEqual(summarizeAudioDownload('alafasy',1,7,files),{reciter:'alafasy',surah:1,bytes:50,verses:2,total:7,complete:false});
  assert.equal(summarizeAudioDownload('husary',1,2,files).complete,true);
});
