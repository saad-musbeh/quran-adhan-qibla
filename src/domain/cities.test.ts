import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import type {City,CityDatabase,PrayerLocation} from './cities.ts';
import type {Language} from './languages.ts';
(globalThis as typeof globalThis & {require:NodeRequire}).require=createRequire(import.meta.url);
const {CityCatalogue,countries,cityLabel,countryLabel,formatLocationLabel}=await import('./cities.ts');
const chunks=JSON.parse(readFileSync(new URL('../data/cities.json',import.meta.url),'utf8')) as City[][];
const cities=chunks.flat();
const db=new DatabaseSync(new URL('../../assets/cities/cities-fe00172d5ed0.db',import.meta.url),{readOnly:true});
const adapter:CityDatabase={
  async getAllAsync<T>(sql:string,...params:(string|number)[]){return db.prepare(sql).all(...params) as T[];},
  async getFirstAsync<T>(sql:string,...params:(string|number)[]){return (db.prepare(sql).get(...params)??null) as T|null;},
};
const catalogue=new CityCatalogue(adapter);
const search=async(query:string,country?:string)=>(await catalogue.search(query,country,300000)).cities;
const label=async(location:PrayerLocation,language:Language)=>formatLocationLabel(location,language,await catalogue.cityFor(location));

test('database preserves the complete pinned source, every city field and source order',()=>{
  assert.equal(cities.length,224763);
  assert.equal(createHash('sha256').update(JSON.stringify(cities)).digest('hex'),'fe00172d5ed0f3638a1a1e52aa4ec41ceb2fc6edf8ce89e8db8b0534138c3859');
  assert.equal(createHash('sha256').update(cities.map(c=>c.id).join(',')).digest('hex'),'082d82cce6322a3cc4a8c1da2cbd036690c55b09debd0b2ee8184d9e74eccb60');
  const actual=db.prepare('SELECT id,name,arabicName,asciiName,countryCode,latitude,longitude,timeZone FROM cities ORDER BY ordinal').all();
  assert.deepEqual(actual.map(row=>Object.fromEntries(Object.entries(row).filter(([,v])=>v!==null))),cities);
  assert.equal(db.prepare('PRAGMA integrity_check').get()?.integrity_check,'ok');
});
test('catalogue validates coordinates, uniqueness, country counts and small territories',async()=>{
  assert.equal(new Set(cities.map(c=>c.id)).size,cities.length);
  assert.ok(countries.length>200);
  for(const city of cities){assert.ok(city.name&&city.countryCode.length===2);assert.ok(Math.abs(city.latitude)<=90&&Math.abs(city.longitude)<=180);}
  for(const country of countries){const result=await catalogue.search('',country.code,8);assert.equal(result.total,country.cityCount);assert.equal(result.cities.length,Math.min(8,country.cityCount));}
  assert.ok(countries.some(c=>c.code==='FO'));
  assert.ok((await search('Woking','GB')).some(c=>c.name==='Woking'));
  assert.ok((await search('Novi','US')).some(c=>c.name==='Novi'));
});
test('search preserves Arabic aliases, transliterations, accent handling and empty filters',async()=>{
  assert.ok((await search('CAIRO','eg')).some(c=>c.name==='Cairo'));
  assert.ok((await search('sao paulo','BR')).some(c=>c.name==='São Paulo'));
  const arabic=cities.find(c=>c.arabicName)!;
  assert.ok((await search(arabic.arabicName!)).some(c=>c.id===arabic.id));
  const transliterated=cities.find(c=>c.asciiName&&!/^[\x00-\x7F]+$/.test(c.name))!;
  assert.ok((await search(transliterated.asciiName!,transliterated.countryCode)).some(c=>c.id===transliterated.id));
  assert.deepEqual(await search('   '),[]);assert.deepEqual(await search('London','ZZ'),[]);
  assert.deepEqual(await search("' OR 1=1 --",'SA'),[],'query text stays a bound parameter');
});
test('bounded result pages expose every match and keep exact, prefix, substring ranking',async()=>{
  const first=await catalogue.search('a','US',8),more=await catalogue.search('a','US',56);
  assert.ok(first.total>1000);assert.equal(first.cities.length,8);assert.equal(more.cities.length,56);
  assert.equal(first.total,more.total);assert.deepEqual(first.cities,more.cities.slice(0,8));
  const york=await search('york','US');
  const exact=york.findIndex(c=>c.name.toLowerCase()==='york');
  const prefix=york.findIndex(c=>c.name.toLowerCase().startsWith('york')&&c.name.toLowerCase()!=='york');
  const partial=york.findIndex(c=>c.name.toLowerCase().includes('york')&&!c.name.toLowerCase().startsWith('york'));
  assert.ok(exact>=0&&prefix>exact&&partial>prefix);
});
test('saved cities and approximate nearby places retain Arabic and English labels',async()=>{
  for(const [name,code] of [['Riyadh','SA'],['London','GB'],['Dakar','SN']]){
    const city=cities.find(c=>c.name===name&&c.countryCode===code)!,country=countries.find(c=>c.code===code)!;
    assert.equal(cityLabel(city,'en'),city.name);assert.equal(countryLabel(country,'en'),country.name);
    assert.equal(countryLabel(country,'ar'),country.arabicName);
    assert.equal(await label({...city,source:'city',label:'Old label'},'en'),`${country.name} · ${name}`);
    assert.equal(await label({...city,source:'city',label:'Old label'},'ar'),`${country.arabicName} · ${cityLabel(city,'ar')}`);
    for(const source of ['device','map','manual']){
      assert.equal(await label({...city,source,label:undefined},'en'),`Near ${country.name} · ${name}`);
      assert.equal(await label({...city,source,label:undefined},'ar'),`بالقرب من ${country.arabicName} · ${cityLabel(city,'ar')}`);
    }
  }
});
test('distant, invalid and explicitly named locations never invent nearby cities',async()=>{
  const ocean={latitude:0,longitude:-140,source:'manual'};
  assert.equal(await label(ocean,'en'),'Manual coordinates · 0.0000, -140.0000');
  const arabic=await label(ocean,'ar');assert.ok(arabic.startsWith('إحداثيات يدوية · '));assert.ok(arabic.includes('١٤٠')&&!/[0-9]/.test(arabic));
  assert.equal(await label({...ocean,source:'device'},'en'),'Device location · 0.0000, -140.0000');
  assert.equal(await label({...ocean,source:'map'},'en'),'Map point · 0.0000, -140.0000');
  assert.equal(await label({...ocean,label:'  My campsite  '},'ar'),'My campsite');
  assert.equal(await label({...ocean,source:'city',label:'Saved custom town'},'en'),'Saved custom town');
  assert.equal(await label({latitude:NaN,longitude:0,source:'device'},'en'),'Device location');
});
test('nearby lookup wraps the date line, handles poles, and preserves the 50 km boundary',async()=>{
  const city=cities.find(c=>c.id===4031742)!,country=countries.find(c=>c.code===city.countryCode)!;
  assert.equal(await label({latitude:city.latitude,longitude:179.95,source:'device'},'en'),`Near ${country.name} · Egvekinot`);
  assert.equal(await label({latitude:city.latitude,longitude:180,source:'device'},'en'),await label({latitude:city.latitude,longitude:-180,source:'device'},'en'));
  for(const latitude of [-90,-89.9,89.9,90])assert.ok((await label({latitude,longitude:179.95,source:'device'},'en')).startsWith('Device location · '));
  const svalbard=cities.find(c=>c.id===2729907)!;
  assert.ok((await label({latitude:svalbard.latitude,longitude:svalbard.longitude+1,source:'map'},'en')).includes('Longyearbyen'));
  const at=(km:number)=>({latitude:city.latitude+km/6371.0088*180/Math.PI,longitude:city.longitude,source:'device'});
  assert.ok((await label(at(49.99),'en')).endsWith('Egvekinot'));
  assert.ok((await label(at(50.01),'en')).startsWith('Device location · '));
});
