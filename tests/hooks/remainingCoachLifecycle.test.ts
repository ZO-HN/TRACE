import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HookHarness, cleanup, deferred, settle } from './hookHarness';
import { useClientTags } from '../../src/hooks/useClientTags';
import { useCheckInTemplates, DEFAULT_SCHEDULE } from '../../src/hooks/useCheckInTemplates';
import { useExercises } from '../../src/hooks/useExercises';
import { useEquipment } from '../../src/hooks/useEquipment';
import { useInviteLink } from '../../src/hooks/useInviteLink';
import { usePrograms } from '../../src/hooks/usePrograms';
import { useRoadmaps } from '../../src/hooks/useRoadmaps';
import { useVaultFolders } from '../../src/hooks/useVaultFolders';
import { useTrainingGroups } from '../../src/hooks/useTrainingGroups';

vi.mock('react', async () => (await import('./hookHarness')).reactHooks);
const api = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), rpc: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  from: (table: string) => {
    const trace = { table, method: 'read', payload: undefined as unknown, filters: [] as unknown[][], columns: '', or: '' };
    const query = {
      select: (columns: string) => { trace.columns = columns; return query; },
      eq: (column: string, value: unknown) => { trace.filters.push([column, value]); return query; },
      or: (value: string) => { trace.or = value; return query; },
      order: () => query, maybeSingle: () => query, single: () => query,
      range: () => query,
      insert: (payload: unknown) => { trace.method = 'insert'; trace.payload = payload; return query; },
      update: (payload: unknown) => { trace.method = 'update'; trace.payload = payload; return query; },
      delete: () => { trace.method = 'delete'; return query; },
      then: (done: (v: unknown) => unknown, fail: (e: unknown) => unknown) => Promise.resolve(trace.method === 'read' ? api.read(trace) : api.write(trace)).then(done, fail),
    };
    return query;
  }, rpc: (...args: unknown[]) => api.rpc(...args),
} }));
type Trace = { table: string; method: string; payload: unknown; filters: unknown[][]; columns: string; or: string };
type Read = { data: unknown; error: { message: string } | null };
type Result = { error: string | null };
type View = { ids: string[]; empty: boolean; isLoading: boolean; error: string | null; refresh: () => Promise<void>; actions: { name: string; run: () => Promise<Result> }[] };
type Case = { name: string; table: string; actionNames: string[]; useView: (owner: string) => View };
const input = { name: ' Item ', description: '', category: '' };
const schedule = { ...DEFAULT_SCHEDULE };
const exerciseInput = { name: 'Exercise', category: '', description: '', exerciseType: 'regular' as const, movementProfile: null, position: null,
  isBodyweight: false, isUnilateral: false, coachingCues: [], equipmentTags: [], primaryMuscles: [{ id: 'p', name: 'Primary' }], secondaryMuscles: [{ id: 's', name: 'Secondary' }] };
const cases: Case[] = [
  { name: 'tags', table: 'client_tags', actionNames: ['create', 'delete', 'assign', 'unassign'], useView: function useTagsFixture(owner) {
    const h = useClientTags(owner); return { ...h, ids: h.tags.map(r => r.id), empty: h.tags.length === 0 && h.assignmentsByClient.size === 0,
      actions: [{ name: 'create', run: () => h.createTag(' Tag ', 'red') }, { name: 'delete', run: () => h.deleteTag('x') }, { name: 'assign', run: () => h.assignTag('client', 'tag') }, { name: 'unassign', run: () => h.unassignTag('client', 'tag') }] };
  } },
  { name: 'templates', table: 'check_in_templates', actionNames: ['create', 'update', 'delete'], useView: function useTemplatesFixture(owner) {
    const h = useCheckInTemplates(owner), value = { ...input, questions: [], schedule }; return { ...h, ids: h.templates.map(r => r.id), empty: h.templates.length === 0,
      actions: [{ name: 'create', run: () => h.createTemplate(value) }, { name: 'update', run: () => h.updateTemplate('x', value) }, { name: 'delete', run: () => h.deleteTemplate('x') }] };
  } },
  { name: 'exercises', table: 'exercises', actionNames: ['create'], useView: function useExercisesFixture(owner) {
    const h = useExercises(owner); return { ...h, ids: h.exercises.map(r => r.id), empty: h.exercises.length === 0, actions: [{ name: 'create', run: () => h.createExercise(exerciseInput) }] };
  } },
  { name: 'equipment', table: 'equipment', actionNames: ['create', 'delete'], useView: function useEquipmentFixture(owner) {
    const h = useEquipment(owner); return { ...h, ids: h.equipment.map(r => r.id), empty: h.equipment.length === 0, actions: [{ name: 'create', run: () => h.createEquipment(input) }, { name: 'delete', run: () => h.deleteEquipment('x') }] };
  } },
  { name: 'invite', table: 'client_invites', actionNames: ['rotate', 'revoke'], useView: function useInviteFixture(owner) {
    const h = useInviteLink(owner); return { ...h, ids: h.invite ? [h.invite.id] : [], empty: h.invite === null, actions: [{ name: 'rotate', run: () => h.generateLink([{ key: 'name', enabled: true }] as Parameters<typeof h.generateLink>[0]) }, { name: 'revoke', run: h.revokeLink }] };
  } },
  { name: 'programs', table: 'programs', actionNames: ['create', 'delete'], useView: function useProgramsFixture(owner) {
    const h = usePrograms(owner); return { ...h, ids: h.programs.map(r => r.id), empty: h.programs.length === 0, actions: [{ name: 'create', run: () => h.createProgram(input) }, { name: 'delete', run: () => h.deleteProgram('x') }] };
  } },
  { name: 'roadmaps', table: 'roadmaps', actionNames: ['create', 'delete'], useView: function useRoadmapsFixture(owner) {
    const h = useRoadmaps(owner); return { ...h, ids: h.roadmaps.map(r => r.id), empty: h.roadmaps.length === 0, actions: [{ name: 'create', run: () => h.createRoadmap({ title: 'Roadmap', description: '', clientId: '', status: 'draft', startDate: '', targetEndDate: '' }) }, { name: 'delete', run: () => h.deleteRoadmap('x') }] };
  } },
  { name: 'vault', table: 'vault_folders', actionNames: ['create', 'delete'], useView: function useVaultFixture(owner) {
    const h = useVaultFolders(owner); return { ...h, ids: h.folders.map(r => r.id), empty: h.folders.length === 0, actions: [{ name: 'create', run: () => h.createFolder({ ...input, visibility: 'all', clientIds: ['unused'] }) }, { name: 'delete', run: () => h.deleteFolder('x') }] };
  } },
  { name: 'groups', table: 'training_groups', actionNames: ['create', 'delete', 'add', 'remove'], useView: function useGroupsFixture(owner) {
    const h = useTrainingGroups(owner); return { ...h, ids: h.groups.map(r => r.id), empty: h.groups.length === 0, actions: [{ name: 'create', run: () => h.createGroup({ ...input, programId: '' }) }, { name: 'delete', run: () => h.deleteGroup('x') }, { name: 'add', run: () => h.addMember('group', 'client') }, { name: 'remove', run: () => h.removeMember('group', 'client') }] };
  } },
];
function response(table: string, id: string): Read {
  const row = { id, name: id, color: 'red', created_at: '', schedule: null, client: { first_name: id, last_name: 'Client' }, program: { name: 'Program' }, training_group_members: [{ count: 2 }], coaching_cues: null, equipment_tags: null, exercise_muscles: [] };
  return { data: table === 'client_invites' ? row : [row], error: null };
}
function mainOwner(q: Trace) { return String(q.filters.find(f => f[0] === 'coach_id')?.[1] ?? q.or.match(/eq\.([^,]+)/)?.[1] ?? 'a'); }
function reads(table: string) { return api.read.mock.calls.filter(([q]) => q.table === table); }
beforeEach(() => {
  api.read.mockReset().mockImplementation((q: Trace) => q.table === 'client_tag_assignments'
    ? { data: ['a', 'b', 'old', 'latest'].map(id => ({ tag_id: id, client_id: 'client-' + id })), error: null }
    : response(q.table, mainOwner(q)));
  api.write.mockReset().mockResolvedValue({ data: { id: 'created' }, error: null });
  api.rpc.mockReset().mockResolvedValue({ data: null, error: null });
});
afterEach(cleanup);
function delayMain(c: Case, promise: Promise<Read>) { const fallback = api.read.getMockImplementation()!; api.read.mockImplementation((q: Trace) => q.table === c.table ? promise : fallback(q)); }

describe.each(cases)('$name actual-hook state lifecycle', c => {
  it('loads successfully through StrictMode replay and ignores the first setup result', async () => {
    const old = deferred<Read>(), next = deferred<Read>(); const fallback = api.read.getMockImplementation()!; let n = 0;
    api.read.mockImplementation((q: Trace) => q.table === c.table ? (++n === 1 ? old.promise : next.promise) : fallback(q));
    const h = new HookHarness(() => c.useView('a')); h.replay(); next.resolve(response(c.table, 'latest')); await settle();
    expect(h.current.ids).toEqual(['latest']); expect(h.current.isLoading).toBe(false);
    old.resolve(response(c.table, 'old')); await settle(); expect(h.current.ids).toEqual(['latest']);
  });
  it('hides old-owner data immediately and ignores out-of-order reads', async () => {
    let owner = 'a'; const h = new HookHarness(() => c.useView(owner)); await settle(); expect(h.current.ids).toEqual(['a']);
    const b = deferred<Read>(); delayMain(c, b.promise); owner = 'b'; h.render();
    expect(h.current.empty).toBe(true); expect(h.current.error).toBeNull(); expect(h.current.isLoading).toBe(true);
    b.resolve(response(c.table, 'b')); await settle(); expect(h.current.ids).toEqual(['b']);
  });
  it('rejects a late A result after B wins', async () => {
    let owner = 'a'; const old = deferred<Read>(), fallback = api.read.getMockImplementation()!;
    api.read.mockImplementation((q: Trace) => q.table === c.table && mainOwner(q) === 'a' ? old.promise : fallback(q));
    const h = new HookHarness(() => c.useView(owner)); owner = 'b'; h.render(); await settle();
    old.resolve(response(c.table, 'old')); await settle(); expect(h.current.ids).toEqual(['b']);
  });
  it('invalidates the first A scope after A to B to A', async () => {
    let owner = 'a'; const old = deferred<Read>(), fallback = api.read.getMockImplementation()!; let n = 0;
    api.read.mockImplementation((q: Trace) => q.table === c.table && n++ === 0 ? old.promise : fallback(q));
    const h = new HookHarness(() => c.useView(owner)); owner = 'b'; h.render(); await settle(); owner = 'a'; h.render(); await settle();
    old.resolve(response(c.table, 'old')); await settle(); expect(h.current.ids).toEqual(['a']);
  });
  it('ignores old rejection while the new owner remains loading', async () => {
    let owner = 'a'; const a = deferred<Read>(), b = deferred<Read>(), fallback = api.read.getMockImplementation()!;
    api.read.mockImplementation((q: Trace) => q.table === c.table ? (mainOwner(q) === 'a' ? a.promise : b.promise) : fallback(q));
    const h = new HookHarness(() => c.useView(owner)); owner = 'b'; h.render(); a.reject(new Error('Old failure')); await settle();
    expect(h.current.error).toBeNull(); expect(h.current.isLoading).toBe(true); b.resolve(response(c.table, 'b')); await settle();
  });
  it('does not update state after unmount', async () => {
    const old = deferred<Read>(); delayMain(c, old.promise); const h = new HookHarness(() => c.useView('a')); h.unmount(); const snapshot = JSON.stringify(h.slots);
    old.resolve(response(c.table, 'old')); await settle(); expect(JSON.stringify(h.slots)).toBe(snapshot);
  });
  it.each(['returned', 'thrown', 'rejected'])('catches %s read failure and retries', async mode => {
    const fallback = api.read.getMockImplementation()!;
    api.read.mockImplementation((q: Trace) => {
      if (q.table !== c.table) return fallback(q);
      if (mode === 'thrown') throw new Error('Read failed');
      return mode === 'returned' ? { data: null, error: { message: 'Read failed' } } : Promise.reject(new Error('Read failed'));
    });
    const h = new HookHarness(() => c.useView('a')); await settle(); expect(h.current.error).toBe('Read failed'); expect(h.current.isLoading).toBe(false);
    api.read.mockImplementation(fallback); await h.current.refresh(); await settle(); expect(h.current.ids).toEqual(['a']); expect(h.current.error).toBeNull();
  });
  it('preserves complete same-owner data on reload failure; newest refresh wins', async () => {
    const h = new HookHarness(() => c.useView('a')); await settle(); const fallback = api.read.getMockImplementation()!;
    api.read.mockImplementation((q: Trace) => q.table === c.table ? Promise.reject(new Error('Offline')) : fallback(q));
    await h.current.refresh(); await settle(); expect(h.current.ids).toEqual(['a']); expect(h.current.error).toBe('Offline');
    const a = deferred<Read>(), b = deferred<Read>(); let n = 0;
    api.read.mockImplementation((q: Trace) => q.table === c.table ? (++n === 1 ? a.promise : b.promise) : fallback(q));
    const first = h.current.refresh(), second = h.current.refresh(); b.resolve(response(c.table, 'latest')); await second; await settle();
    a.resolve(response(c.table, 'old')); await first; await settle(); expect(h.current.ids).toEqual(['latest']); expect(h.current.error).toBeNull();
  });
  it('accepts only the newest post-mutation reload when responses arrive out of order', async () => {
    const h = new HookHarness(() => c.useView('a')); await settle(); const fallback = api.read.getMockImplementation()!;
    const first = deferred<Read>(), second = deferred<Read>(); let n = 0;
    api.read.mockImplementation((q: Trace) => q.table === c.table ? (++n === 1 ? first.promise : second.promise) : fallback(q));
    const a = h.current.actions[0].run(), b = h.current.actions[0].run(); await settle();
    second.resolve(response(c.table, 'latest')); await b; await settle(); first.resolve(response(c.table, 'old')); await a; await settle();
    expect(h.current.ids).toEqual(['latest']); expect(h.current.error).toBeNull();
  });
  it('does not read or mutate an empty owner', async () => {
    const h = new HookHarness(() => c.useView('')); await settle(); expect(h.current.empty).toBe(true); expect(h.current.isLoading).toBe(false); expect(api.read).not.toHaveBeenCalled();
    for (const action of h.current.actions) expect((await action.run()).error).toBeTruthy(); expect(api.write).not.toHaveBeenCalled(); expect(api.rpc).not.toHaveBeenCalled();
  });
  for (const actionName of c.actionNames) describe(actionName, () => {
    it.each(['returned', 'thrown', 'rejected'])('returns %s operation failures without reloading', async mode => {
      const h = new HookHarness(() => c.useView('a')); await settle(); const count = reads(c.table).length;
      const fail = () => { if (mode === 'thrown') throw new Error('Write failed'); return mode === 'returned' ? { data: null, error: { message: 'Write failed' } } : Promise.reject(new Error('Write failed')); };
      api.write.mockImplementation(fail); api.rpc.mockImplementation(fail);
      expect(await h.current.actions.find(a => a.name === actionName)!.run()).toEqual({ error: 'Write failed' }); expect(reads(c.table)).toHaveLength(count);
      api.write.mockResolvedValue({ data: { id: 'created' }, error: null }); api.rpc.mockResolvedValue({ error: null });
      expect(await h.current.actions.find(a => a.name === actionName)!.run()).toEqual({ error: null }); await settle(); expect(reads(c.table)).toHaveLength(count + 1);
    });
    it('blocks stale callbacks and late owner reloads', async () => {
      let owner = 'a'; const h = new HookHarness(() => c.useView(owner)); await settle(); const stale = h.current.actions.find(a => a.name === actionName)!.run;
      const wait = deferred<{ data: { id: string }; error: null }>(); api.write.mockImplementation(() => wait.promise); api.rpc.mockImplementation(() => wait.promise);
      const pending = stale(); owner = 'b'; h.render(); await settle(); const count = reads(c.table).length, writes = api.write.mock.calls.length + api.rpc.mock.calls.length;
      const rejected = stale(); await settle(); expect(api.write.mock.calls.length + api.rpc.mock.calls.length).toBe(writes); expect((await rejected).error).toBeTruthy();
      wait.resolve({ data: { id: 'created' }, error: null }); await pending; await settle(); expect(reads(c.table)).toHaveLength(count); expect(h.current.ids).toEqual(['b']);
    });
  });
  it('does not reload an old mutation scope after A to B to A or unmount', async () => {
    let owner = 'a'; const h = new HookHarness(() => c.useView(owner)); await settle(); const wait = deferred<{ data: { id: string }; error: null }>();
    api.write.mockImplementation(() => wait.promise); api.rpc.mockImplementation(() => wait.promise); const pending = h.current.actions[0].run();
    owner = 'b'; h.render(); await settle(); owner = 'a'; h.render(); await settle(); const count = reads(c.table).length; h.unmount(); const snapshot = JSON.stringify(h.slots);
    wait.resolve({ data: { id: 'created' }, error: null }); await pending; await settle(); expect(reads(c.table)).toHaveLength(count); expect(JSON.stringify(h.slots)).toBe(snapshot);
  });
  it('keeps a committed operation successful while exposing a reload error', async () => {
    const h = new HookHarness(() => c.useView('a')); await settle(); const fallback = api.read.getMockImplementation()!;
    api.read.mockImplementation((q: Trace) => q.table === c.table ? { data: null, error: { message: 'Reload failed' } } : fallback(q));
    expect(await h.current.actions[0].run()).toEqual({ error: null }); await settle(); expect(h.current.error).toBe('Reload failed'); expect(h.current.ids).toEqual(['a']);
  });
});

it('keeps tag rows/assignment mapping together and retains both after a partial read failure', async () => {
  const h = new HookHarness(() => useClientTags('a')); await settle(); expect(h.current.assignmentsByClient.get('client-a')?.[0]).toEqual(h.current.tags[0]); expect(h.current.assignmentsByClient.has('client-b')).toBe(false);
  const oldMap = h.current.assignmentsByClient, fallback = api.read.getMockImplementation()!;
  api.read.mockImplementation((q: Trace) => q.table === 'client_tag_assignments' ? { data: null, error: { message: 'Assignments failed' } } : fallback(q));
  await h.current.refresh(); await settle(); expect(h.current.assignmentsByClient).toBe(oldMap); expect(h.current.tags[0].id).toBe('a'); expect(h.current.error).toBe('Assignments failed');
});
it('preserves template schedule fallback and roadmap/exercise/group mapping', async () => {
  api.read.mockImplementation((q: Trace) => ({ data: q.table === 'check_in_templates' ? [{ id: 'null', schedule: null }, { id: 'empty', schedule: {} }, { id: 'custom', schedule }]
    : q.table === 'exercises' ? [{ id: 'e', coaching_cues: null, equipment_tags: null, exercise_muscles: [{ role: 'primary', muscle_group: { id: 'm', name: 'Muscle' } }, { role: 'secondary', muscle_group: null }] }]
    : q.table === 'roadmaps' ? [{ id: 'r', client: { first_name: 'First', last_name: 'Last' } }] : [{ id: 'g', program: { name: 'Program' }, training_group_members: [{ count: 4 }] }], error: null }));
  const t = new HookHarness(() => useCheckInTemplates('a')), r = new HookHarness(() => useRoadmaps('a')), e = new HookHarness(() => useExercises('a')), g = new HookHarness(() => useTrainingGroups('a')); await settle();
  expect(t.current.templates.map(x => x.schedule)).toEqual([DEFAULT_SCHEDULE, DEFAULT_SCHEDULE, schedule]); expect(r.current.roadmaps[0].client_name).toBe('First Last');
  expect(e.current.exercises[0]).toMatchObject({ coaching_cues: [], equipment_tags: [], muscles: [{ id: 'm', name: 'Muscle', role: 'primary' }] }); expect(g.current.groups[0]).toMatchObject({ program_name: 'Program', member_count: 4 });
  expect(api.read.mock.calls.find(([q]) => q.table === 'exercises')![0].or).toBe('created_by_coach_id.eq.a,created_by_coach_id.is.null');
});
it('preserves no-active-invite versus error and rotate/revoke payloads', async () => {
  api.read.mockResolvedValue({ data: null, error: null }); const h = new HookHarness(() => useInviteLink('a')); await settle(); expect(h.current.invite).toBeNull(); expect(h.current.error).toBeNull(); expect(h.current.isLoading).toBe(false);
  const screens = [{ key: 'name', enabled: true }] as Parameters<typeof h.current.generateLink>[0]; await h.current.generateLink(screens); await h.current.revokeLink();
  expect(api.rpc.mock.calls).toEqual([['rotate_invite_link', { p_coach_id: 'a', p_screens_config: [{ k: 'name', e: true }] }], ['revoke_invite_link', { p_coach_id: 'a' }]]);
  api.read.mockResolvedValue({ data: null, error: { message: 'Unavailable' } }); await h.current.refresh(); await settle(); expect(h.current.invite).toBeNull(); expect(h.current.error).toBe('Unavailable');
});
it('refreshes membership count after add/remove and preserves member-id query', async () => {
  let count = 0; api.read.mockImplementation((q: Trace) => ({ data: q.table === 'training_group_members' ? [{ client_id: 'member' }] : [{ id: 'g', training_group_members: [{ count }] }], error: null }));
  const h = new HookHarness(() => useTrainingGroups('a')); await settle(); count = 1; await h.current.addMember('g', 'member'); await settle(); expect(h.current.groups[0].member_count).toBe(1);
  count = 0; await h.current.removeMember('g', 'member'); await settle(); expect(h.current.groups[0].member_count).toBe(0); expect(await h.current.fetchMemberIds('g')).toEqual({ memberIds: ['member'], error: null });
});
it('keeps exercise parent/link partial-write semantics and does not start links after an owner switch', async () => {
  let owner = 'a'; const h = new HookHarness(() => useExercises(owner)); await settle();
  api.write.mockImplementation((q: Trace) => q.table === 'exercise_muscles' ? { error: { message: 'Link failed' } } : { data: { id: 'created' }, error: null });
  expect(await h.current.createExercise(exerciseInput)).toEqual({ error: 'Link failed' }); expect(api.write.mock.calls.map(([q]) => q.table)).toEqual(['exercises', 'exercise_muscles']);
  expect(api.write.mock.calls[0][0].payload).toMatchObject({ created_by_coach_id: 'a', is_custom: true, target_muscle_group: 'Primary' });
  expect(api.write.mock.calls[1][0].payload).toEqual([{ exercise_id: 'created', muscle_group_id: 'p', role: 'primary' }, { exercise_id: 'created', muscle_group_id: 's', role: 'secondary' }]);
  const wait = deferred<{ data: { id: string }; error: null }>(); api.write.mockClear().mockImplementation(() => wait.promise); const pending = h.current.createExercise(exerciseInput);
  owner = 'b'; h.render(); await settle(); wait.resolve({ data: { id: 'created' }, error: null }); expect((await pending).error).toContain('may'); expect(api.write).toHaveBeenCalledTimes(1);
});

it('keeps an already complete no-link exercise write successful after an owner switch', async () => {
  let owner = 'a'; const h = new HookHarness(() => useExercises(owner)); await settle();
  const wait = deferred<{ data: { id: string }; error: null }>(); api.write.mockImplementation(() => wait.promise);
  const pending = h.current.createExercise({ ...exerciseInput, primaryMuscles: [], secondaryMuscles: [] });
  owner = 'b'; h.render(); await settle(); const count = reads('exercises').length;
  wait.resolve({ data: { id: 'created' }, error: null }); expect(await pending).toEqual({ error: null }); await settle();
  expect(api.write).toHaveBeenCalledTimes(1); expect(reads('exercises')).toHaveLength(count);
});
it.each(['returned', 'thrown', 'rejected'])('member-id read returns %s errors without rejecting', async mode => {
  const h = new HookHarness(() => useTrainingGroups('a')); await settle(); const fallback = api.read.getMockImplementation()!;
  api.read.mockImplementation((q: Trace) => { if (q.table !== 'training_group_members') return fallback(q); if (mode === 'thrown') throw new Error('Members failed'); return mode === 'returned' ? { data: null, error: { message: 'Members failed' } } : Promise.reject(new Error('Members failed')); });
  expect(await h.current.fetchMemberIds('g')).toEqual({ memberIds: [], error: 'Members failed' });
});
it('does not return old-account member IDs after the owner changes', async () => {
  let owner = 'a'; const h = new HookHarness(() => useTrainingGroups(owner)); await settle(); const fallback = api.read.getMockImplementation()!, wait = deferred<Read>();
  api.read.mockImplementation((q: Trace) => q.table === 'training_group_members' ? wait.promise : fallback(q)); const pending = h.current.fetchMemberIds('g');
  owner = 'b'; h.render(); await settle(); wait.resolve({ data: [{ client_id: 'old-member' }], error: null });
  expect(await pending).toMatchObject({ memberIds: [], error: expect.any(String) });
});
it('retains existing payload defaults and compound filters for the management operations', async () => {
  for (const c of cases.filter(c => c.name !== 'exercises')) {
    const h = new HookHarness(() => c.useView('a')); await settle(); for (const action of h.current.actions) await action.run(); h.unmount();
  }
  const writes = api.write.mock.calls.map(([q]) => q as Trace);
  expect(writes.find(q => q.table === 'client_tags' && q.method === 'insert')?.payload).toEqual({ coach_id: 'a', name: 'Tag', color: 'red' });
  expect(writes.find(q => q.table === 'client_tag_assignments' && q.method === 'delete')?.filters).toEqual([['client_id', 'client'], ['tag_id', 'tag']]);
  expect(writes.find(q => q.table === 'check_in_templates' && q.method === 'update')).toMatchObject({ payload: { name: ' Item ', description: null, questions: [], schedule }, filters: [['id', 'x']] });
  expect(writes.find(q => q.table === 'equipment' && q.method === 'insert')?.payload).toEqual({ coach_id: 'a', name: ' Item ', category: null });
  expect(writes.find(q => q.table === 'programs' && q.method === 'insert')?.payload).toEqual({ coach_id: 'a', name: ' Item ', description: null, category: null });
  expect(writes.find(q => q.table === 'roadmaps' && q.method === 'insert')?.payload).toMatchObject({ coach_id: 'a', title: 'Roadmap', client_id: null, description: null, status: 'draft', start_date: null, target_end_date: null });
  expect(writes.find(q => q.table === 'vault_folders' && q.method === 'insert')?.payload).toEqual({ coach_id: 'a', name: ' Item ', description: null, visibility: 'all', client_ids: [] });
  expect(writes.find(q => q.table === 'training_groups' && q.method === 'insert')?.payload).toEqual({ coach_id: 'a', name: ' Item ', description: null, program_id: null });
  expect(writes.find(q => q.table === 'training_group_members' && q.method === 'delete')?.filters).toEqual([['group_id', 'group'], ['client_id', 'client']]);
});
