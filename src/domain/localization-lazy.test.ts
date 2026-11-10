import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
const original=createRequire(new URL('../localization.native.ts',import.meta.url)),reads:string[]=[];
(globalThis as unknown as {require:(path:string)=>unknown}).require=path=>{reads.push(path);return original(path);};
const {message,bilingual}=await import('../localization.native.ts');
test('native startup loads no testing language; choosing one loads only that catalogue',()=>{
  assert.deepEqual(reads,['./locales/en.json']);
  assert.equal(bilingual('ar','إعادة المحاولة','Retry'),'إعادة المحاولة');
  assert.notEqual(message('fr','My Quran library'),'My Quran library');
  assert.ok(reads.includes('./locales/fr.json'));
  assert.ok(!reads.includes('./locales/de.json'));
  assert.ok(!reads.includes('./locales/ur.json'));
});
