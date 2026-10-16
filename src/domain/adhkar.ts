
export const ADHKAR_COLLECTIONS = ['morning', 'evening', 'after-prayer'] as const;
export type AdhkarCollection = typeof ADHKAR_COLLECTIONS[number];
export type Dhikr = { id: string; text: string; count: number; reference: string };
export const adhkar = require('../data/adhkar.json') as Record<AdhkarCollection, readonly Dhikr[]>;
export const HISN_SOURCE = 'https://github.com/asellam/HisnElMuslim/tree/872764ca013116c905f7fc9c3dc972c27cd37d4a';

export function isAdhkarCollection(value: unknown): value is AdhkarCollection {
  return ADHKAR_COLLECTIONS.some(id => id === value);
}

export function incrementDhikr(counts: Readonly<Record<string, number>>, entry: Dhikr): Record<string, number> {
  return { ...counts, [entry.id]: Math.min(entry.count, (counts[entry.id] ?? 0) + 1) };
}

export function collectionComplete(entries: readonly Dhikr[], counts: Readonly<Record<string, number>>): boolean {
  return entries.length > 0 && entries.every(entry => (counts[entry.id] ?? 0) >= entry.count);
}
