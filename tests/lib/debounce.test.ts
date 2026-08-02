import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce } from '../../src/lib/debounce';

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('coalesces rapid calls into one invocation after the wait', () => {
    const fn = vi.fn();
    const d = debounce(fn, 500);
    d.call();
    d.call();
    d.call();
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets the timer on each call', () => {
    const fn = vi.fn();
    const d = debounce(fn, 500);
    d.call();
    vi.advanceTimersByTime(300);
    d.call();
    vi.advanceTimersByTime(300);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancel prevents the pending call', () => {
    const fn = vi.fn();
    const d = debounce(fn, 500);
    d.call();
    d.cancel();
    vi.advanceTimersByTime(1000);
    expect(fn).not.toHaveBeenCalled();
  });

  it('passes through the latest call arguments', () => {
    const fn = vi.fn();
    const d = debounce(fn, 500);
    d.call('a');
    d.call('b');
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledWith('b');
  });
});
