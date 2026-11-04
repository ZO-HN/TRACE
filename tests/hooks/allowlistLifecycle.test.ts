import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HookHarness, cleanup, deferred, settle } from './hookHarness';
import { useCoachAllowlist } from '../../src/hooks/useCoachAllowlist';
vi.mock('react', async () => (await import('./hookHarness')).reactHooks);
const api = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: { from: (table: string) => {
  const q = { table, method: 'read', payload: undefined as unknown, filters: [] as unknown[][] };
  const query = { select: () => query, order: () => query, insert: (payload: unknown) => { q.method = 'insert'; q.payload = payload; return query; },
    delete: () => { q.method = 'delete'; return query; }, eq: (k: string, v: string) => { q.filters.push([k, v]); return query; },
    then: (done: (v: unknown) => unknown, fail: (e: unknown) => unknown) => Promise.resolve(q.method === 'read' ? api.read(q) : api.write(q)).then(done, fail) };
  return query;
} } }));
const result = (email: string) => ({ data: [{ email, note: null, created_at: '' }], error: null });
beforeEach(() => { api.read.mockReset().mockResolvedValue(result('a')); api.write.mockReset().mockResolvedValue({ error: null }); });
afterEach(cleanup);

// Actual AppShell branch execution with fixture identity; the existing Settings
// admin-only condition is checked against source below. This is not a router or
// React-renderer integration run and does not add an invented hook owner input.
type Auth = { isLoading: boolean; error: Error | null; profile: { id: string; role: string; is_platform_admin: boolean } | null; refreshProfile: () => Promise<void> };
type Element = { type: unknown; props: { children?: Element | Element[]; context?: unknown } };
function shellAllowsAdmin(auth: Auth) {
  const module = { exports: {} as { default?: () => Element } }, outlet = Symbol('Outlet');
  const jsx = (type: unknown, props: Element['props']) => ({ type, props });
  runInNewContext(ts.transpileModule(readFileSync('src/components/layout/AppShell.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, { module, exports: module.exports, require: (name: string) => {
    if (name === 'react') return { useMemo: (f: () => unknown) => f() };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react-router') return { Outlet: outlet, Navigate: 'Navigate', useLocation: () => ({ pathname: '/settings' }) };
    if (name === '@/hooks/useTraceUser') return { useTraceUser: () => auth };
    if (name === '@/config/nav') return { nav: { top: [], sections: [] } };
    return { __esModule: true, default: name, Loader2: 'Loader', AlertTriangle: 'Alert' };
  } });
  function hasOutlet(node: Element | Element[] | undefined): boolean {
    if (!node) return false;
    if (Array.isArray(node)) return node.some(hasOutlet);
    return node.type === outlet || hasOutlet(node.props?.children);
  }
  expect(readFileSync('src/components/pages/SettingsPage.tsx', 'utf8')).toContain("tab === 'coach-access' && profile.is_platform_admin && <CoachAccessTab");
  return hasOutlet(module.exports.default!()) && Boolean(auth.profile?.is_platform_admin);
}
const admin = (id: string): Auth => ({ isLoading: false, error: null, profile: { id, role: 'coach', is_platform_admin: true }, refreshProfile: async () => {} });

it('survives StrictMode replay and takes only the current request', async () => {
  const a = deferred<ReturnType<typeof result>>(), b = deferred<ReturnType<typeof result>>(); api.read.mockImplementationOnce(() => a.promise).mockImplementationOnce(() => b.promise);
  const h = new HookHarness(() => useCoachAllowlist()); h.replay(); b.resolve(result('b')); await settle(); expect(h.current.entries[0].email).toBe('b'); expect(h.current.isLoading).toBe(false);
  a.resolve(result('a')); await settle(); expect(h.current.entries[0].email).toBe('b');
});
it.each(['loading', 'signedout', 'trainee', 'nonadmin', 'error'])('replaces actual shell/admin lifetime on %s without late state or stale actions', async phase => {
  expect(shellAllowsAdmin(admin('a'))).toBe(true); const wait = deferred<ReturnType<typeof result>>(); api.read.mockImplementationOnce(() => wait.promise);
  const old = new HookHarness(() => useCoachAllowlist()), stale = old.current.addEmail;
  const auth = admin('b'); if (phase === 'loading') auth.isLoading = true; if (phase === 'signedout') auth.profile = null;
  if (phase === 'trainee') auth.profile!.role = 'trainee'; if (phase === 'nonadmin') auth.profile!.is_platform_admin = false; if (phase === 'error') auth.error = new Error('Session failed');
  expect(shellAllowsAdmin(auth)).toBe(false); old.unmount(); const before = JSON.stringify(old.slots);
  expect(shellAllowsAdmin(admin('b'))).toBe(true); api.read.mockResolvedValue(result('b')); const next = new HookHarness(() => useCoachAllowlist()); await settle();
  wait.resolve(result('a')); await settle(); expect(next.current.entries[0].email).toBe('b'); expect(JSON.stringify(old.slots)).toBe(before);
  expect((await stale('late', '', 'a')).error).toBeTruthy(); expect(api.write).not.toHaveBeenCalled();
});
it('does not reload a removed admin lifetime after an in-flight write completes', async () => {
  const h = new HookHarness(() => useCoachAllowlist()); await settle(); const write = deferred<{ error: null }>(); api.write.mockImplementation(() => write.promise);
  const pending = h.current.addEmail(' A@Example.test ', '', 'admin-a'); h.unmount(); const before = JSON.stringify(h.slots);
  api.read.mockResolvedValue(result('b')); const next = new HookHarness(() => useCoachAllowlist()); await settle(); write.resolve({ error: null }); await pending; await settle();
  expect(api.read).toHaveBeenCalledTimes(2); expect(JSON.stringify(h.slots)).toBe(before); expect(next.current.entries[0].email).toBe('b');
  expect(api.write.mock.calls[0][0].payload).toEqual({ email: 'a@example.test', note: null, invited_by: 'admin-a' });
});
it.each(['returned', 'thrown', 'rejected'])('settles %s read failures, retains successful data and retries', async mode => {
  const h = new HookHarness(() => useCoachAllowlist()); await settle();
  api.read.mockImplementation(() => { if (mode === 'thrown') throw new Error('Read failed'); return mode === 'returned' ? { data: null, error: { message: 'Read failed' } } : Promise.reject(new Error('Read failed')); });
  await h.current.refresh(); await settle(); expect(h.current.entries[0].email).toBe('a'); expect(h.current.error).toBe('Read failed'); expect(h.current.isLoading).toBe(false);
  api.read.mockResolvedValue(result('new')); await h.current.refresh(); await settle(); expect(h.current.error).toBeNull(); expect(h.current.entries[0].email).toBe('new');
});
for (const method of ['add', 'remove']) it.each(['returned', 'thrown', 'rejected'])(`${method} returns %s failures without post-write reads`, async mode => {
  const h = new HookHarness(() => useCoachAllowlist()); await settle();
  api.write.mockImplementation(() => { if (mode === 'thrown') throw new Error('Write failed'); return mode === 'returned' ? { error: { message: 'Write failed' } } : Promise.reject(new Error('Write failed')); });
  const action = method === 'add' ? () => h.current.addEmail('a', 'note', 'admin') : () => h.current.removeEmail('a');
  expect(await action()).toEqual({ error: 'Write failed' }); expect(api.read).toHaveBeenCalledTimes(1);
  api.write.mockResolvedValue({ error: null }); expect(await action()).toEqual({ error: null }); expect(api.read).toHaveBeenCalledTimes(2);
});
it('preserves delete email filter and distinguishes successful write from failed refresh', async () => {
  const h = new HookHarness(() => useCoachAllowlist()); await settle(); api.read.mockRejectedValue(new Error('Reload failed'));
  expect(await h.current.removeEmail('exact@example.test')).toEqual({ error: null }); await settle(); expect(h.current.error).toBe('Reload failed'); expect(h.current.isLoading).toBe(false);
  expect(api.write.mock.calls[0][0].filters).toEqual([['email', 'exact@example.test']]);
});

it.each(['returned', 'thrown', 'rejected'])('settles an initial %s allowlist read failure and recovers', async mode => {
  api.read.mockImplementationOnce(() => { if (mode === 'thrown') throw new Error('Initial failure'); return mode === 'returned' ? { data: null, error: { message: 'Initial failure' } } : Promise.reject(new Error('Initial failure')); });
  const h = new HookHarness(() => useCoachAllowlist()); await settle(); expect(h.current.entries).toEqual([]); expect(h.current.error).toBe('Initial failure'); expect(h.current.isLoading).toBe(false);
  await h.current.refresh(); await settle(); expect(h.current.error).toBeNull(); expect(h.current.entries[0].email).toBe('a');
});
it('uses the newest allowlist refresh while preserving the shell-owned instance', async () => {
  const h = new HookHarness(() => useCoachAllowlist()); await settle(); const a = deferred<ReturnType<typeof result>>(), b = deferred<ReturnType<typeof result>>();
  api.read.mockImplementationOnce(() => a.promise).mockImplementationOnce(() => b.promise); const first = h.current.refresh(), second = h.current.refresh();
  b.resolve(result('latest')); await second; await settle(); a.resolve(result('old')); await first; await settle(); expect(h.current.entries[0].email).toBe('latest');
});
