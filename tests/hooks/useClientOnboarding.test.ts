import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { HookHarness, cleanup, deferred, settle } from './hookHarness';
import { useClientOnboarding } from '../../src/hooks/useClientOnboarding';
vi.mock('react', async () => (await import('./hookHarness')).reactHooks);
const api = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: { rpc: (...args: unknown[]) => api.rpc(...args) } }));
const draft = { id: 'draft', trainee_id: 'a', invite_id: 'invite', coach_name: 'Coach', revision: 0, answers: {}, form_config: [{ k: 'name', e: true }], submitted_response_id: null };
beforeEach(() => api.rpc.mockReset().mockResolvedValue({ data: draft, error: null }));
afterEach(cleanup);
it('loads the owned snapshot, saves once for repeated taps and retains input after failure', async () => {
  const hook = new HookHarness(() => useClientOnboarding('a', 'invite', false)); await settle();
  hook.current.setAnswers({ name: 'Client' }); await settle();
  const response = deferred<{ data: unknown; error: null }>(); api.rpc.mockReturnValueOnce(response.promise);
  const first = hook.current.save(); expect(await hook.current.save()).toBe(false);
  expect(api.rpc).toHaveBeenCalledTimes(2);
  response.resolve({ data: { ...draft, revision: 1, answers: { name: 'Client' } }, error: null });
  expect(await first).toBe(true); await settle();
  api.rpc.mockRejectedValueOnce(new Error('Offline'));
  expect(await hook.current.save()).toBe(false); await settle();
  expect(hook.current.answers).toEqual({ name: 'Client' }); expect(hook.current.error).toBe('Offline');
});
it('retries an uncertain completion with exactly the same operation and revision', async () => {
  const hook = new HookHarness(() => useClientOnboarding('a', 'invite', false)); await settle();
  hook.current.setAnswers({ name: 'Client' }); await settle();
  api.rpc.mockResolvedValueOnce({ data: { ...draft, revision: 1 }, error: null }).mockRejectedValueOnce(new Error('Response lost'));
  expect(await hook.current.complete()).toBe(false); await settle();
  const request = api.rpc.mock.calls[2]; expect(hook.current.uncertain).toBe(true);
  hook.current.setAnswers({ name: 'Changed' }); await settle(); expect(hook.current.answers).toEqual({ name: 'Client' });
  api.rpc.mockResolvedValueOnce({ data: 'response', error: null });
  expect(await hook.current.complete()).toBe(true); await settle();
  expect(api.rpc.mock.calls[3]).toEqual(request); expect(hook.current.draft?.submitted_response_id).toBe('response');
});
it('ignores an old owner completion and loads only the new account draft', async () => {
  let user = 'a'; const hook = new HookHarness(() => useClientOnboarding(user, 'invite', false)); await settle();
  const wait = deferred<{ data: string; error: null }>();
  api.rpc.mockResolvedValueOnce({ data: { ...draft, revision: 1 }, error: null }).mockReturnValueOnce(wait.promise);
  const completing = hook.current.complete(); await settle();
  const oldActions = hook.current;
  user = 'b'; api.rpc.mockResolvedValueOnce({ data: { ...draft, id: 'b-draft', trainee_id: 'b' }, error: null }); hook.render(); await settle();
  const calls = api.rpc.mock.calls.length;
  expect(await oldActions.complete()).toBe(false); await oldActions.reload(); oldActions.setAnswers({ name: 'Old account data' }); await settle();
  expect(api.rpc).toHaveBeenCalledTimes(calls); expect(hook.current.answers).toEqual({});
  wait.resolve({ data: 'old-response', error: null }); expect(await completing).toBe(false); await settle();
  expect(hook.current.draft?.id).toBe('b-draft'); expect(hook.current.draft?.submitted_response_id).toBeNull();
});
it('rejects malformed or foreign returned drafts and retries loading', async () => {
  api.rpc.mockResolvedValueOnce({ data: { ...draft, trainee_id: 'foreign' }, error: null });
  const hook = new HookHarness(() => useClientOnboarding('a', 'invite', false)); await settle();
  expect(hook.current.draft).toBeNull(); expect(hook.current.error).toContain('Invalid onboarding');
  await hook.current.reload(); await settle(); expect(hook.current.draft?.id).toBe('draft');
});
it('preview never contacts the backend', async () => {
  const hook = new HookHarness(() => useClientOnboarding('a', 'invite', true)); await settle();
  expect(await hook.current.save()).toBe(true); expect(await hook.current.complete()).toBe(true); expect(api.rpc).not.toHaveBeenCalled();
});
it('retains the exact save request after response loss and only unlocks edits on recovery', async () => {
  const hook = new HookHarness(() => useClientOnboarding('a', 'invite', false)); await settle();
  hook.current.setAnswers({ name: 'Original' }); await settle();
  api.rpc.mockRejectedValueOnce(new Error('Lost save response'));
  expect(await hook.current.save()).toBe(false); await settle();
  const request = api.rpc.mock.calls[1];
  hook.current.setAnswers({ name: 'Replacement' }); await settle(); expect(hook.current.answers.name).toBe('Original');
  api.rpc.mockResolvedValueOnce({ data: { ...draft, revision: 1, answers: { name: 'Original' } }, error: null });
  expect(await hook.current.save()).toBe(true); await settle(); expect(api.rpc.mock.calls[2]).toEqual(request);
  hook.current.setAnswers({ name: 'Replacement' }); await settle(); expect(hook.current.answers.name).toBe('Replacement');
});
it('reloads correctly after React effect replay and ignores its canceled lookup', async () => {
  const wait = deferred<{ data: unknown; error: null }>(); api.rpc.mockReturnValueOnce(wait.promise);
  const hook = new HookHarness(() => useClientOnboarding('a', 'invite', false));
  hook.replay(); await settle(); expect(hook.current.draft?.id).toBe('draft');
  wait.resolve({ data: { ...draft, id: 'canceled' }, error: null }); await settle();
  expect(hook.current.draft?.id).toBe('draft');
});
