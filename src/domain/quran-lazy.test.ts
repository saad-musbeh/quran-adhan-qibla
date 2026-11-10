import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
const original=createRequire(import.meta.url),reads:string[]=[];
(globalThis as unknown as {require:(path:string)=>unknown}).require=path=>{reads.push(path);return original(path);};
const {getSurah,getVerse}=await import('./quran.ts');
test('prayer and audio settings need only surah metadata; text loads once for actual reading',()=>{
  assert.equal(getSurah(1)?.verseCount,7);
  assert.ok(!reads.includes('../data/quran.json'));
  assert.equal(getVerse(1,1)?.globalNumber,1);
  assert.equal(getVerse(114,6)?.globalNumber,6236);
  assert.equal(reads.filter(path=>path==='../data/quran.json').length,1);
});
