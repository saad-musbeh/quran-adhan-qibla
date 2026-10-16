import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
(globalThis as typeof globalThis & {require:NodeRequire}).require=createRequire(import.meta.url);
const {adhkar,collectionComplete,incrementDhikr}=await import('./adhkar.ts');

test('offline collections match the pinned source manifest with complete Arabic and references',()=>{
  const bytes=readFileSync(new URL('../data/adhkar.json',import.meta.url));
  const manifest=JSON.parse(readFileSync(new URL('../data/adhkar-manifest.json',import.meta.url),'utf8'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.outputSha256);
  assert.deepEqual(Object.fromEntries(Object.entries(adhkar).map(([id,entries])=>[id,entries.length])),manifest.counts);
  const ids=new Set();
  for(const entries of Object.values(adhkar))for(const entry of entries){
    assert.ok(/\p{Script=Arabic}/u.test(entry.text));assert.ok(entry.reference.trim());assert.ok(Number.isInteger(entry.count)&&entry.count>0);
    assert.equal(ids.has(entry.id),false);ids.add(entry.id);
  }
});

test('session counters cannot exceed a sourced target and completion requires every entry',()=>{
  const entries=adhkar.morning;
  let counts:Record<string,number>={};
  assert.equal(collectionComplete(entries,counts),false);
  for(const entry of entries){for(let n=0;n<entry.count+2;n++)counts=incrementDhikr(counts,entry);assert.equal(counts[entry.id],entry.count);}
  assert.equal(collectionComplete(entries,counts),true);
  assert.equal(collectionComplete(entries,{}),false);
  assert.equal(collectionComplete([],{}),false);
});
