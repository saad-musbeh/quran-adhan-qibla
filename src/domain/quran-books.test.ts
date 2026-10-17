import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
globalThis.require = createRequire(import.meta.url);
const { createQuranBooks, addQuranBook, readQuranBooks, readLegacyQuranBooks, MAX_QURAN_BOOKS } = await import('./quran-books.ts');

test('a new library starts with one Quran and grows to six independent copies', () => {
  let books = createQuranBooks();
  assert.equal(books.length, 1);
  assert.equal(books[0].page, 1);
  const original = books;
  books = addQuranBook(books);
  assert.equal(original.length, 1);
  books[0].page = 582;
  books[0].name = 'جزء عم';
  books[0].bookmarks.push(582);
  books[0].verseBookmarks.push('18:1');
  assert.equal(books[1].page, 1);
  assert.deepEqual(books[1].bookmarks, []);
  assert.deepEqual(books[1].verseBookmarks, []);
  while (books.length < MAX_QURAN_BOOKS) books = addQuranBook(books);
  assert.equal(books.length, 6);
  assert.equal(new Set(books.map(book => book.id)).size, 6);
  assert.equal(addQuranBook(books), books);
  assert.deepEqual(readQuranBooks(JSON.stringify(books)), books);
  assert.deepEqual(createQuranBooks()[0].bookmarks, []);
});

test('existing six-copy libraries retain all names, pages and bookmarks', () => {
  const books = Array.from({ length: 6 }, (_, index) => ({
    id: `book-${index + 1}`, name: `Reading ${index + 1}`, page: [582, 201, 442, 293, 1, 604][index],
    bookmarks: [index + 1], verseBookmarks: [`1:${index + 1}`],
  }));
  assert.deepEqual(readQuranBooks(JSON.stringify(books)), books);
});

test('both khatm dua sheets persist as reader pages and bookmarks', () => {
  const [book] = readQuranBooks(JSON.stringify([{ id:'book-1', page:606, bookmarks:[604,605,606,606], verseBookmarks:[] }]));
  assert.equal(book.page,606);
  assert.deepEqual(book.bookmarks,[604,605,606]);
});

test('sparse saved IDs retain their shelf order and additions use an unused ID', () => {
  const books = readQuranBooks(JSON.stringify([
    { id: 'book-5', page: 500 }, { id: 'book-2', page: 201 },
  ]));
  const added = addQuranBook(books);
  assert.deepEqual(added.map(book => book.id), ['book-5', 'book-2', 'book-1']);
  assert.deepEqual(added.map(book => book.page), [500, 201, 1]);
  assert.deepEqual(readQuranBooks(JSON.stringify(added)), added);
});

test('invalid and duplicate saved entries cannot add books or corrupt Quran positions', () => {
  const books = readQuranBooks(JSON.stringify([
    null, 4, 'book-1', {},
    { id: 'book-1', page: 607, name: '  Friday  ', bookmarks: [293, 2, 293, -1, 607, 1.2, '2'], verseBookmarks: ['18:1', '18:1', '999:1'] },
    { id: 'book-1', page: 42 }, { id: 'book-2', page: 0, name: 'x'.repeat(50) },
    { id: 'book-3', page: '30' }, { id: 'book-7', page: 42 }, { id: 'foreign', page: 42 },
  ]));
  assert.equal(books.length, 3);
  assert.deepEqual(books.map(book => book.page), [1, 1, 1]);
  assert.equal(books[0].name, 'Friday');
  assert.equal(books[1].name.length, 40);
  assert.deepEqual(books[0].bookmarks, [2, 293]);
  assert.deepEqual(books[0].verseBookmarks, ['18:1']);
  for (const raw of [null, '{invalid', '{}', 'null', '[]', '[{"id":"foreign"}]']) {
    assert.deepEqual(readQuranBooks(raw), createQuranBooks());
  }
});

test('the legacy reader migrates into one Quran without losing reading state', () => {
  const [book] = readLegacyQuranBooks('582', '[582,201,582]', '["18:1","114:6"]');
  assert.equal(book.id, 'book-1');
  assert.equal(book.page, 582);
  assert.deepEqual(book.bookmarks, [201, 582]);
  assert.deepEqual(book.verseBookmarks, ['18:1', '114:6']);
  assert.equal(readLegacyQuranBooks('582', '[]', '[]').length, 1);
  assert.deepEqual(readLegacyQuranBooks('invalid', '{broken', '{}'), createQuranBooks());
});
