import { readVerseBookmarks } from './quran-bookmarks.ts';
import { LAST_READER_PAGE } from '../data/mushaf.ts';

export type QuranBook = { id: string; name: string; page: number; bookmarks: number[]; verseBookmarks: string[] };
export const QURAN_BOOKS_KEY = 'quran.reader.books.v1';
export const LEGACY_QURAN_KEYS = ['quran.reader.lastPage', 'quran.reader.bookmarks', 'quran.reader.verseBookmarks'] as const;
export const MAX_QURAN_BOOKS = 6;

function createBook(id: string): QuranBook {
  return { id, name: '', page: 1, bookmarks: [], verseBookmarks: [] };
}

export function createQuranBooks(): QuranBook[] {
  return [createBook('book-1')];
}

export function addQuranBook(books: QuranBook[]): QuranBook[] {
  if (books.length >= MAX_QURAN_BOOKS) return books;
  const id = Array.from({ length: MAX_QURAN_BOOKS }, (_, i) => `book-${i + 1}`).find(id => !books.some(book => book.id === id));
  return id ? [...books, createBook(id)] : books;
}

/** Move the pre-library reader into book 1, retaining the original keys. */
export function readLegacyQuranBooks(page: string | null, bookmarks: string | null, verseBookmarks: string | null): QuranBook[] {
  const parse = (raw: string | null): unknown => {
    try { return JSON.parse(raw ?? 'null'); } catch { return null; }
  };
  return readQuranBooks(JSON.stringify([{ ...createQuranBooks()[0], page: Number(page), bookmarks: parse(bookmarks), verseBookmarks: parse(verseBookmarks) }]));
}

export function readQuranBooks(json: string | null): QuranBook[] {
  const defaults = createQuranBooks();
  try {
    const value: unknown = JSON.parse(json ?? 'null');
    if (!Array.isArray(value)) return defaults;
    const seen = new Set<string>();
    // Keep the shelf order stable, including when older saved IDs have gaps.
    const restored = value.flatMap(saved => {
      if (!saved || typeof saved !== 'object' || !/^book-[1-6]$/.test(saved.id) || seen.has(saved.id)) return [];
      seen.add(saved.id);
      const book = createBook(saved.id);
      return [{
        ...book,
        name: typeof saved.name === 'string' ? saved.name.trim().slice(0, 40) : '',
        page: Number.isInteger(saved.page) && saved.page >= 1 && saved.page <= LAST_READER_PAGE ? saved.page : 1,
        bookmarks: Array.isArray(saved.bookmarks) ? [...new Set<number>(saved.bookmarks.filter((n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= LAST_READER_PAGE))].sort((a, b) => a - b) : [],
        verseBookmarks: readVerseBookmarks(JSON.stringify(saved.verseBookmarks)),
      }];
    });
    return restored.length ? restored : defaults;
  } catch { return defaults; }
}
