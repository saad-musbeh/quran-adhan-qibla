import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

globalThis.require = createRequire(import.meta.url);
const { readVerseBookmarks } = await import('./quran-bookmarks.ts');

test('saved verse bookmarks retain valid canonical references and remove duplicates', () => {
  assert.deepEqual(readVerseBookmarks('["1:1","114:6","1:1","2:286"]'), ['1:1', '114:6', '2:286']);
});

test('corrupt storage and nonexistent verses cannot enter the bookmark list', () => {
  for (const raw of [null, 'broken', '{}', '"1:1"']) assert.deepEqual(readVerseBookmarks(raw), []);
  assert.deepEqual(readVerseBookmarks('["0:1","115:1","114:7","2:287","01:1",{},1,null,"1:1"]'), ['1:1']);
});
