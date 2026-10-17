export const Platform = { OS: 'ios' as string };

type AppStateListener = (state: string) => void;
export const AppState = createAppState();
function createAppState() {
  const listeners = new Map<string, AppStateListener[]>();
  const appState = {
    currentState: 'active',
    addEventListener(type: string, listener: AppStateListener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type)!.push(listener);
      return {
        remove: () => appState.removeEventListener(type, listener),
      };
    },
    removeEventListener(type: string, listener: AppStateListener) {
      listeners.set(type, (listeners.get(type) ?? []).filter(item => item !== listener));
    },
    listeners,
    emit(next: string) {
      appState.currentState = next;
      for (const listener of [...listeners.get('change') ?? []]) listener(next);
    },
  };
  return appState;
}
export const Linking = { openSettings: async () => true };
