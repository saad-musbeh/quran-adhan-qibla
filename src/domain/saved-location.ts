import type { LocationSource } from './location';

export const SAVED_LOCATION_KEY = 'selected-location-v1';
export const MAX_SAVED_LOCATION_LABEL_LENGTH = 160;
export const MAX_SAVED_LOCATION_ACCURACY_METERS = 10_000_000;

export type PersistedLocation = {
  latitude: number;
  longitude: number;
  source: LocationSource;
  label?: string;
  accuracy?: number | null;
  timestamp: number;
};

const sources = new Set<LocationSource>(['device', 'city', 'map', 'manual']);

/** Parse and bound location data read from storage or supplied for persistence. */
export function validateSavedLocation(value: unknown, now = Date.now()): PersistedLocation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const { latitude, longitude, source, timestamp } = candidate;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      typeof source !== 'string' || !sources.has(source as LocationSource) ||
      typeof timestamp !== 'number' || !Number.isFinite(timestamp) || timestamp < 0 || timestamp > now) return null;

  const saved: PersistedLocation = { latitude, longitude, source: source as LocationSource, timestamp };
  if (candidate.label !== undefined) {
    if (typeof candidate.label !== 'string') return null;
    const label = candidate.label.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, MAX_SAVED_LOCATION_LABEL_LENGTH);
    if (label) saved.label = label;
  }
  if (candidate.accuracy !== undefined) {
    if (candidate.accuracy === null) saved.accuracy = null;
    else if (typeof candidate.accuracy === 'number' && Number.isFinite(candidate.accuracy) &&
        candidate.accuracy >= 0 && candidate.accuracy <= MAX_SAVED_LOCATION_ACCURACY_METERS) {
      saved.accuracy = candidate.accuracy;
    } else return null;
  }
  return saved;
}
