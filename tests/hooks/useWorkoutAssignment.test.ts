import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HookHarness, cleanup, deferred, settle } from './hookHarness';
import { useWorkoutAssignment } from '../../src/hooks/useWorkoutAssignment';
import type { PrivateWorkout } from '../../src/hooks/useCoachPrivateWorkouts';

vi.mock('react', async () => (await import('./hookHarness')).reactHooks);
const api = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => api.rpc(...args) } }));
const workout: PrivateWorkout = { id: 'source', name: 'Workout', description: null, created_at: '2026-11-05', template_items: [
  { id: 'i2', exercise_id: 'e1', position: 2, target_sets: 2, target_reps: 10, target_rpe: null, rest_seconds: 0, exercise: { id: 'e1', name: 'Squat' } },
  { id: 'i1', exercise_id: 'e1', position: 1, target_sets: 3, target_reps: 8, target_rpe: 7, rest_seconds: 120, exercise: { id: 'e1', name: 'Squat' } },
] };
beforeEach(() => { api.rpc.mockReset().mockImplementation(async (_name, payload) => ({ data: payload.p_assigned_template_id, error: null })); });
afterEach(cleanup);

it('sends a stable explicit assignment with the ordered source snapshot and coalesces taps', async () => {
  const wait = deferred<{ data: string; error: null }>(); api.rpc.mockReturnValue(wait.promise);
  const hook = new HookHarness(() => useWorkoutAssignment('coach', workout));
  const first = hook.current.assign('trainee');
  const second = hook.current.assign('trainee');
  expect(first).toBe(second); expect(api.rpc).toHaveBeenCalledTimes(1);
  const [name, payload] = api.rpc.mock.calls[0];
  expect(name).toBe('assign_workout_template');
  expect(payload.p_expected_snapshot.items.map((item: { position: number; rest_seconds: number }) => [item.position, item.rest_seconds])).toEqual([[1, 120], [2, 0]]);
  expect(payload.p_source_template_id).toBe('source'); expect(payload.p_trainee_id).toBe('trainee');
  wait.resolve({ data: payload.p_assigned_template_id, error: null });
  expect(await first).toBe(payload.p_assigned_template_id); await settle(); expect(hook.current.status).toBe('saved');
});

it('reuses IDs after an unknown response and retains an error for a stale or unauthorized snapshot', async () => {
  api.rpc.mockRejectedValueOnce(new Error('Response lost')).mockResolvedValueOnce({ data: null, error: { message: 'Source workout changed' } });
  const hook = new HookHarness(() => useWorkoutAssignment('coach', workout));
  expect(await hook.current.assign('trainee')).toBeNull(); await settle();
  await hook.current.assign('trainee'); await settle();
  expect(api.rpc.mock.calls[1][1].p_operation_id).toBe(api.rpc.mock.calls[0][1].p_operation_id);
  expect(api.rpc.mock.calls[1][1].p_assigned_template_id).toBe(api.rpc.mock.calls[0][1].p_assigned_template_id);
  expect(hook.current.error).toBe('Source workout changed');
  await hook.current.assign('other'); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(2);
});
