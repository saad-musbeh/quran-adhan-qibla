import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Run production hooks through React's renderer, including effects and cleanup. */
export class HookHarness {
  private root?: ReactTestRenderer;
  private readonly probe: () => null;
  result: unknown;

  constructor(component: () => unknown) {
    this.probe = () => { this.result = component(); return null; };
  }

  async mount(): Promise<void> {
    await act(async () => { this.root = create(createElement(this.probe)); });
  }

  async render(): Promise<void> {
    if (!this.root) throw new Error('Hook harness is not mounted');
    await act(async () => { this.root!.update(createElement(this.probe)); });
  }

  async unmount(): Promise<void> {
    await act(async () => { this.root?.unmount(); });
    this.root = undefined;
  }

  async change<T>(action: () => T | Promise<T>): Promise<T> {
    let result!: T;
    await act(async () => { result = await action(); });
    return result;
  }

  /** Drain native promise callbacks and let React commit their updates. */
  async settle(): Promise<void> {
    await act(async () => { await new Promise<void>(resolve => setImmediate(resolve)); });
  }
}
