// Minimal debounce: delays invoking fn until `waitMs` have passed since the
// last call, coalescing a burst of calls into a single invocation with the
// latest arguments. Used to turn a flurry of realtime events into one
// roster refetch instead of one per event.

export interface Debounced<Args extends unknown[]> {
  call: (...args: Args) => void;
  cancel: () => void;
}

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): Debounced<Args> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    call: (...args: Args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn(...args);
      }, waitMs);
    },
    cancel: () => {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
