export type Coordinates = { latitude: number; longitude: number };
export type LocationSource = 'device' | 'city' | 'map' | 'manual';
export type DeviceLocation = Coordinates & { accuracy: number | null; timestamp: number };
export type LocationFailure = 'denied' | 'blocked' | 'servicesDisabled' | 'timeout' | 'locationError';

export class LocationAccessError extends Error {
  readonly reason: LocationFailure;
  constructor(reason: LocationFailure) {
    super(reason);
    this.reason = reason;
  }
}

type Permission = { granted: boolean; canAskAgain: boolean };
export type LocationProvider = {
  getPermission(): Promise<Permission>;
  requestPermission(): Promise<Permission>;
  servicesEnabled(): Promise<boolean>;
  currentPosition(): Promise<{ coords: Coordinates & { accuracy: number | null }; timestamp: number }>;
};

export const LOCATION_REFRESH_MS = 6 * 60 * 60 * 1000;

/** Maps SystemDeviceLocation error codes to the same [[LocationFailure]] states as [[requestDeviceLocation]].
 * When a permission snapshot is available, ERR_LOCATION_DENIED distinguishes recoverable denial from a
 * permanently blocked permission exactly like the expo permission path. */
export function nativeLocationFailure(
  code: string | undefined,
  permission?: { granted: boolean; canAskAgain: boolean } | null,
): LocationFailure {
  switch (code) {
    case 'ERR_LOCATION_SERVICES_DISABLED': return 'servicesDisabled';
    case 'ERR_LOCATION_TIMEOUT': return 'timeout';
    case 'ERR_LOCATION_DENIED':
      return permission && !permission.granted && !permission.canAskAgain ? 'blocked' : 'denied';
    default: return 'locationError';
  }
}

/** Only an already selected device location can refresh automatically. */
export function shouldRefreshLocation(source: LocationSource | undefined, lastAttempt: number, now: number): boolean {
  return source === 'device' && now - lastAttempt >= LOCATION_REFRESH_MS;
}

/** A single foreground fix. Never read location after a denied permission. */
export async function requestDeviceLocation(provider: LocationProvider, timeoutMs = 30_000, allowPrompt = true): Promise<DeviceLocation> {
  try {
    let permission = await provider.getPermission();
    if (!permission.granted && permission.canAskAgain && allowPrompt) permission = await provider.requestPermission();
    if (!permission.granted) throw new LocationAccessError(permission.canAskAgain ? 'denied' : 'blocked');
    if (!await provider.servicesEnabled()) throw new LocationAccessError('servicesDisabled');

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const position = await Promise.race([
        provider.currentPosition(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new LocationAccessError('timeout')), timeoutMs);
        }),
      ]);
      const { latitude, longitude, accuracy } = position.coords;
      if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
        !Number.isFinite(longitude) || Math.abs(longitude) > 180 || !Number.isFinite(position.timestamp)) {
        throw new LocationAccessError('locationError');
      }
      return { latitude, longitude, accuracy, timestamp: position.timestamp };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    if (error instanceof LocationAccessError) throw error;
    throw new LocationAccessError('locationError');
  }
}
