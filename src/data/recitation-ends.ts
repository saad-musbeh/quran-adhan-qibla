import type { ReciterId } from './reciters';

/** Source-specific audited ends. Values are media seconds, never wall-clock timers.
 * Full-surah and EveryAyah editions can be different recording takes, so their
 * endpoints must be verified independently. See the Al-Fatiha audit provenance.
 * All current ends are in Al-Fatiha and are present at initial queue attach.
 * Later-chapter ayah ends require native map updates during queue refill.
 */
export const FULL_SURAH_ENDS: Partial<Record<ReciterId, Readonly<Record<number, number>>>> = {
  ghamdi: { 1: 42 },
  shuraym: { 1: 35.25 },
  rifai: { 1: 38.375 },
  maher: { 1: 32.8 },
  budair: { 1: 49.45 },
};

export const VERSE_RECORDING_ENDS: Partial<Record<ReciterId, Readonly<Record<string, number>>>> = {
  shuraym: { '1:7': 11.95 },
};
