/** Both reminder families share the OS pending-notification budget. Serialize reconciliation. */
let pending: Promise<void> = Promise.resolve();
export function enqueueNotificationReconcile(action: () => Promise<void>): void {
  pending = pending.catch(() => {}).then(action);
}
