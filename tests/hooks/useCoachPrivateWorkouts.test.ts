import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HookHarness, cleanup, deferred, settle } from './hookHarness';
import { useCoachPrivateWorkouts } from '../../src/hooks/useCoachPrivateWorkouts';

vi.mock('react', async () => (await import('./hookHarness')).reactHooks);
const api = vi.hoisted(() => ({ read: vi.fn(), filters: [] as unknown[][] }));
vi.mock('../../src/lib/supabase', () => ({ supabase: { from: (table: string) => {
  let owner: string;
  const query = { select: () => query, eq: (column: string, value: string | boolean) => {
    api.filters.push([table, column, value]); if (column === 'creator_id') owner = value as string; return query;
  }, order: (column: string) => column === 'id' ? api.read(owner) : query };
  return query;
} } }));
const response = (name = 'Stored') => ({ data: [{ id: name, name, description: null, created_at: '2026-11-01',
  template_items: [{ position: 2, rest_seconds: 0 }, { position: 1, rest_seconds: 120 }] }], error: null });
beforeEach(() => { api.read.mockReset().mockResolvedValue(response()); api.filters.length = 0; });
afterEach(cleanup);

it('reads private active coach-owned items in stored position order on every mount/reload', async () => {
  const first = new HookHarness(() => useCoachPrivateWorkouts('coach')); await settle();
  expect(first.current.rows[0].template_items.map((item) => item.position)).toEqual([1, 2]);
  expect(api.filters).toEqual([['workout_templates', 'creator_id', 'coach'], ['workout_templates', 'scope', 'PRIVATE'], ['workout_templates', 'is_active', true]]);
  first.unmount(); new HookHarness(() => useCoachPrivateWorkouts('coach')); await settle();
  expect(api.read).toHaveBeenCalledTimes(2);
});
it('shows a failure rather than a false empty library and supports retry', async () => {
  api.read.mockResolvedValueOnce({ data: null, error: { message: 'Offline' } });
  const hook = new HookHarness(() => useCoachPrivateWorkouts('coach')); await settle();
  expect(hook.current.error).toBe('Offline'); expect(hook.current.loading).toBe(false);
  await hook.current.refresh(); await settle(); expect(hook.current.error).toBeNull(); expect(hook.current.rows).toHaveLength(1);
});
it('ignores stale reads during account switching, StrictMode replay and unmount', async () => {
  const old = deferred<ReturnType<typeof response>>(); api.read.mockReturnValueOnce(old.promise);
  let owner = 'a'; const hook = new HookHarness(() => useCoachPrivateWorkouts(owner));
  owner = 'b'; hook.render(); hook.replay(); await settle();
  old.resolve(response('foreign')); await settle(); expect(hook.current.rows[0].id).toBe('Stored');
  expect(api.read.mock.calls.map(([id]) => id)).toEqual(['a', 'b', 'b']);
  const pending = deferred<ReturnType<typeof response>>(); api.read.mockReturnValueOnce(pending.promise);
  void hook.current.refresh(); await settle(); hook.unmount(); const before = JSON.stringify(hook.slots);
  pending.resolve(response('late')); await settle(); expect(JSON.stringify(hook.slots)).toBe(before);
});
