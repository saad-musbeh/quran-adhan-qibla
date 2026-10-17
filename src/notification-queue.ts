/** Both reminder families share the OS pending-notification budget. Serialize reconciliation. */
let pending: Promise<void> = Promise.resolve();
/** A wedged native call must not block later reconciles forever. */
export const RECONCILE_TIMEOUT_MS = 15_000;

export function enqueueNotificationReconcile(action: () => Promise<void>): void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  pending = pending.catch(() => {}).then(() => {
    try {
      return Promise.race([
        action(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Notification reconciliation did not finish; continuing.')), RECONCILE_TIMEOUT_MS);
        }),
      ]).finally(() => clearTimeout(timer));
    } catch (error) {
      clearTimeout(timer);
      return Promise.reject(error);
    }
  }).catch(() => {});
}
