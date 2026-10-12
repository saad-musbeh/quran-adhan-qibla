export type SourceTafsirRecord = {
  sura: number | string;
  aya: number | string;
  arabic_text: string;
  translation: string;
  footnotes: string | null;
  [field: string]: unknown;
};

export type TafsirBookEnvelope = {
  schema: 1;
  book: { id: string; title: string; publisher: string; version: string; url: string };
  records: SourceTafsirRecord[];
  downloadToken?: string;
};

export function verifyQuranEncRelease(book: { apiKey: string; title: string; version: string }, html: string): void {
  const link = html.indexOf(`/ar/browse/${book.apiKey}`);
  const cardStart = link < 0 ? -1 : html.lastIndexOf('<div class="tab_card ', link);
  if (cardStart < 0) throw new Error(`Could not find ${book.title} in QuranEnc's current catalogue.`);
  const card = html.slice(cardStart, link);
  const release = card.match(/(\d{2})\/(\d{2})\/(\d{4})\s*-\s*V([\d.]+)/);
  const pinned = book.version.match(/^V?([\d.]+)\s*\((\d{4})-(\d{2})-(\d{2})\)$/);
  if (!release || !pinned) throw new Error(`Release metadata for ${book.title} is not pinned in this app.`);
  const [, day, month, year, version] = release;
  const [, expectedVersion, expectedYear, expectedMonth, expectedDay] = pinned;
  if (version !== expectedVersion || year !== expectedYear || month !== expectedMonth || day !== expectedDay) {
    throw new Error(`QuranEnc has a newer release of ${book.title}. Update the app's pinned metadata before downloading.`);
  }
}

export function isValidSurahResult(value: unknown, surah: number, verseCount: number): value is SourceTafsirRecord[] {
  if (!Array.isArray(value) || value.length !== verseCount) return false;
  return value.every((record, index) => {
    if (!record || typeof record !== 'object') return false;
    const item = record as Partial<SourceTafsirRecord>;
    return Number(item.sura) === surah && Number(item.aya) === index + 1 &&
      typeof item.arabic_text === 'string' && item.arabic_text.length > 0 &&
      typeof item.translation === 'string' && item.translation.length > 0 &&
      (item.footnotes === null || typeof item.footnotes === 'string');
  });
}

export function isValidTafsirEnvelope(value: unknown, book: TafsirBookEnvelope['book'], verseCounts: readonly number[]): value is TafsirBookEnvelope {
  if (!value || typeof value !== 'object') return false;
  const envelope = value as Partial<TafsirBookEnvelope>;
  if (envelope.schema !== 1 || !envelope.book || envelope.book.id !== book.id || envelope.book.title !== book.title || envelope.book.publisher !== book.publisher || envelope.book.version !== book.version || envelope.book.url !== book.url) return false;
  if (!Array.isArray(envelope.records) || envelope.records.length !== verseCounts.reduce((sum, count) => sum + count, 0)) return false;
  let offset = 0;
  for (let surah = 1; surah <= verseCounts.length; surah += 1) {
    if (!isValidSurahResult(envelope.records.slice(offset, offset + verseCounts[surah - 1]), surah, verseCounts[surah - 1])) return false;
    offset += verseCounts[surah - 1];
  }
  return true;
}

export function indexTafsirRecords(records: readonly SourceTafsirRecord[]): Map<string, { text: string; footnotes: string | null }> {
  return new Map(records.map(record => [`${Number(record.sura)}:${Number(record.aya)}`, { text: record.translation, footnotes: record.footnotes }]));
}

export async function downloadSurahsConcurrently<T>(
  total: number,
  concurrency: number,
  signal: AbortSignal,
  fetchSurah: (surah: number, signal: AbortSignal) => Promise<T>,
  onProgress?: (completed: number) => void,
): Promise<T[]> {
  const results = new Array<T>(total);
  const workerController = new AbortController();
  const abortWorkers = () => workerController.abort();
  signal.addEventListener('abort', abortWorkers, { once: true });
  let next = 1;
  let completed = 0;
  let firstError: unknown;
  const checkAbort = () => {
    if (signal.aborted) { const error = new Error('Download cancelled'); error.name = 'AbortError'; throw error; }
  };
  const worker = async () => {
    try {
      while (true) {
        checkAbort();
        if (workerController.signal.aborted) return;
        const surah = next++;
        if (surah > total) return;
        const value = await fetchSurah(surah, workerController.signal);
        checkAbort();
        if (workerController.signal.aborted) return;
        results[surah - 1] = value;
        onProgress?.(++completed);
      }
    } catch (error) {
      if (firstError === undefined) firstError = error;
      workerController.abort();
    }
  };
  try {
    const workers = Array.from({ length: Math.max(1, Math.min(total, Math.floor(concurrency) || 1)) }, worker);
    await Promise.allSettled(workers);
    if (firstError !== undefined) throw firstError;
    checkAbort();
    return results;
  } finally {
    signal.removeEventListener('abort', abortWorkers);
  }
}
