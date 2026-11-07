import { afterEach, describe, expect, it, vi } from 'vitest';
import { HookHarness, cleanup, deferred, settle } from './hookHarness';
import { useExercises } from '../../src/hooks/useExercises';

vi.mock('react', async () => (await import('./hookHarness')).reactHooks);
const api = vi.hoisted(() => ({ read: vi.fn(), calls: [] as { range: number[]; ilike?: unknown[]; or?: string; order: unknown[][] }[] }));
vi.mock('../../src/lib/supabase', () => ({ supabase: { from: () => {
  const trace: { range: number[]; ilike?: unknown[]; or?: string; order: unknown[][] } = { range: [], order: [] };
  api.calls.push(trace);
  const query = {
    select: () => query,
    or: (v: string) => { trace.or = v; return query; },
    ilike: (...v: unknown[]) => { trace.ilike = v; return query; },
    order: (...v: unknown[]) => { trace.order.push(v); return query; },
    range: (from: number, to: number) => { trace.range = [from, to]; return query; },
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => api.read(trace).then(resolve, reject),
  };
  return query;
} } }));

const row = (id: string) => ({ id, name: id, category: null, description: null, exercise_type: 'regular', movement_profile: null,
  exercise_position: null, is_bodyweight: false, is_unilateral: false, coaching_cues: null, equipment_tags: null, created_at: 'now', exercise_muscles: [] });

afterEach(() => { cleanup(); api.read.mockReset(); api.calls.length = 0; });

describe('exercise catalog paging', () => {
  it('requests bounded pages with stable ordering and merges the next page', async () => {
    api.read.mockResolvedValueOnce({ data: [row('a'), row('b')], error: null }).mockResolvedValueOnce({ data: [row('c')], error: null });
    const harness = new HookHarness(() => useExercises('coach-a'));
    await settle();
    expect(api.calls[0].range).toEqual([0, 49]);
    expect(api.calls[0].or).toContain('coach-a');
    expect(api.calls[0].order).toEqual([['name', { ascending: true }], ['id', { ascending: true }]]);
    expect(harness.current.exercises.map(x => x.id)).toEqual(['a', 'b']);
    expect(harness.current.hasMore).toBe(false); // a short page is terminal
  });

  it('escapes wildcard search literally and discards an obsolete response', async () => {
    const old = deferred<{ data: unknown[]; error: null }>();
    api.read.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ data: [row('new')], error: null });
    const harness = new HookHarness(() => useExercises('coach-a'));
    harness.current.setSearch('100%_\\');
    await settle();
    expect(api.calls.at(-1)?.ilike).toEqual(['name', '%100\\%\\_\\\\%']);
    old.resolve({ data: [row('stale')], error: null });
    await settle();
    expect(harness.current.exercises.map(x => x.id)).toEqual(['new']);
  });

  it('fetches a bounded second page on demand', async () => {
    api.read.mockResolvedValueOnce({ data: Array.from({ length: 50 }, (_, i) => row(`a${i}`)), error: null })
      .mockResolvedValueOnce({ data: [row('b')], error: null });
    const harness = new HookHarness(() => useExercises('coach-a'));
    await settle();
    expect(harness.current.hasMore).toBe(true);
    await harness.current.loadMore(); await settle();
    expect(api.calls[1].range).toEqual([50, 99]);
    expect(harness.current.exercises).toHaveLength(51);
    expect(harness.current.hasMore).toBe(false);
  });

  it('does not issue duplicate requests for same-frame load-more taps', async () => {
    const secondPage = deferred<{ data: unknown[]; error: null }>();
    api.read.mockResolvedValueOnce({ data: Array.from({ length: 50 }, (_, i) => row(`a${i}`)), error: null })
      .mockReturnValueOnce(secondPage.promise);
    const harness = new HookHarness(() => useExercises('coach-a'));
    await settle();
    const first = harness.current.loadMore();
    const duplicate = harness.current.loadMore();
    expect(api.calls).toHaveLength(2);
    secondPage.resolve({ data: [row('b')], error: null });
    await Promise.all([first, duplicate]); await settle();
    expect(harness.current.exercises).toHaveLength(51);
  });
});
