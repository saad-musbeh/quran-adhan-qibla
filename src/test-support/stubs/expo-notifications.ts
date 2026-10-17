export const SchedulableTriggerInputTypes = { DATE: 'date', DAILY: 'daily', TIME_INTERVAL: 'timeInterval' } as const;
export const AndroidImportance = { DEFAULT: 3, HIGH: 5, NONE: 0 };
export const store = {
  scheduled: [] as { identifier: string; content: { title?: string; body?: string; sound?: unknown; data?: Record<string, unknown> }; trigger: unknown }[],
  nextId: 1,
  channels: new Map<string, Record<string, unknown>>(),
  log: [] as Array<[string, unknown]>,
  permissions: { status: 'granted', ios: { status: 2, allowsSound: true } },
  handler: null as unknown,
  getAllOverride: null as null | (() => Promise<unknown[]> | unknown[]),
};
export function resetStore() {
  store.scheduled = [];
  store.nextId = 1;
  store.channels = new Map();
  store.log = [];
  store.getAllOverride = null;
}
export const setNotificationHandler = (handler: unknown) => { store.handler = handler; };
export const getAllScheduledNotificationsAsync = async () =>
  store.getAllOverride ? store.getAllOverride() : store.scheduled.map(item => ({ ...item }));
export const cancelScheduledNotificationAsync = async (identifier: string) => {
  store.log.push(['cancel', identifier]);
  if (!store.scheduled.some(item => item.identifier === identifier)) return;
  store.scheduled = store.scheduled.filter(item => item.identifier !== identifier);
};
export const scheduleNotificationAsync = async (request: { content: { title?: string; body?: string; sound?: unknown; data?: Record<string, unknown> }; trigger: unknown }) => {
  store.log.push(['schedule', request.content?.data]);
  const identifier = `hook-id-${store.nextId++}`;
  store.scheduled.push({ identifier, content: request.content, trigger: request.trigger });
  return identifier;
};
export const requestPermissionsAsync = async () => store.permissions;
export const getPermissionsAsync = async () => store.permissions;
export const setNotificationChannelAsync = async (id: string, options: Record<string, unknown>) => {
  const channel = { id, ...options };
  store.channels.set(id, channel);
  return channel;
};
export const getNotificationChannelAsync = async (id: string) => store.channels.get(id) ?? null;
const responseListeners = new Set<(response?: unknown) => void>();
export const addNotificationResponseReceivedListener = (listener: (response?: unknown) => void) => {
  responseListeners.add(listener);
  return {
    remove: () => { responseListeners.delete(listener); },
  };
};
export const getLastNotificationResponseAsync = async () => null;
export const clearLastNotificationResponseAsync = async () => undefined;
