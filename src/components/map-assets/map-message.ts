export type SelectedCoordinates = { latitude: number; longitude: number };

/** Parse the narrow message shape accepted from the embedded map. */
export function parseMapMessage(raw: string): SelectedCoordinates | null {
  try {
    const message: unknown = JSON.parse(raw);
    if (!message || typeof message !== 'object') return null;
    const value = message as Record<string, unknown>;
    if (value.type !== 'select' || typeof value.latitude !== 'number' || typeof value.longitude !== 'number') return null;
    if (!Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)) return null;
    if (value.latitude < -90 || value.latitude > 90 || value.longitude < -180 || value.longitude > 180) return null;
    return { latitude: value.latitude, longitude: value.longitude };
  } catch {
    return null;
  }
}
