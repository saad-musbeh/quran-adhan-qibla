type Permission = { status: string; ios?: { status: number; allowsSound?: boolean | null } };

// UNAuthorizationStatus: authorized=2, provisional=3, ephemeral=4.
// Provisional permission can display quietly but does not permit an Adhan sound.
export function allowsPrayerNotifications(permission: Permission, platform: string): boolean {
  return platform === 'ios'
    ? [2, 3, 4].includes(permission.ios?.status ?? -1)
    : permission.status === 'granted';
}

export function prayerSoundMuted(permission: Permission, platform: string, wantsSound: boolean): boolean {
  return wantsSound && platform === 'ios'
    && (permission.ios?.status === 3 || permission.ios?.allowsSound === false);
}
