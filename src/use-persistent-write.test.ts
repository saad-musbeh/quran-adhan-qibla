import assert from 'node:assert/strict';
import test from 'node:test';
import { HookHarness } from './test-support/react-hooks.ts';
import { usePersistentWrite } from './use-persistent-write.ts';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

test('an in-flight retry cannot overwrite an edit queued after it or hide that edit failing', async () => {
  let stored = '';
  let fail = true;
  let gate: ReturnType<typeof deferred> | undefined;
  const h = new HookHarness(() => usePersistentWrite(async (value: string) => {
    if (gate) await gate.promise;
    if (fail) throw Error('Disk full');
    stored = value;
  }));
  const api = () => h.result as ReturnType<typeof usePersistentWrite<string>>;
  try {
    await h.mount();
    await h.change(() => api().save('old'));
    assert.equal(api().saveFailed, true);
    fail = false;
    gate = deferred();
    await h.change(() => api().retrySave());
    await h.change(() => api().save('new'));
    await h.change(() => gate!.resolve());
    assert.equal(stored, 'new');
    assert.equal(api().saveFailed, false);
    fail = true;
    await h.change(() => api().save('latest'));
    assert.equal(api().saveFailed, true);
    assert.equal(stored, 'new');
    fail = false;
    await h.change(() => api().retrySave());
    assert.equal(stored, 'latest');
  } finally { await h.unmount(); }
});
