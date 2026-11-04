import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HookHarness, cleanup, deferred, settle } from './hookHarness';
import { useDashboardStats } from '../../src/hooks/useDashboardStats';
import { setDashboardIdentity, verifyDashboardProfile } from '../../src/lib/dashboardAnalyticsCache';

vi.mock('react', async () => (await import('./hookHarness')).reactHooks);
const api = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => api.rpc(...args) } }));
const row = { new_signups_7d: 2, workouts_7d: 4, churned_count: 1 };
function response(name: string) { return { data: name === 'get_coach_dashboard_stats' ? row : [], error: null }; }
function authorize(id = 'a') { setDashboardIdentity(id); verifyDashboardProfile(id, { id, role: 'coach' }); }
let events: EventTarget;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(100_000);
  setDashboardIdentity(null);
  events = new EventTarget();
  vi.stubGlobal('window', Object.assign(events, { setInterval, clearInterval }));
  vi.stubGlobal('document', { visibilityState: 'visible' });
  api.rpc.mockReset().mockImplementation((name: string) => {
    const result = Promise.resolve(response(name));
    return Object.assign(result, { maybeSingle: () => result });
  });
  authorize();
});
afterEach(() => { cleanup(); setDashboardIdentity(null); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('counts 5 cold RPCs, 0 warm remount/focus RPCs, 5 expired RPCs and 5 explicit refresh RPCs', async () => {
  const cold = new HookHarness(() => useDashboardStats('a'));
  await settle();
  expect(api.rpc).toHaveBeenCalledTimes(5);
  expect(cold.current.stats?.workouts7d).toBe(4);
  cold.unmount();
  const warm = new HookHarness(() => useDashboardStats('a'));
  events.dispatchEvent(new Event('focus')); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(5);
  vi.setSystemTime(130_000);
  events.dispatchEvent(new Event('focus')); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(10);
  await warm.current.refresh(); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(15);
});
it('coalesces pending requests across remount, concurrent readers, focus, refresh and StrictMode replay', async () => {
  const wait = deferred<ReturnType<typeof response>>();
  api.rpc.mockImplementation((name: string) => {
    const result = name === 'get_coach_dashboard_stats' ? wait.promise : Promise.resolve(response(name));
    return Object.assign(result, { maybeSingle: () => result });
  });
  const first = new HookHarness(() => useDashboardStats('a'));
  first.replay(); await settle(); first.unmount();
  const second = new HookHarness(() => useDashboardStats('a'));
  new HookHarness(() => useDashboardStats('a'));
  void second.current.refresh(); events.dispatchEvent(new Event('focus')); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(5);
  wait.resolve(response('get_coach_dashboard_stats')); await settle();
  expect(second.current.isLoading).toBe(false);
  expect(second.current.stats?.newSignups7d).toBe(2);
});
it('retains only the complete same-account snapshot and timestamp on partial failure or rejection, then retries', async () => {
  const hook = new HookHarness(() => useDashboardStats('a')); await settle();
  const updatedAt = hook.current.updatedAt;
  vi.setSystemTime(131_000);
  api.rpc.mockImplementation((name: string) => {
    const result = Promise.resolve(name === 'get_coach_steps_summary' ? { data: null, error: { message: 'Offline' } } : response(name));
    return Object.assign(result, { maybeSingle: () => result });
  });
  await hook.current.refresh(); await settle();
  expect(hook.current.error).toBe('Offline');
  expect(hook.current.stats?.workouts7d).toBe(4);
  expect(hook.current.updatedAt).toBe(updatedAt);
  api.rpc.mockImplementation(() => { throw new Error('Transport failed'); });
  await hook.current.refresh(); await settle();
  expect(hook.current.error).toBe('Transport failed');
  expect(hook.current.updatedAt).toBe(updatedAt);
  api.rpc.mockImplementation((name: string) => { const result = Promise.resolve(response(name)); return Object.assign(result, { maybeSingle: () => result }); });
  await hook.current.refresh(); await settle();
  expect(hook.current.error).toBeNull(); expect(hook.current.updatedAt).toBe(131_000);
});
it('does not issue RPCs for an unverified account or show old-account data after a switch', async () => {
  const hook = new HookHarness(() => useDashboardStats('a')); await settle();
  setDashboardIdentity('b'); await settle();
  expect(hook.current.stats).toBeNull();
  const b = new HookHarness(() => useDashboardStats('b')); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(5);
  verifyDashboardProfile('b', { id: 'b', role: 'coach' }); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(10); expect(b.current.stats?.workouts7d).toBe(4);
  verifyDashboardProfile('b', { id: 'b', role: 'trainee' }); await settle();
  expect(b.current.stats).toBeNull(); await b.current.refresh();
  expect(api.rpc).toHaveBeenCalledTimes(10);
});
it('ignores a late old-generation result after signout and same-account sign-in', async () => {
  const wait = deferred<ReturnType<typeof response>>();
  api.rpc.mockImplementation((name: string) => {
    const result = name === 'get_coach_dashboard_stats' ? wait.promise : Promise.resolve(response(name));
    return Object.assign(result, { maybeSingle: () => result });
  });
  const hook = new HookHarness(() => useDashboardStats('a')); await settle();
  setDashboardIdentity(null); await settle();
  wait.resolve(response('get_coach_dashboard_stats')); await settle();
  expect(hook.current.stats).toBeNull(); expect(hook.current.updatedAt).toBeNull();
  authorize(); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(10);
});
it('reports first-read failure as unavailable and does not cache a missing stats row', async () => {
  api.rpc.mockImplementation(() => { const result = Promise.resolve({ data: null, error: null }); return Object.assign(result, { maybeSingle: () => result }); });
  const hook = new HookHarness(() => useDashboardStats('a')); await settle();
  expect(hook.current.isLoading).toBe(false); expect(hook.current.error).toContain('unavailable');
  expect(hook.current.updatedAt).toBeNull(); expect(hook.current.stats).toBeNull();
});
it('coalesces a visible timer and focus at expiry and skips polling while hidden', async () => {
  new HookHarness(() => useDashboardStats('a')); await settle();
  await vi.advanceTimersByTimeAsync(30_000); events.dispatchEvent(new Event('focus')); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(10);
  vi.stubGlobal('document', { visibilityState: 'hidden' });
  await vi.advanceTimersByTimeAsync(30_000); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(10);
});

it('starts when verification arrives on an empty cache and reloads on a changed coach profile', async () => {
  setDashboardIdentity('b');
  const hook = new HookHarness(() => useDashboardStats('b')); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(0);
  verifyDashboardProfile('b', { id: 'b', role: 'coach' }); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(5);
  const changed = { id: 'b', role: 'coach', first_name: 'Changed' };
  verifyDashboardProfile('b', changed); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(10); expect(hook.current.stats?.workouts7d).toBe(4);
});
it('reads an expired snapshot on remount and exposes updating while retaining its previous data', async () => {
  const first = new HookHarness(() => useDashboardStats('a')); await settle(); first.unmount();
  vi.setSystemTime(130_001);
  const wait = deferred<ReturnType<typeof response>>();
  api.rpc.mockImplementation((name: string) => {
    const result = name === 'get_coach_dashboard_stats' ? wait.promise : Promise.resolve(response(name));
    return Object.assign(result, { maybeSingle: () => result });
  });
  const warm = new HookHarness(() => useDashboardStats('a')); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(10);
  expect(warm.current.isUpdating).toBe(true); expect(warm.current.updatedAt).toBe(100_000);
  expect(warm.current.stats?.workouts7d).toBe(4);
  wait.resolve(response('get_coach_dashboard_stats')); await settle();
  expect(warm.current.isUpdating).toBe(false); expect(warm.current.updatedAt).toBe(130_001);
});
