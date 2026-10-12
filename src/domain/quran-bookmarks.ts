import { getVerse } from './quran.ts';

export function readVerseBookmarks(raw: string | null): string[] {
  try {
    const values: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(values)) return [];
    return [...new Set(values.filter((key): key is string => {
      if (typeof key !== 'string' || !/^[1-9]\d*:[1-9]\d*$/.test(key)) return false;
      const [surah, ayah] = key.split(':').map(Number);
      return Boolean(getVerse(surah, ayah));
    }))];
  } catch { return []; }
}
