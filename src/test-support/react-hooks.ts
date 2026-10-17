import * as React from 'react';

// Minimal hook host: drives a component function outside React's renderer so hooks can be
// exercised from plain node:test files. Supports the useState/useRef/useCallback/useEffect
// semantics used by the reminder hooks (state slot queues, memo charts, unmount cleanups).
const internals = (React as unknown as { __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: { H: unknown } }).__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

type SlotState = { value: unknown; queue: unknown[] };
type SlotCallback = { fn: unknown; deps: readonly unknown[] | undefined };
type SlotEffect = {
  hasRun: boolean;
  cleanup?: () => void;
  pendingCreate?: () => void | (() => void);
  pendingDeps?: readonly unknown[] | undefined;
  lastDeps?: readonly unknown[] | undefined;
};
type Host = {
  slotIndex: number;
  states: SlotState[];
  refs: { current: unknown }[];
  callbacks: SlotCallback[];
  effects: SlotEffect[];
  scheduled: boolean;
};

let active: Host | null = null;

function depsEqual(a: readonly unknown[] | undefined, b: readonly unknown[] | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return a.length === b.length && a.every((item, index) => Object.is(item, b[index]));
}

const dispatcher = {
  useState<S>(initial: S | (() => S)): [S, (update: (prev: S) => S) => void] {
    const host = active;
    if (!host) throw new Error('Hook harness is not rendering');
    const index = host.slotIndex++;
    let slot = host.states[index];
    if (!slot) {
      slot = { value: typeof initial === 'function' ? (initial as () => S)() : initial, queue: [] };
      host.states[index] = slot;
    }
    return [slot.value as S, (update: (prev: S) => S) => {
      slot!.queue.push(update);
      host.scheduled = true;
    }];
  },
  useRef(initial: unknown): { current: unknown } {
    const host = active;
    if (!host) throw new Error('Hook harness is not rendering');
    const index = host.slotIndex++;
    if (!host.refs[index]) host.refs[index] = { current: initial };
    return host.refs[index];
  },
  useCallback(fn: unknown, deps: readonly unknown[] | undefined): unknown {
    const host = active;
    if (!host) throw new Error('Hook harness is not rendering');
    const index = host.slotIndex++;
    let slot = host.callbacks[index];
    if (!slot || !depsEqual(deps, slot.deps)) {
      slot = { fn, deps: deps === undefined ? undefined : [...deps] };
      host.callbacks[index] = slot;
    }
    return slot.fn;
  },
  useEffect(create: () => void | (() => void), deps: readonly unknown[] | undefined): void {
    const host = active;
    if (!host) throw new Error('Hook harness is not rendering');
    const index = host.slotIndex++;
    const slot = host.effects[index] ?? { hasRun: false };
    host.effects[index] = slot;
    slot.pendingCreate = create;
    slot.pendingDeps = deps === undefined ? undefined : [...deps];
  },
};

function applyQueues(host: Host) {
  for (const slot of host.states) {
    if (!slot) continue;
    let update = slot.queue.shift();
    while (update !== undefined) {
      const apply = update as (prev: unknown) => unknown;
      slot.value = typeof apply === 'function' ? apply(slot.value) : apply;
      update = slot.queue.shift();
    }
  }
}

export class HookHarness {
  private readonly component: () => unknown;
  private readonly host: Host = { slotIndex: 0, states: [], refs: [], callbacks: [], effects: [], scheduled: false };
  result: unknown;

  constructor(component: () => unknown) {
    this.component = component;
  }

  private run(): void {
    const host = this.host;
    const previous = active;
    active = host;
    if (!internals) throw new Error('React client internals are unavailable');
    internals.H = dispatcher;
    try {
      host.slotIndex = 0;
      this.result = this.component();
    } finally {
      active = previous;
    }
    this.commitEffects();
  }

  private commitEffects(): void {
    for (const slot of this.host.effects) {
      if (!slot || slot.pendingCreate === undefined) continue;
      const create = slot.pendingCreate;
      const deps = slot.pendingDeps;
      slot.pendingCreate = undefined;
      slot.pendingDeps = undefined;
      const shouldRun = !slot.hasRun || (deps === undefined || !depsEqual(deps, slot.lastDeps));
      if (!shouldRun) continue;
      const previousCleanup = slot.cleanup;
      slot.cleanup = undefined;
      if (previousCleanup) previousCleanup();
      const cleanup = create();
      slot.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
      slot.lastDeps = deps;
      slot.hasRun = true;
    }
  }

  /** First render plus its effects. */
  mount(): void {
    this.run();
  }

  /** Re-render after input object mutation, without resetting hook state. */
  render(): void {
    this.run();
  }

  unmount(): void {
    for (const slot of this.host.effects) {
      if (!slot) continue;
      if (typeof slot.cleanup === 'function') {
        slot.cleanup();
        slot.cleanup = undefined;
      }
      slot.hasRun = false;
      slot.lastDeps = undefined;
    }
  }

  /** Resolves once every scheduled state render and its effects have been applied. */
  async settle(maxRounds = 100): Promise<void> {
    // One macrotask gap fully drains the microtask queue, including serialized
    // notification-queue promise chains that advance several ticks per await.
    const gap = () => new Promise<void>(resolve => setImmediate(resolve));
    for (let round = 0; round < maxRounds; round++) {
      await gap();
      if (this.host.scheduled) {
        this.host.scheduled = false;
        applyQueues(this.host);
        this.run();
        continue;
      }
      await gap();
      if (!this.host.scheduled) return;
    }
    throw new Error('Hook harness did not settle');
  }
}
