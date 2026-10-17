import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeAudioDownload } from './audio-downloads.ts';

test('storage counts only valid final ayah files and distinguishes partial downloads', () => {
  const files=[{name:'001001.mp3',size:20},{name:'001002.mp3',size:30},{name:'001003.mp3.part',size:99},{name:'002003.mp3',size:88},{name:'001004.mp3',size:0},{name:'001999.mp3',size:1}];
  assert.deepEqual(summarizeAudioDownload('alafasy',1,7,files),{reciter:'alafasy',surah:1,bytes:50,verses:2,total:7,complete:false});
  assert.equal(summarizeAudioDownload('husary',1,2,files).complete,false);
  assert.deepEqual(summarizeAudioDownload('husary',1,2,[...files,{name:'surah.mp3',size:100}]),{
    reciter:'husary',surah:1,bytes:150,verses:2,total:2,complete:true,
  });
});

test('a full-surah file is counted without pretending its individual ayahs were downloaded', () => {
  assert.deepEqual(summarizeAudioDownload('ghamdi',112,4,[{name:'surah.mp3',size:500}]),{
    reciter:'ghamdi',surah:112,bytes:500,verses:0,total:4,complete:false,
  });
  for (const size of [0, -1, NaN, Infinity]) {
    assert.equal(summarizeAudioDownload('ghamdi',112,4,[{name:'surah.mp3',size}]).bytes,0);
  }
  assert.equal(summarizeAudioDownload('ghamdi',112,4,[{name:'surah.mp3.1.part',size:500}]).bytes,0);
});
