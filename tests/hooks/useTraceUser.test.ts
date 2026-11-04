import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HookHarness, cleanup, deferred, settle } from './hookHarness';
import { useTraceUser } from '../../src/hooks/useTraceUser';
import { dashboardEligible, setDashboardIdentity } from '../../src/lib/dashboardAnalyticsCache';
vi.mock('react', async () => (await import('./hookHarness')).reactHooks);
const api = vi.hoisted(() => ({ session: vi.fn(), read: vi.fn(),
  event: null as null | ((event: string, session: { user: { id: string } } | null) => void) }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  auth: { getSession: () => api.session(), onAuthStateChange: (callback: typeof api.event) => {
    api.event = callback; return { data: { subscription: { unsubscribe() {} } } };
  } },
  from: () => { let id: string; const query = { select: () => query,
    eq: (_column: string, value: string) => { id = value; return query; }, single: () => api.read(id) }; return query; },
} }));
const session = (id: string) => ({ data: { session: { user: { id } } }, error: null });
const profile = (id: string, role = 'coach') => ({ data: { id, role, first_name: id }, error: null });
async function flush() { await settle(); await vi.advanceTimersByTimeAsync(0); await settle(); }
beforeEach(() => {
  vi.useFakeTimers(); setDashboardIdentity(null);
  api.session.mockReset().mockResolvedValue(session('a'));
  api.read.mockReset().mockImplementation((id: string) => Promise.resolve(profile(id)));
});
afterEach(() => { cleanup(); setDashboardIdentity(null); vi.useRealTimers(); });
it('loads and refreshes the profile after StrictMode effect replay', async () => {
  const hook = new HookHarness(useTraceUser); hook.replay(); await flush();
  expect(hook.current.profile?.id).toBe('a'); expect(dashboardEligible('a')).toBe(true);
  api.read.mockResolvedValue(profile('a', 'trainee'));
  await hook.current.refreshProfile(); await flush();
  expect(hook.current.isCoach).toBe(false); expect(dashboardEligible('a')).toBe(false);
});
it('clears the old profile immediately and rejects old profile responses after account switching', async () => {
  const hook = new HookHarness(useTraceUser); await flush();
  const old = deferred<ReturnType<typeof profile>>(); api.read.mockReturnValueOnce(old.promise);
  const refresh = hook.current.refreshProfile();
  api.event!('SIGNED_IN', { user: { id: 'b' } }); await settle();
  expect(hook.current.profile).toBeNull(); expect(dashboardEligible('a')).toBe(false);
  await flush(); expect(hook.current.profile?.id).toBe('b');
  old.resolve(profile('a')); await refresh; await flush();
  expect(hook.current.profile?.id).toBe('b'); expect(dashboardEligible('b')).toBe(true);
});
it('does not replace an auth event with a delayed initial session', async () => {
  const initial = deferred<ReturnType<typeof session>>(); api.session.mockReturnValue(initial.promise);
  const hook = new HookHarness(useTraceUser);
  api.event!('SIGNED_IN', { user: { id: 'b' } }); await flush();
  initial.resolve(session('a')); await flush();
  expect(hook.current.user?.id).toBe('b'); expect(hook.current.profile?.id).toBe('b');
});
it('clears eligibility on profile failure, missing/mismatched profile, and signout', async () => {
  const hook = new HookHarness(useTraceUser); await flush();
  api.read.mockRejectedValueOnce(new Error('Permission denied'));
  await hook.current.refreshProfile(); await flush();
  expect(hook.current.error?.message).toBe('Permission denied'); expect(hook.current.profile).toBeNull();
  expect(dashboardEligible('a')).toBe(false);
  api.read.mockResolvedValueOnce(profile('other'));
  await hook.current.refreshProfile(); await flush();
  expect(hook.current.profile).toBeNull(); expect(dashboardEligible('a')).toBe(false);
  await hook.current.refreshProfile(); await flush(); expect(dashboardEligible('a')).toBe(true);
  api.event!('SIGNED_OUT', null); await flush();
  expect(hook.current.profile).toBeNull(); expect(hook.current.user).toBeNull(); expect(dashboardEligible('a')).toBe(false);
});
it('ignores a delayed profile after signout and handles rejected session initialization', async () => {
  const wait = deferred<ReturnType<typeof profile>>(); api.read.mockReturnValue(wait.promise);
  const hook = new HookHarness(useTraceUser); await flush();
  api.event!('SIGNED_OUT', null); wait.resolve(profile('a')); await flush();
  expect(hook.current.profile).toBeNull(); expect(dashboardEligible('a')).toBe(false);
  hook.unmount(); api.session.mockRejectedValue(new Error('Storage failed'));
  const failed = new HookHarness(useTraceUser); await flush();
  expect(failed.current.isLoading).toBe(false); expect(failed.current.error?.message).toBe('Storage failed');
});
it('ignores an older overlapping refresh and clears cache eligibility on changed profile', async () => {
  const hook = new HookHarness(useTraceUser); await flush();
  const old = deferred<ReturnType<typeof profile>>(); api.read.mockReturnValueOnce(old.promise);
  const first = hook.current.refreshProfile();
  api.read.mockResolvedValueOnce(profile('a', 'trainee'));
  await hook.current.refreshProfile(); old.resolve(profile('a')); await first; await flush();
  expect(hook.current.profile?.role).toBe('trainee'); expect(dashboardEligible('a')).toBe(false);
});

it('clears eligibility when the authenticated shell unmounts', async () => {
  const hook = new HookHarness(useTraceUser); await flush();
  expect(dashboardEligible('a')).toBe(true);
  hook.unmount(); expect(dashboardEligible('a')).toBe(false);
});
