/** Keep an explicit opt-out; older and malformed preferences use the Home default. */
export function normalizeMainMenuOnPhones(value: unknown): boolean {
  return value !== false;
}

export function startupHomeVisible(largeScreen: boolean, mainMenuOnPhones: unknown): boolean {
  return largeScreen || normalizeMainMenuOnPhones(mainMenuOnPhones);
}
