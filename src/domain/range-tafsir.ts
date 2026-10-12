/** QuranEnc's tafsir endpoint preserves passages and their accompanying notes. */
export type RangeTafsirRecord = { id: number; sura: number; from_aya: number; to_aya: number; type: string; text: string };
export type TafsirText = { text: string; footnotes: string | null; passage?: { start: number; end: number } };

export function isValidRangeTafsirSurah(value: unknown, surah: number, count: number,allowEmptyRows=false): value is RangeTafsirRecord[] {
  if (!Array.isArray(value) || !value.length) return false;
  if (!value.every(r => r && r.sura === surah && Number.isInteger(r.id) && Number.isInteger(r.from_aya) && Number.isInteger(r.to_aya) && r.from_aya >= 0 && r.to_aya >= r.from_aya && r.to_aya <= count && (r.from_aya !== 0 || r.to_aya === 0) && typeof r.type === 'string' && r.type.length > 0 && typeof r.text === 'string' && (allowEmptyRows||r.text.length>0))) return false;
  let next = 1;
  let previousStart = 0;
  for (const r of value.filter(r => r.type === 'المقطع')) {
    // Al-Kahf 99 belongs to two consecutive source passages. Overlap is
    // legitimate; a gap or out-of-order passage is not.
    if (r.from_aya > next || r.from_aya < previousStart || r.from_aya < 1) return false;
    next = Math.max(next, r.to_aya + 1);
    previousStart = r.from_aya;
  }
  return next === count + 1;
}

export function indexRangeTafsir(chapters: readonly RangeTafsirRecord[][],requireCommentary=false): Map<string, TafsirText> {
  const result = new Map<string, TafsirText>();
  for (const rows of chapters) {
    const starts = rows.flatMap((r, i) => r.type === 'المقطع' ? [i] : []);
    starts.forEach((index, block) => {
      const passage = rows[index];
      // Keep every source paragraph, including introductions and final notes.
      const paragraphs=rows.slice(block === 0 ? 0 : index, starts[block+1]??rows.length);
      if(requireCommentary&&!paragraphs.some(r=>r.type!=='المقطع'&&r.text.trim().length>0))return;
      const text=paragraphs.map(r=>r.text).join('\n\n');
      if(!text.trim())return;
      const entry: TafsirText = { text, footnotes: null, passage: { start: passage.from_aya, end: passage.to_aya } };
      for (let ayah = passage.from_aya; ayah <= passage.to_aya; ayah++) {
        const key=`${passage.sura}:${ayah}`, previous=result.get(key);
        result.set(key, previous ? {text:previous.text+'\n\n'+text,footnotes:null,passage:{start:Math.min(previous.passage!.start,passage.from_aya),end:Math.max(previous.passage!.end,passage.to_aya)}} : entry);
      }
    });
  }
  return result;
}
