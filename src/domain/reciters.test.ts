import assert from 'node:assert/strict';
import test from 'node:test';
import { RECITERS, DEFAULT_RECITER_ID, emptyReciterDownloads } from '../data/reciters.ts';

test('twenty distinct voices have Arabic names and Saad Al-Ghamdi is the default', () => {
  assert.equal(RECITERS.length,20);
  assert.equal(new Set(RECITERS.map(item=>item.id)).size,20);
  assert.equal(new Set(RECITERS.map(item=>item.directory)).size,20);
  assert.equal(DEFAULT_RECITER_ID,'ghamdi');
  assert.equal(RECITERS[0].id,DEFAULT_RECITER_ID);
  assert.equal(RECITERS.find(item=>item.id===DEFAULT_RECITER_ID)?.arabicName,'سعد الغامدي');
  for(const voice of RECITERS)assert.ok(voice.name.trim()&&voice.arabicName.trim()&&voice.directory.trim());
  const downloads=emptyReciterDownloads();
  downloads.ghamdi.push(1);
  for(const voice of RECITERS)if(voice.id!=='ghamdi')assert.deepEqual(downloads[voice.id],[]);
});
