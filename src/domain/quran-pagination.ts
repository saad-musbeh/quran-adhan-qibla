import type { Verse } from './quran';

export type VerseChunk = { verse: Verse; text: string; continuesBefore: boolean; continuesAfter: boolean };

/** Split a printed Quran page into readable viewport-sized parts without changing or omitting its text. */
export function paginateQuranPage(verses: readonly Verse[], maxCharacters: number): VerseChunk[][] {
  const budget = Math.max(24, Math.floor(maxCharacters));
  const parts: VerseChunk[][] = [[]];
  let used = 0;
  for (const verse of verses) {
    const chunks = splitVerse(verse, budget);
    for (const chunk of chunks) {
      const cost = chunk.text.length + 3; // leave room for the ayah marker and number
      if (used > 0 && used + cost > budget) { parts.push([]); used = 0; }
      parts[parts.length - 1].push(chunk);
      used += cost;
    }
  }
  return parts.length ? parts : [[]];
}

function splitVerse(verse: Verse, budget: number): VerseChunk[] {
  const text = verse.text;
  if (text.length <= budget) return [{ verse, text, continuesBefore: false, continuesAfter: false }];
  const result: VerseChunk[] = [];
  let offset = 0;
  while (offset < text.length) {
    let end = Math.min(text.length, offset + budget);
    if (end < text.length) {
      const boundary = text.lastIndexOf(' ', end);
      if (boundary > offset + Math.floor(budget * 0.55)) end = boundary + 1;
    }
    if (end <= offset) end = Math.min(text.length, offset + budget);
    result.push({ verse, text: text.slice(offset, end), continuesBefore: offset > 0, continuesAfter: end < text.length });
    offset = end;
  }
  return result;
}
