import assert from 'node:assert/strict';
import test from 'node:test';
import { indexRangeTafsir, isValidRangeTafsirSurah, type RangeTafsirRecord } from './range-tafsir.ts';
const row=(id:number,from:number,to:number,type:string,text:string):RangeTafsirRecord=>({id,sura:1,from_aya:from,to_aya:to,type,text});
const rows=[row(1,0,0,'اسم السورة','Source title'),row(2,1,3,'المقطع','Source passage'),row(3,1,2,'تفسير آية','Shared commentary'),row(4,4,7,'المقطع','Next passage'),row(5,4,7,'تفسير آية','Next commentary'),row(6,0,0,'خاتمة السورة','Source conclusion')];
test('passage tafsir covers all verses without losing source paragraphs or inventing commentary',()=>{
  assert.equal(isValidRangeTafsirSurah(rows,1,7),true);
  const index=indexRangeTafsir([rows]);
  assert.equal(index.size,7);
  assert.equal(index.get('1:3')?.text,'Source title\n\nSource passage\n\nShared commentary');
  assert.equal(index.get('1:7')?.text,'Next passage\n\nNext commentary\n\nSource conclusion');
  assert.deepEqual(index.get('1:3')?.passage,{start:1,end:3});
});
test('incomplete, gapped, foreign-surah, and malformed tafsir passages are rejected',()=>{
  assert.equal(isValidRangeTafsirSurah(rows.slice(0,3),1,7),false);
  assert.equal(isValidRangeTafsirSurah(rows.map(r=>r.id===4?{...r,from_aya:5}:r),1,7),false);
  assert.equal(isValidRangeTafsirSurah(rows,2,7),false);
  assert.equal(isValidRangeTafsirSurah(rows.map(r=>r.id===3?{...r,text:''}:r),1,7),false);
});
test('overlapping source passages retain both commentaries at a shared ayah',()=>{
  const overlap=rows.map(r=>r.id===4?{...r,from_aya:3}:r);
  assert.equal(isValidRangeTafsirSurah(overlap,1,7),true);
  const index=indexRangeTafsir([overlap]);
  assert.equal(index.get('1:3')?.text,rows.slice(0,3).map(r=>r.text).join('\n\n')+'\n\n'+rows.slice(3).map(r=>r.text).join('\n\n'));
  assert.deepEqual(index.get('1:3')?.passage,{start:1,end:7});
});
