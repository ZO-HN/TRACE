// Task-local state/effect runner for the actual hook; not a React renderer.
type Effect = { deps?: unknown[]; setup: () => void | (() => void); cleanup?: void | (() => void) };
let active: AiChatHarness<unknown>;
const roots = new Set<AiChatHarness<unknown>>();
const same = (a?: unknown[], b?: unknown[]) => a !== undefined && b !== undefined && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
export class AiChatHarness<T> {
  slots: unknown[] = [];
  effects = new Map<number, Effect>();
  queue: (() => void)[] = [];
  cursor = 0;
  dirty = true;
  current!: T;
  constructor(public hook: () => T) { roots.add(this as AiChatHarness<unknown>); this.render(); }
  render(commit = true) {
    active = this as AiChatHarness<unknown>;
    this.cursor = 0; this.dirty = false; this.current = this.hook();
    if (commit) this.commit();
  }
  commit() { for (const effect of this.queue.splice(0)) effect(); }
  replay() {
    for (const effect of this.effects.values()) if (typeof effect.cleanup === 'function') effect.cleanup();
    for (const effect of this.effects.values()) effect.cleanup = effect.setup();
  }
  unmount() {
    for (const effect of this.effects.values()) if (typeof effect.cleanup === 'function') effect.cleanup();
    roots.delete(this as AiChatHarness<unknown>);
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
    if (typeof previous?.cleanup === 'function') previous.cleanup();
    root.effects.set(i, { setup, deps, cleanup: setup() });
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
};
export async function settle() {
  for (let i = 0; i < 40; i++) {
    await Promise.resolve();
    for (const root of roots) if (root.dirty) root.render();
  }
}
export function cleanup() { for (const root of roots) root.unmount(); }
export function deferred<T>() {
  let resolve!: (value: T) => void; let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
