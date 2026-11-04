import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookHarness, cleanup, deferred, settle } from './hookHarness';
import { useFoods } from '../../src/hooks/useFoods';
import { useMeals } from '../../src/hooks/useMeals';
import { useMealPlans } from '../../src/hooks/useMealPlans';

vi.mock('react', async () => (await import('./hookHarness')).reactHooks);
const api = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  from: (table: string) => {
    let owner: string, columns: string;
    const query = {
      select: (value: string) => { columns = value; return query; },
      eq: (_column: string, value: string) => { owner = value; return query; },
      order: (column: string, options: unknown) => api.read(table, owner, columns, column, options),
      insert: (payload: unknown) => api.write('insert', table, payload),
      delete: () => ({ eq: (column: string, value: string) => api.write('delete', table, { column, value }) }),
    };
    return query;
  },
} }));

type Result = { error: string | null };
type View = { rows: unknown[]; isLoading: boolean; error: string | null; refresh: () => Promise<void>; create: () => Promise<Result>; remove?: () => Promise<Result> };
type Scenario = { table: string; columns: string; payload: object; hook: (owner: string) => View };
const food = { name: ' Food ', servingSize: '', calories: '0', protein: 'bad', carbs: '12.5', fat: '', recipe: '' };
const meal = { clientId: '', category: '', label: ' Lunch ', consumedAt: '', notes: 'note', foodIds: ['food-id'] };
const plan = { name: '', clientId: '', data: { meals: [{ id: 'meal-id' }] } };
const scenarios: Scenario[] = [
  { table: 'foods', columns: 'id, name, serving_size, calories, protein_g, carbs_g, fat_g, recipe, created_at',
    payload: { coach_id: 'a', name: ' Food ', serving_size: null, calories: 0, protein_g: null, carbs_g: 12.5, fat_g: null, recipe: null },
    hook: function useFoodsFixture(owner) { const value = useFoods(owner); return { ...value, rows: value.foods, create: () => value.createFood(food), remove: () => value.deleteFood('delete-id') }; } },
  { table: 'meals', columns: 'id, client_id, category, label, consumed_at, notes, food_ids, created_at',
    payload: { coach_id: 'a', client_id: null, category: null, label: ' Lunch ', consumed_at: null, notes: 'note', food_ids: ['food-id'] },
    hook: function useMealsFixture(owner) { const value = useMeals(owner); return { ...value, rows: value.meals, create: () => value.createMeal(meal) }; } },
  { table: 'meal_plans', columns: 'id, client_id, name, data, created_at',
    payload: { coach_id: 'a', client_id: null, name: 'Untitled plan', data: plan.data },
    hook: function useMealPlansFixture(owner) { const value = useMealPlans(owner); return { ...value, rows: value.mealPlans, create: () => value.createMealPlan(plan), remove: () => value.deleteMealPlan('delete-id') }; } },
];
const success = (id: string) => ({ data: [{ id }], error: null });
type ReadResult = { data: { id: string }[] | null; error: { message: string } | null };
beforeEach(() => {
  api.read.mockReset().mockImplementation(async (_table: string, owner: string) => success(owner));
  api.write.mockReset().mockResolvedValue({ error: null });
});
afterEach(cleanup);

describe.each(scenarios)('$table actual-hook lifecycle', (scenario) => {
  it('preserves read columns/filter/order and existing create payload/defaults', async () => {
    const hook = new HookHarness(() => scenario.hook('a')); await settle();
    expect(hook.current.rows).toEqual([{ id: 'a' }]); expect(hook.current.isLoading).toBe(false);
    expect(api.read).toHaveBeenCalledWith(scenario.table, 'a', scenario.columns, 'created_at', { ascending: false });
    expect(await hook.current.create()).toEqual({ error: null }); await settle();
    expect(api.write).toHaveBeenCalledWith('insert', scenario.table, scenario.payload);
    expect(api.read).toHaveBeenCalledTimes(2);
  });

  it('settles the current StrictMode setup and ignores the first setup response', async () => {
    const old = deferred<ReadResult>(), current = deferred<ReadResult>();
    api.read.mockImplementationOnce(() => old.promise).mockImplementationOnce(() => current.promise);
    const hook = new HookHarness(() => scenario.hook('a')); hook.replay();
    current.resolve(success('current')); await settle();
    expect(hook.current.rows).toEqual([{ id: 'current' }]); expect(hook.current.isLoading).toBe(false);
    old.resolve(success('old')); await settle(); expect(hook.current.rows).toEqual([{ id: 'current' }]);
  });

  it('immediately hides loaded A rows and errors on a switch to B', async () => {
    let owner = 'a'; const hook = new HookHarness(() => scenario.hook(owner)); await settle();
    const pending = deferred<ReadResult>(); api.read.mockImplementation(() => pending.promise);
    owner = 'b'; hook.render();
    expect(hook.current.rows).toEqual([]); expect(hook.current.error).toBeNull(); expect(hook.current.isLoading).toBe(true);
    pending.resolve({ data: null, error: { message: 'B failed' } }); await settle();
    expect(hook.current.rows).toEqual([]); expect(hook.current.error).toBe('B failed'); expect(hook.current.isLoading).toBe(false);
  });

  it('ignores A after out-of-order B success', async () => {
    let owner = 'a'; const a = deferred<ReadResult>(), b = deferred<ReadResult>();
    api.read.mockImplementation((_table: string, id: string) => id === 'a' ? a.promise : b.promise);
    const hook = new HookHarness(() => scenario.hook(owner)); owner = 'b'; hook.render();
    b.resolve(success('b')); await settle(); a.resolve(success('a')); await settle();
    expect(hook.current.rows).toEqual([{ id: 'b' }]); expect(hook.current.isLoading).toBe(false);
  });

  it('rejects old A lifecycle results after A to B to A', async () => {
    let owner = 'a'; const old = deferred<ReadResult>(); api.read.mockImplementationOnce(() => old.promise);
    const hook = new HookHarness(() => scenario.hook(owner)); owner = 'b'; hook.render(); await settle();
    owner = 'a'; hook.render(); await settle(); old.resolve(success('old-a')); await settle();
    expect(hook.current.rows).toEqual([{ id: 'a' }]);
  });

  it('does not let an old-account rejection settle the new load', async () => {
    let owner = 'a'; const a = deferred<ReadResult>(), b = deferred<ReadResult>();
    api.read.mockImplementation((_table: string, id: string) => id === 'a' ? a.promise : b.promise);
    const hook = new HookHarness(() => scenario.hook(owner)); owner = 'b'; hook.render();
    a.reject(new Error('Old account failed')); await settle();
    expect(hook.current.error).toBeNull(); expect(hook.current.isLoading).toBe(true);
    b.resolve(success('b')); await settle(); expect(hook.current.rows).toEqual([{ id: 'b' }]);
  });

  it('does not write state after read completion on an unmounted hook', async () => {
    const wait = deferred<ReadResult>(); api.read.mockImplementation(() => wait.promise);
    const hook = new HookHarness(() => scenario.hook('a')); hook.unmount(); const before = JSON.stringify(hook.slots);
    wait.resolve(success('late')); await settle(); expect(JSON.stringify(hook.slots)).toBe(before);
  });

  it.each(['returned', 'rejected', 'thrown'])('settles %s read failure and recovers on retry', async (mode) => {
    api.read.mockImplementationOnce(() => {
      if (mode === 'thrown') throw new Error('Read failed');
      return mode === 'returned' ? Promise.resolve({ data: null, error: { message: 'Read failed' } }) : Promise.reject(new Error('Read failed'));
    });
    const hook = new HookHarness(() => scenario.hook('a')); await settle();
    expect(hook.current.isLoading).toBe(false); expect(hook.current.error).toBe('Read failed');
    await hook.current.refresh(); await settle();
    expect(hook.current.rows).toEqual([{ id: 'a' }]); expect(hook.current.error).toBeNull();
  });

  it('keeps same-account data after refresh failure and accepts only the newest request', async () => {
    const hook = new HookHarness(() => scenario.hook('a')); await settle();
    api.read.mockRejectedValueOnce(new Error('Offline')); await hook.current.refresh(); await settle();
    expect(hook.current.rows).toEqual([{ id: 'a' }]); expect(hook.current.error).toBe('Offline');
    const old = deferred<ReadResult>(), latest = deferred<ReadResult>();
    api.read.mockImplementationOnce(() => old.promise).mockImplementationOnce(() => latest.promise);
    const first = hook.current.refresh(), second = hook.current.refresh();
    latest.resolve(success('latest')); await second; await settle();
    old.resolve(success('obsolete')); await first; await settle();
    expect(hook.current.rows).toEqual([{ id: 'latest' }]); expect(hook.current.error).toBeNull(); expect(hook.current.isLoading).toBe(false);
  });

  it('does not refresh A when a create completes while B is active', async () => {
    let owner = 'a'; const write = deferred<{ error: null }>(); api.write.mockImplementation(() => write.promise);
    const hook = new HookHarness(() => scenario.hook(owner)); await settle(); const action = hook.current.create();
    owner = 'b'; hook.render(); await settle(); write.resolve({ error: null }); expect(await action).toEqual({ error: null }); await settle();
    expect(api.read.mock.calls.map((args) => args[1])).toEqual(['a', 'b']); expect(hook.current.rows).toEqual([{ id: 'b' }]);
  });

  it('rejects an old create callback while another owner is active', async () => {
    let owner = 'a'; const hook = new HookHarness(() => scenario.hook(owner)); await settle(); const stale = hook.current.create;
    owner = 'b'; hook.render(); await settle();
    expect((await stale()).error).toBeTruthy(); expect(api.write).not.toHaveBeenCalled();
    expect(api.read).toHaveBeenCalledTimes(2);
  });

  it('does not refresh a later same-ID lifecycle after a create completes across A to B to A', async () => {
    let owner = 'a'; const write = deferred<{ error: null }>(); api.write.mockImplementation(() => write.promise);
    const hook = new HookHarness(() => scenario.hook(owner)); await settle(); const action = hook.current.create();
    owner = 'b'; hook.render(); await settle(); owner = 'a'; hook.render(); await settle();
    write.resolve({ error: null }); await action; await settle();
    expect(api.read.mock.calls.map((args) => args[1])).toEqual(['a', 'b', 'a']);
  });

  it('does not refresh or write state when creation completes after unmount', async () => {
    const write = deferred<{ error: null }>(); api.write.mockImplementation(() => write.promise);
    const hook = new HookHarness(() => scenario.hook('a')); await settle(); const action = hook.current.create();
    hook.unmount(); const before = JSON.stringify(hook.slots); write.resolve({ error: null }); await action; await settle();
    expect(api.read).toHaveBeenCalledTimes(1); expect(JSON.stringify(hook.slots)).toBe(before);
    expect((await hook.current.create()).error).toBeTruthy(); expect(api.write).toHaveBeenCalledTimes(1);
  });

  it.each(['returned', 'rejected', 'thrown'])('returns %s create failures and can recover', async (mode) => {
    const hook = new HookHarness(() => scenario.hook('a')); await settle();
    api.write.mockImplementationOnce(() => {
      if (mode === 'thrown') throw new Error('Write failed');
      return mode === 'returned' ? Promise.resolve({ error: { message: 'Write failed' } }) : Promise.reject(new Error('Write failed'));
    });
    expect(await hook.current.create()).toEqual({ error: 'Write failed' }); expect(api.read).toHaveBeenCalledTimes(1);
    expect(await hook.current.create()).toEqual({ error: null }); await settle(); expect(api.read).toHaveBeenCalledTimes(2);
  });

  it('keeps a committed create successful while exposing a failed reload separately', async () => {
    const hook = new HookHarness(() => scenario.hook('a')); await settle(); api.read.mockRejectedValueOnce(new Error('Reload failed'));
    expect(await hook.current.create()).toEqual({ error: null }); await settle();
    expect(hook.current.rows).toEqual([{ id: 'a' }]); expect(hook.current.error).toBe('Reload failed'); expect(hook.current.isLoading).toBe(false);
  });

  it('does not request or mutate with an empty owner and treats an empty read as success', async () => {
    let owner = ''; const hook = new HookHarness(() => scenario.hook(owner)); await settle();
    expect(hook.current.rows).toEqual([]); expect(hook.current.isLoading).toBe(false); expect(api.read).not.toHaveBeenCalled();
    expect((await hook.current.create()).error).toBeTruthy(); expect(api.write).not.toHaveBeenCalled();
    api.read.mockResolvedValueOnce({ data: null, error: null }); owner = 'a'; hook.render(); await settle();
    expect(hook.current.rows).toEqual([]); expect(hook.current.error).toBeNull(); expect(hook.current.isLoading).toBe(false);
  });
});

describe.each(scenarios.filter((scenario) => scenario.table !== 'meals'))('$table deletion lifecycle', (scenario) => {
  it('preserves delete filtering and refreshes the same active owner', async () => {
    const hook = new HookHarness(() => scenario.hook('a')); await settle();
    expect(await hook.current.remove!()).toEqual({ error: null }); await settle();
    expect(api.write).toHaveBeenCalledWith('delete', scenario.table, { column: 'id', value: 'delete-id' }); expect(api.read).toHaveBeenCalledTimes(2);
  });
  it('ignores late delete completion after account change and rejects stale delete callbacks', async () => {
    let owner = 'a'; const write = deferred<{ error: null }>(); api.write.mockImplementation(() => write.promise);
    const hook = new HookHarness(() => scenario.hook(owner)); await settle(); const stale = hook.current.remove!, action = stale();
    owner = 'b'; hook.render(); await settle();
    // Do not await an unintended second pending write when testing old code.
    const attempts = api.write.mock.calls.length; const rejected = stale(); await settle();
    expect(api.write).toHaveBeenCalledTimes(attempts); expect((await rejected).error).toBeTruthy();
    write.resolve({ error: null }); await action; await settle();
    expect(api.read).toHaveBeenCalledTimes(2); expect(hook.current.rows).toEqual([{ id: 'b' }]);
  });
  it.each(['returned', 'rejected', 'thrown'])('returns %s delete failures without reloading', async (mode) => {
    const hook = new HookHarness(() => scenario.hook('a')); await settle();
    api.write.mockImplementation(() => {
      if (mode === 'thrown') throw new Error('Delete failed');
      return mode === 'returned' ? Promise.resolve({ error: { message: 'Delete failed' } }) : Promise.reject(new Error('Delete failed'));
    });
    expect(await hook.current.remove!()).toEqual({ error: 'Delete failed' }); expect(api.read).toHaveBeenCalledTimes(1);
  });
});
