export type AudioDownload = {reciter: string; surah: number; bytes: number; verses: number; total: number; complete: boolean};

export function summarizeAudioDownload(reciter: string, surah: number, total: number, files: readonly {name: string; size: number}[]): AudioDownload {
  const verses = new Map<number, number>();
  const continuousBytes = files.find(file => file.name === 'surah.mp3' && Number.isFinite(file.size) && file.size > 0)?.size ?? 0;
  for (const file of files) {
    const match = /^(\d{3})(\d{3})\.mp3$/.exec(file.name);
    if (!match || Number(match[1]) !== surah || !Number.isFinite(file.size) || file.size <= 0) continue;
    const verse = Number(match[2]);
    if (verse >= 1 && verse <= total) verses.set(verse, file.size);
  }
  return {reciter, surah, bytes:continuousBytes + [...verses.values()].reduce((a,b)=>a+b,0), verses:verses.size, total, complete:verses.size === total && continuousBytes > 0};
}
