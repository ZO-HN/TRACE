import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HookHarness, cleanup, deferred, settle } from './hookHarness';
import { useClients, type ClientRow } from '../../src/hooks/useClients';

vi.mock('react', async () => (await import('./hookHarness')).reactHooks);
const api = vi.hoisted(() => ({ read: vi.fn(), rpc: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  from: () => {
    let owner: string;
    const query = { select: () => query, eq: (_column: string, value: string) => { owner = value; return query; },
      order: () => api.read(owner) };
    return query;
  },
  rpc: (...args: unknown[]) => api.rpc(...args),
} }));

const row = (id: string): ClientRow => ({ id, first_name: id, last_name: 'Fixture', email: `${id}@test.invalid`,
  created_at: '2026-10-31T00:00:00Z', manually_marked_churned: false });
const success = (id: string) => ({ data: [row(id)], error: null });
type ReadResult = { data: ClientRow[] | null; error: { message: string } | null };
beforeEach(() => {
  api.read.mockReset().mockImplementation(async (owner: string) => success(owner));
  api.rpc.mockReset().mockResolvedValue({ error: null });
});
afterEach(cleanup);

it('loads the roster and preserves the churn RPC payload before refreshing', async () => {
  const hook = new HookHarness(() => useClients('a')); await settle();
  expect(hook.current.clients).toEqual([row('a')]); expect(hook.current.isLoading).toBe(false);
  expect(await hook.current.setChurned('trainee', true)).toEqual({ error: null }); await settle();
  expect(api.rpc).toHaveBeenCalledWith('set_client_churned', { p_client_id: 'trainee', p_churned: true });
  expect(api.read.mock.calls).toEqual([['a'], ['a']]);
});

it('survives StrictMode setup/cleanup replay and ignores the first setup response', async () => {
  const first = deferred<ReadResult>(), second = deferred<ReadResult>();
  api.read.mockImplementationOnce(() => first.promise).mockImplementationOnce(() => second.promise);
  const hook = new HookHarness(() => useClients('a')); hook.replay();
  second.resolve(success('new')); await settle();
  expect(hook.current.isLoading).toBe(false); expect(hook.current.clients).toEqual([row('new')]);
  first.resolve(success('old')); await settle();
  expect(hook.current.clients).toEqual([row('new')]);
});

it('hides loaded coach A rows immediately when coach B starts loading', async () => {
  let owner = 'a'; const pending = deferred<ReadResult>();
  const hook = new HookHarness(() => useClients(owner)); await settle();
  api.read.mockImplementation(() => pending.promise);
  owner = 'b'; hook.render();
  expect(hook.current.clients).toEqual([]); expect(hook.current.error).toBeNull(); expect(hook.current.isLoading).toBe(true);
  pending.resolve({ data: null, error: { message: 'B unavailable' } }); await settle();
  expect(hook.current.clients).toEqual([]); expect(hook.current.error).toBe('B unavailable'); expect(hook.current.isLoading).toBe(false);
});

it('ignores out-of-order responses after coach A switches to B', async () => {
  let owner = 'a'; const a = deferred<ReadResult>(), b = deferred<ReadResult>();
  api.read.mockImplementation((id: string) => id === 'a' ? a.promise : b.promise);
  const hook = new HookHarness(() => useClients(owner));
  owner = 'b'; hook.render(); b.resolve(success('b')); await settle();
  a.resolve(success('a')); await settle();
  expect(hook.current.clients).toEqual([row('b')]); expect(hook.current.isLoading).toBe(false);
});

it('rejects old same-coach generations after A to B to A', async () => {
  let owner = 'a'; const old = deferred<ReadResult>();
  api.read.mockImplementationOnce(() => old.promise);
  const hook = new HookHarness(() => useClients(owner));
  owner = 'b'; hook.render(); await settle(); owner = 'a'; hook.render(); await settle();
  old.resolve(success('old-a')); await settle();
  expect(hook.current.clients).toEqual([row('a')]);
});

it('does not let an old-coach failure settle the new roster load', async () => {
  let owner = 'a'; const a = deferred<ReadResult>(), b = deferred<ReadResult>();
  api.read.mockImplementation((id: string) => id === 'a' ? a.promise : b.promise);
  const hook = new HookHarness(() => useClients(owner)); owner = 'b'; hook.render();
  a.resolve({ data: null, error: { message: 'Old account failed' } }); await settle();
  expect(hook.current.error).toBeNull(); expect(hook.current.isLoading).toBe(true);
  b.resolve(success('b')); await settle(); expect(hook.current.clients).toEqual([row('b')]);
});

it('does not write state when a read completes after unmount', async () => {
  const wait = deferred<ReadResult>(); api.read.mockImplementation(() => wait.promise);
  const hook = new HookHarness(() => useClients('a')); hook.unmount();
  const before = JSON.stringify(hook.slots);
  wait.resolve(success('late')); await settle();
  expect(JSON.stringify(hook.slots)).toBe(before);
});

it.each(['returned', 'rejected', 'thrown'])('settles a %s read failure and can retry', async (mode) => {
  api.read.mockImplementationOnce(() => {
    if (mode === 'thrown') throw new Error('Read failed');
    if (mode === 'rejected') return Promise.reject(new Error('Read failed'));
    return Promise.resolve({ data: null, error: { message: 'Read failed' } });
  });
  const hook = new HookHarness(() => useClients('a')); await settle();
  expect(hook.current.isLoading).toBe(false); expect(hook.current.error).toBe('Read failed');
  await hook.current.refresh(); await settle();
  expect(hook.current.error).toBeNull(); expect(hook.current.clients).toEqual([row('a')]);
});

it('preserves same-coach rows on refresh failure and lets the newest refresh win', async () => {
  const hook = new HookHarness(() => useClients('a')); await settle();
  api.read.mockResolvedValueOnce({ data: null, error: { message: 'Offline' } });
  await hook.current.refresh(); await settle();
  expect(hook.current.clients).toEqual([row('a')]); expect(hook.current.error).toBe('Offline');
  const old = deferred<ReadResult>(), latest = deferred<ReadResult>();
  api.read.mockImplementationOnce(() => old.promise).mockImplementationOnce(() => latest.promise);
  const oldRead = hook.current.refresh(), newRead = hook.current.refresh();
  latest.resolve(success('latest')); await newRead; await settle();
  old.resolve({ data: null, error: { message: 'Obsolete failure' } }); await oldRead; await settle();
  expect(hook.current.clients).toEqual([row('latest')]); expect(hook.current.error).toBeNull(); expect(hook.current.isLoading).toBe(false);
});

it('does not refresh coach A after a churn RPC completes while B is active', async () => {
  let owner = 'a'; const update = deferred<{ error: null }>(); api.rpc.mockImplementation(() => update.promise);
  const hook = new HookHarness(() => useClients(owner)); await settle();
  const action = hook.current.setChurned('trainee-a', true);
  owner = 'b'; hook.render(); await settle(); update.resolve({ error: null }); await action; await settle();
  expect(api.read.mock.calls).toEqual([['a'], ['b']]); expect(hook.current.clients).toEqual([row('b')]);
});

it('does not refresh an obsolete lifecycle when a churn RPC finishes after A to B to A', async () => {
  let owner = 'a'; const update = deferred<{ error: null }>(); api.rpc.mockImplementation(() => update.promise);
  const hook = new HookHarness(() => useClients(owner)); await settle();
  const action = hook.current.setChurned('trainee-a', true);
  owner = 'b'; hook.render(); await settle(); owner = 'a'; hook.render(); await settle();
  update.resolve({ error: null }); await action; await settle();
  expect(api.read.mock.calls).toEqual([['a'], ['b'], ['a']]);
});

it('does not refresh after unmount or invoke an old coach action while another coach is active', async () => {
  let owner = 'a'; const update = deferred<{ error: null }>(); api.rpc.mockImplementation(() => update.promise);
  const hook = new HookHarness(() => useClients(owner)); await settle();
  const stale = hook.current.setChurned, action = stale('trainee-a', true);
  owner = 'b'; hook.render(); await settle();
  expect((await stale('other', true)).error).toBeTruthy(); expect(api.rpc).toHaveBeenCalledTimes(1);
  hook.unmount(); const before = JSON.stringify(hook.slots);
  update.resolve({ error: null }); await action; await settle();
  expect(api.read).toHaveBeenCalledTimes(2); expect(JSON.stringify(hook.slots)).toBe(before);
});

it.each(['returned', 'rejected'])('returns a %s churn failure without claiming success or refreshing', async (mode) => {
  const hook = new HookHarness(() => useClients('a')); await settle();
  api.rpc.mockImplementation(() => mode === 'returned' ? Promise.resolve({ error: { message: 'Not allowed' } }) : Promise.reject(new Error('Not allowed')));
  expect(await hook.current.setChurned('trainee', true)).toEqual({ error: 'Not allowed' });
  expect(api.read).toHaveBeenCalledTimes(1);
});

it('treats no coach as an empty idle roster and does not issue requests', async () => {
  const hook = new HookHarness(() => useClients('')); await settle();
  expect(hook.current.clients).toEqual([]); expect(hook.current.isLoading).toBe(false);
  expect(api.read).not.toHaveBeenCalled();
  expect((await hook.current.setChurned('trainee', true)).error).toBeTruthy(); expect(api.rpc).not.toHaveBeenCalled();
});
