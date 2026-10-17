export const ActivityAction = {
  APP_NOTIFICATION_SETTINGS: 'android.settings.APP_NOTIFICATION_SETTINGS',
  APPLICATION_DETAILS_SETTINGS: 'android.settings.APPLICATION_DETAILS_SETTINGS',
  REQUEST_SCHEDULE_EXACT_ALARM: 'android.settings.REQUEST_SCHEDULE_EXACT_ALARM',
};
export const startedIntents: { action: string; extra?: unknown }[] = [];
export const startActivityAsync = async (action: string, extra?: unknown) => {
  startedIntents.push({ action, extra });
  return 'started';
};
export function resetIntents() { startedIntents.length = 0; }
