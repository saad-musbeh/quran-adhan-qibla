import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
globalThis.require=createRequire(import.meta.url);
const {createQuranBooks,readQuranBooks}=await import('./quran-books.ts');

test('six reading copies start at Al-Fatiha and restore separate positions and bookmarks', () => {
  const books=createQuranBooks();
  assert.equal(books.length,6);
  assert.ok(books.every(book=>book.page===1));
  books[0].page=582;books[0].name='جزء عم';books[0].bookmarks.push(582);
  books[1].page=201;books[2].page=442;books[3].page=293;
  books[3].verseBookmarks.push('18:1');
  const saved=readQuranBooks(JSON.stringify(books));
  assert.deepEqual(saved,books);
  assert.deepEqual(saved.map(b=>b.page),[582,201,442,293,1,1]);
  assert.deepEqual(saved[1].bookmarks,[]);
  assert.deepEqual(saved[4].verseBookmarks,[]);
});

test('corrupt or incomplete saved books cannot create invalid Quran positions', () => {
  const books=readQuranBooks(JSON.stringify([{id:'book-1',page:605,name:'  Friday  ',bookmarks:[293,293,-1,'2'],verseBookmarks:['18:1','999:1']},{id:'book-2',page:0},{id:'foreign',page:42}]));
  assert.equal(books.length,6);assert.equal(books[0].name,'Friday');
  assert.equal(books[0].page,1);assert.deepEqual(books[0].bookmarks,[293]);
  assert.deepEqual(books[0].verseBookmarks,['18:1']);
  assert.deepEqual(readQuranBooks('{invalid'),createQuranBooks());
});
