// Expo tiers are 0–3; on iOS tier 3 represents under 20 degrees of reported uncertainty.
export const MIN_HEADING_ACCURACY = 3;

export type HeadingSample = {
  trueHeading: number;
  magHeading: number;
  accuracy: number;
};

/** True north only: magnetic heading is intentionally never used as a substitute. */
export function usableTrueHeading(sample: HeadingSample): number | null {
  if (!Number.isFinite(sample.accuracy) || sample.accuracy < MIN_HEADING_ACCURACY) return null;
  if (!Number.isFinite(sample.trueHeading) || sample.trueHeading < 0 || sample.trueHeading >= 360) return null;
  return sample.trueHeading;
}

/** Correct a calibrated magnetic heading with east-positive WMM declination. */
export function magneticToTrueHeading(sample: HeadingSample, declination: number | null): number | null {
  if (!Number.isFinite(sample.accuracy) || sample.accuracy < MIN_HEADING_ACCURACY) return null;
  if (!Number.isFinite(sample.magHeading) || sample.magHeading < 0 || sample.magHeading >= 360) return null;
  if (declination === null || !Number.isFinite(declination)) return null;
  return normalizeDegrees(sample.magHeading + declination);
}

export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** Signed shortest turn from current azimuth to target azimuth, in [-180, 180). */
export function relativeBearing(target: number, current: number): number {
  return ((target - current + 540) % 360) - 180;
}

/** Smooth compass samples over the shortest arc to avoid jumps at north. */
export function smoothHeading(previous: number, next: number, alpha = 0.55): number {
  const blend = Math.max(0, Math.min(1, alpha));
  return normalizeDegrees(previous + relativeBearing(next, previous) * blend);
}

/** Continuous target for animated rotation: 359 → 1 becomes 359 → 361. */
export function unwrapHeading(previous: number, next: number): number {
  return previous + relativeBearing(normalizeDegrees(next), normalizeDegrees(previous));
}

/** Time-based jitter filtering avoids sample-rate-dependent trailing on slow sensors. */
export function responsiveHeading(previous: number, next: number, elapsedMs: number): number {
  const turn = Math.abs(relativeBearing(next, previous));
  if (turn < 0.25) return previous;
  const alpha = turn > 12 ? 0.95 : 1 - Math.exp(-Math.max(0, elapsedMs) / 60);
  return smoothHeading(previous, next, alpha);
}

export function isFacingTarget(relativeAngle: number, tolerance = 8): boolean {
  return Math.abs(relativeAngle) <= tolerance;
}
