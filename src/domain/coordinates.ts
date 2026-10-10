export type CoordinateKind = 'latitude' | 'longitude';

/** Accept decimal degrees, including Arabic and Persian digits. */
export function parseCoordinate(text: string, kind: CoordinateKind): number | null {
  const normalized = text.trim()
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - '٠'.charCodeAt(0)))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٫,]/g, '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  const limit = kind === 'latitude' ? 90 : 180;
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}
