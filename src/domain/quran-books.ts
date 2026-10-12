import { readVerseBookmarks } from './quran-bookmarks.ts';

export type QuranBook = { id: string; name: string; page: number; bookmarks: number[]; verseBookmarks: string[] };
export const QURAN_BOOKS_KEY = 'quran.reader.books.v1';

export function createQuranBooks(): QuranBook[] {
  return Array.from({ length: 6 }, (_, i) => ({ id: `book-${i + 1}`, name: '', page: 1, bookmarks: [], verseBookmarks: [] }));
}

export function readQuranBooks(json: string | null): QuranBook[] {
  const defaults = createQuranBooks();
  try {
    const value: unknown = JSON.parse(json ?? 'null');
    if (!Array.isArray(value)) return defaults;
    return defaults.map(book => {
      const saved = value.find(item => item && typeof item === 'object' && item.id === book.id);
      if (!saved) return book;
      return {
        ...book,
        name: typeof saved.name === 'string' ? saved.name.trim().slice(0, 40) : '',
        page: Number.isInteger(saved.page) && saved.page >= 1 && saved.page <= 604 ? saved.page : 1,
        bookmarks: Array.isArray(saved.bookmarks) ? [...new Set<number>(saved.bookmarks.filter((n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 604))].sort((a, b) => a - b) : [],
        verseBookmarks: readVerseBookmarks(JSON.stringify(saved.verseBookmarks)),
      };
    });
  } catch { return defaults; }
}
