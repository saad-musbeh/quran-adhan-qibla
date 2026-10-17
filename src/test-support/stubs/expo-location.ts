export const Accuracy = { Low: 1, Balanced: 3, High: 4, Highest: 6 };
export const state = {
  permissions: { granted: true, canAskAgain: true, status: 'granted', ios: { status: 2, allowsSound: true } },
  servicesEnabled: true,
  currentFix: { coords: { latitude: 24.7136, longitude: 46.6753, accuracy: 100 }, timestamp: 42 },
  permissionsFailure: null as string | null,
};
export const getForegroundPermissionsAsync = async () => {
  if (state.permissionsFailure) throw new Error(state.permissionsFailure);
  return state.permissions;
};
export const requestForegroundPermissionsAsync = async () => state.permissions;
export const hasServicesEnabledAsync = async () => state.servicesEnabled;
export const getCurrentPositionAsync = async () => state.currentFix;
const headingListeners = new Set<(sample: { trueHeading: number; magHeading: number; accuracy: number }) => void>();
const headingFailureCallbacks = new Set<(error?: unknown) => void>();
export const watchHeadingAsync = async (
  callback: (sample: { trueHeading: number; magHeading: number; accuracy: number }) => void,
  onError?: (error?: unknown) => void,
) => {
  headingListeners.add(callback);
  headingFailureCallbacks.add(onError ?? (() => undefined));
  return {
    async remove() {
      headingListeners.delete(callback);
      headingFailureCallbacks.delete(onError ?? (() => undefined));
    },
  };
};
export function emitHeading(sample: { trueHeading: number; magHeading: number; accuracy: number }) {
  for (const listener of [...headingListeners]) listener(sample);
}
export let headingLog: string[] = [];
export function failHeadings(error?: unknown) {
  for (const listener of [...headingFailureCallbacks]) listener(error);
}
export function headingListenerCount() { return headingListeners.size; }
