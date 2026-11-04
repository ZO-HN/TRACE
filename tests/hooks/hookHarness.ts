// Executes actual hooks with controlled state/effects/subscriptions. This is a
// lifecycle unit harness, not React renderer or browser acceptance evidence.
type Effect = { deps?: unknown[]; setup: () => void | (() => void); cleanup?: void | (() => void) };
let active: HookHarness<unknown>;
const roots = new Set<HookHarness<unknown>>();
const same = (a?: unknown[], b?: unknown[]) => a !== undefined && b !== undefined && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
export class HookHarness<T> {
  slots: unknown[] = [];
  effects = new Map<number, Effect>();
  queue: (() => void)[] = [];
  cursor = 0;
  dirty = true;
  current!: T;
  constructor(public hook: () => T) { roots.add(this as HookHarness<unknown>); this.render(); }
  render() {
    active = this as HookHarness<unknown>;
    this.cursor = 0;
    this.dirty = false;
    this.current = this.hook();
    for (const effect of this.queue.splice(0)) effect();
  }
  replay() {
    for (const effect of this.effects.values()) effect.cleanup?.();
    for (const effect of this.effects.values()) effect.cleanup = effect.setup();
  }
  unmount() {
    for (const effect of this.effects.values()) effect.cleanup?.();
    roots.delete(this as HookHarness<unknown>);
  }
}
function useState(initial: unknown) {
  const root = active, i = root.cursor++;
  if (!(i in root.slots)) root.slots[i] = typeof initial === 'function' ? initial() : initial;
  return [root.slots[i], (value: unknown) => {
    const next = typeof value === 'function' ? value(root.slots[i]) : value;
    if (!Object.is(root.slots[i], next)) { root.slots[i] = next; root.dirty = true; }
  }];
}
function useEffect(setup: Effect['setup'], deps?: unknown[]) {
  const root = active, i = root.cursor++, previous = root.effects.get(i);
  if (!previous || !same(previous.deps, deps)) root.queue.push(() => {
    previous?.cleanup?.();
    const effect = { setup, deps, cleanup: setup() };
    root.effects.set(i, effect);
  });
}
export const reactHooks = {
  useState, useEffect,
  useRef(initial: unknown) { const root = active, i = root.cursor++; return root.slots[i] ??= { current: initial }; },
  useCallback(callback: unknown, deps: unknown[]) {
    const root = active, i = root.cursor++;
    const previous = root.slots[i] as { deps: unknown[]; callback: unknown } | undefined;
    if (!previous || !same(previous.deps, deps)) root.slots[i] = { deps, callback };
    return (root.slots[i] as { callback: unknown }).callback;
  },
  useSyncExternalStore(subscribe: (listener: () => void) => () => void, get: () => unknown, getServerSnapshot: () => unknown) {
    if (arguments.length !== 3 || typeof getServerSnapshot !== 'function') throw new Error('Expected the React external-store subscription and snapshot callbacks');
    const root = active, i = root.cursor++;
    root.slots[i] = get();
    useEffect(() => subscribe(() => {
      if (!Object.is(root.slots[i], get())) root.dirty = true;
    }), [subscribe, root, i, get]);
    return root.slots[i];
  },
};
export async function settle() {
  for (let i = 0; i < 30; i++) {
    await Promise.resolve();
    for (const root of roots) if (root.dirty) root.render();
  }
}
export function cleanup() { for (const root of roots) root.unmount(); }
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
