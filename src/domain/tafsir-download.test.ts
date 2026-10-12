import assert from 'node:assert/strict';
import test from 'node:test';
import { downloadSurahsConcurrently, indexTafsirRecords, isValidSurahResult, isValidTafsirEnvelope, verifyQuranEncRelease } from './tafsir-download.ts';

const record=(sura:number,aya:number)=>({sura,aya,arabic_text:`ع${sura}:${aya}`,translation:`t${sura}:${aya}`,footnotes:null});

test('validates complete surahs in exact order and preserves source record strings',()=>{
  const rows=[record(2,1),record(2,2)];
  assert.equal(isValidSurahResult(rows,2,2),true);
  assert.equal(isValidSurahResult([rows[1],rows[0]],2,2),false);
  assert.equal(isValidSurahResult([rows[0]],2,2),false);
  assert.equal(isValidSurahResult([{...rows[0],translation:''},rows[1]],2,2),false);
  assert.deepEqual(indexTafsirRecords(rows).get('2:1'),{text:'t2:1',footnotes:null});
});

test('rejects mismatched edition metadata and incomplete whole-book records',()=>{
  const book={id:'edition',title:'Title',publisher:'Publisher',version:'1',url:'https://example.test'};
  const envelope={schema:1 as const,book,records:[record(1,1),record(2,1)]};
  assert.equal(isValidTafsirEnvelope(envelope,book,[1,1]),true);
  assert.equal(isValidTafsirEnvelope({...envelope,book:{...book,version:'2'}},book,[1,1]),false);
  assert.equal(isValidTafsirEnvelope({...envelope,records:[record(1,1)]},book,[1,1]),false);
  assert.equal(isValidTafsirEnvelope({...envelope,records:[record(2,1),record(1,1)]},book,[1,1]),false);
});

test('pins a book release to its official QuranEnc card version and date',()=>{
  const book={apiKey:'arabic_moyassar',title:'التفسير الميسر',version:'V1.0.0 (2017-02-15)'};
  const card='<div class="tab_card d-flex"><div>15/02/2017 - V1.0.0</div><a href="https://quranenc.com/ar/browse/arabic_moyassar">Browse</a></div>';
  assert.doesNotThrow(()=>verifyQuranEncRelease(book,card));
  assert.throws(()=>verifyQuranEncRelease(book,card.replace('V1.0.0','V1.0.1')),/newer release/);
  assert.throws(()=>verifyQuranEncRelease(book,card.replace('2017','2018')),/newer release/);
  assert.throws(()=>verifyQuranEncRelease(book,'<html/>'),/Could not find/);
});

test('downloads surahs in order while never exceeding the configured concurrency',async()=>{
  const controller=new AbortController();let active=0,maxActive=0;
  const result=await downloadSurahsConcurrently(9,3,controller.signal,async n=>{
    active+=1;maxActive=Math.max(maxActive,active);
    await new Promise(resolve=>setTimeout(resolve,(4-n%3)*2));active-=1;return n;
  });
  assert.equal(maxActive,3);
  assert.deepEqual(result,[1,2,3,4,5,6,7,8,9]);
});

test('cancellation aborts active requests and prevents workers from starting later surahs',async()=>{
  const controller=new AbortController();const started:number[]=[];
  const pending=downloadSurahsConcurrently(10,3,controller.signal,(n,signal)=>{
    started.push(n);return new Promise<number>((_resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})),{once:true}));
  });
  await new Promise(resolve=>setTimeout(resolve,0));controller.abort();
  await assert.rejects(pending,/aborted/);
  assert.deepEqual(started,[1,2,3]);
});

test('a worker failure aborts sibling requests and waits for their cleanup',async()=>{
  const controller=new AbortController();let active=0,cleaned=0;
  const pending=downloadSurahsConcurrently(12,3,controller.signal,(n,signal)=>new Promise<number>((resolve,reject)=>{
    active+=1;
    if(n===1){setTimeout(()=>{active-=1;reject(new Error('source failed'))},0);return}
    signal.addEventListener('abort',()=>{active-=1;cleaned+=1;reject(Object.assign(new Error('aborted'),{name:'AbortError'}))},{once:true});
    setTimeout(()=>{if(!signal.aborted){active-=1;resolve(n)}},100);
  }));
  await assert.rejects(pending,/source failed/);
  assert.equal(active,0);
  assert.equal(cleaned,2);
});
