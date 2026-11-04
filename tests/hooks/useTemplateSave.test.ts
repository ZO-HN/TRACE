import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HookHarness, cleanup, deferred, settle } from './hookHarness';
import { useTemplateSave } from '../../src/hooks/useTemplateSave';
import { emptyDraft } from '../../src/lib/templates/builder';

vi.mock('react', async () => (await import('./hookHarness')).reactHooks);
const api = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => api.rpc(...args) } }));
const draft = () => ({ ...emptyDraft(), name: 'Workout', items: [{ exerciseId: 'exercise', sets: '3', reps: '8', rpe: '', restSeconds: '90' }] });
beforeEach(() => { api.rpc.mockReset().mockImplementation(async (_name, payload) => ({ data: payload.p_template_id, error: null })); });
afterEach(cleanup);

it('coalesces repeated taps into one atomic RPC with a captured coach identity', async () => {
  const wait = deferred<{ data: string; error: null }>(); api.rpc.mockReturnValue(wait.promise);
  const hook = new HookHarness(useTemplateSave);
  const first = hook.current.save(draft(), 'coach');
  const second = hook.current.save(draft(), 'coach');
  expect(first).toBe(second); expect(api.rpc).toHaveBeenCalledTimes(1);
  expect(await hook.current.save(draft(), 'other-coach')).toBeNull();
  const [name, payload] = api.rpc.mock.calls[0];
  expect(name).toBe('save_workout_template'); expect(payload.p_creator_id).toBe('coach');
  expect(payload.p_operation_id).not.toBe(payload.p_template_id);
  wait.resolve({ data: payload.p_template_id, error: null });
  expect(await first).toBe(payload.p_template_id); await settle(); expect(hook.current.status).toBe('saved');
});
it('reuses both IDs and the payload after a lost response; a new confirmed draft gets new IDs', async () => {
  api.rpc.mockRejectedValueOnce(new Error('Response lost'));
  const hook = new HookHarness(useTemplateSave);
  expect(await hook.current.save(draft(), 'coach')).toBeNull(); await settle();
  expect(hook.current.error).toBe('Response lost');
  hook.current.reset(); await settle(); // An error must not discard retry identity.
  await hook.current.save(draft(), 'coach'); await settle();
  expect(api.rpc.mock.calls[1]).toEqual(api.rpc.mock.calls[0]);
  hook.current.reset(); await settle();
  await hook.current.save(draft(), 'coach');
  expect(api.rpc.mock.calls[2][1].p_template_id).not.toBe(api.rpc.mock.calls[0][1].p_template_id);
});
it('retains IDs when changed content is rejected and prevents changing the captured owner', async () => {
  api.rpc.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({ data: null, error: { message: 'Save ID already used for different content' } });
  const hook = new HookHarness(useTemplateSave);
  await hook.current.save(draft(), 'coach'); await settle();
  await hook.current.save({ ...draft(), name: 'Changed' }, 'coach'); await settle();
  expect(hook.current.error).toContain('different content');
  expect(api.rpc.mock.calls[1][1].p_operation_id).toBe(api.rpc.mock.calls[0][1].p_operation_id);
  await hook.current.save(draft(), 'other-coach'); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(2); expect(hook.current.error).toContain('Account changed');
});
it('rejects invalid/public drafts without a write, survives effect replay and ignores late completion after unmount', async () => {
  const hook = new HookHarness(useTemplateSave); hook.replay();
  await hook.current.save(emptyDraft(), 'coach'); await settle(); expect(api.rpc).not.toHaveBeenCalled();
  await hook.current.save({ ...draft(), scope: 'PUBLIC' }, 'coach'); await settle(); expect(api.rpc).not.toHaveBeenCalled();
  const wait = deferred<{ data: string; error: null }>(); api.rpc.mockReturnValue(wait.promise);
  const result = hook.current.save(draft(), 'coach'); await settle(); hook.unmount();
  const before = JSON.stringify(hook.slots.slice(0, 2));
  wait.resolve({ data: api.rpc.mock.calls[0][1].p_template_id, error: null });
  expect(await result).toBeNull(); await settle(); expect(JSON.stringify(hook.slots.slice(0, 2))).toBe(before);
  await hook.current.save(draft(), 'coach'); expect(api.rpc).toHaveBeenCalledTimes(1);
});
