import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AiChatHarness, cleanup, deferred, settle } from './aiChatHarness';
import { useAiChat } from '../../src/hooks/useAiChat';
import type { AiMessage } from '../../src/lib/chat/aiTypes';
vi.mock('react', async () => (await import('./aiChatHarness')).reactHooks);
const api = vi.hoisted(() => ({ lookup: vi.fn(), create: vi.fn(), history: vi.fn(), insert: vi.fn(), invoke: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({ supabase: {
  from: (table: string) => {
    const filters: Record<string, string> = {}; let row: Record<string, string>;
    const query = {
      select: () => query, insert: (value: Record<string, string>) => { row = value; return query; },
      eq: (key: string, value: string) => { filters[key] = value; return query; }, order: () => query, limit: () => query,
      maybeSingle: () => api.lookup(filters.user_id),
      single: () => table === 'ai_chat_sessions' ? api.create(row.user_id) : api.insert(row),
      then: (resolve: (value: unknown) => unknown, reject: (cause: unknown) => unknown) => api.history(filters.session_id).then(resolve, reject),
    }; return query;
  }, functions: { invoke: (...args: unknown[]) => api.invoke(...args) },
} }));
const ok = <T>(data: T) => ({ data, error: null });
const failure = (message: string) => ({ data: null, error: { message } });
function message(id: string, session = 'session-a', sender: 'USER' | 'ASSISTANT' = 'USER'): AiMessage {
  return { id, session_id: session, sender, content: id, created_at: '2026-11-01T01:00:00Z' };
}
beforeEach(() => {
  api.lookup.mockReset().mockImplementation((owner: string) => Promise.resolve(ok({ id: 'session-' + owner })));
  api.create.mockReset().mockImplementation((owner: string) => Promise.resolve(ok({ id: 'new-' + owner })));
  api.history.mockReset().mockImplementation((session: string) => Promise.resolve(ok([message('history', session)])));
  api.insert.mockReset().mockImplementation((row: { session_id: string; content: string }) => Promise.resolve(ok({ ...message('user-' + row.content, row.session_id), content: row.content })));
  api.invoke.mockReset().mockImplementation((_name: string, input: { body: { sessionId: string; content: string } }) => Promise.resolve(ok({ message: message('reply-' + input.body.content, input.body.sessionId, 'ASSISTANT') })));
});
afterEach(cleanup);
async function ready() { const hook = new AiChatHarness(() => useAiChat('a')); await settle(); return hook; }

it('loads the complete original history shape after setup replay and New works', async () => {
  const history = [message('one'), message('two', 'session-a', 'ASSISTANT')];
  api.history.mockResolvedValue(ok(history));
  const hook = new AiChatHarness(() => useAiChat('a')); hook.replay(); await settle();
  expect(hook.current.messages).toEqual(history); expect(hook.current.isReady).toBe(true);
  expect(api.lookup).toHaveBeenCalledTimes(1);
  await hook.current.startNewConversation(); await settle();
  expect(api.create).toHaveBeenCalledTimes(1); expect(hook.current.messages).toEqual([]); expect(hook.current.isReady).toBe(true);
  await hook.current.send('hello'); await settle();
  expect(api.insert).toHaveBeenLastCalledWith({ session_id: 'new-a', sender: 'USER', content: 'hello' });
  expect(api.invoke).toHaveBeenLastCalledWith('trace-brain', { body: { sessionId: 'new-a', content: 'hello' } });
});
it('creates only when a successful lookup has no session', async () => {
  api.lookup.mockResolvedValue(ok(null));
  const hook = await ready();
  expect(api.create).toHaveBeenCalledWith('a'); expect(api.history).toHaveBeenCalledWith('new-a'); expect(hook.current.isReady).toBe(true);
});
it('canceled replay lookup cannot create a session after it resolves', async () => {
  const old = deferred<ReturnType<typeof ok>>(); api.lookup.mockReturnValueOnce(old.promise);
  const hook = new AiChatHarness(() => useAiChat('a')); await settle(); hook.replay(); await settle();
  old.resolve(ok(null)); await settle();
  expect(api.create).not.toHaveBeenCalled(); expect(hook.current.isReady).toBe(true);
});
for (const mode of ['error', 'rejection'] as const) {
  it(`lookup ${mode} is visible and never falls through to session creation`, async () => {
    if (mode === 'error') api.lookup.mockResolvedValue(failure('Lookup failed')); else api.lookup.mockRejectedValue(new Error('Lookup failed'));
    const hook = await ready(); expect(hook.current.error).toBe('Lookup failed'); expect(hook.current.isReady).toBe(false);
    expect(api.create).not.toHaveBeenCalled(); expect(api.history).not.toHaveBeenCalled();
  });
  it(`history ${mode} is a visible failure rather than ready empty success`, async () => {
    if (mode === 'error') api.history.mockResolvedValue(failure('History failed')); else api.history.mockRejectedValue(new Error('History failed'));
    const hook = await ready(); expect(hook.current.error).toBe('History failed'); expect(hook.current.isReady).toBe(false);
    await hook.current.send('blocked'); expect(api.insert).not.toHaveBeenCalled();
  });
  it(`initial create ${mode} settles readiness and supports recovery through New`, async () => {
    api.lookup.mockResolvedValue(ok(null));
    if (mode === 'error') api.create.mockResolvedValueOnce(failure('Create failed')); else api.create.mockRejectedValueOnce(new Error('Create failed'));
    const hook = await ready(); expect(hook.current.error).toBe('Create failed'); expect(hook.current.isReady).toBe(false);
    await hook.current.startNewConversation(); await settle(); expect(hook.current.isReady).toBe(true); expect(hook.current.error).toBeNull();
  });
  it(`New ${mode} preserves the previous usable conversation and can retry`, async () => {
    const hook = await ready();
    if (mode === 'error') api.create.mockResolvedValueOnce(failure('New failed')); else api.create.mockRejectedValueOnce(new Error('New failed'));
    await hook.current.startNewConversation(); await settle();
    expect(hook.current.error).toBe('New failed'); expect(hook.current.isReady).toBe(true); expect(hook.current.messages[0].id).toBe('history');
    await hook.current.startNewConversation(); await settle(); expect(hook.current.error).toBeNull(); expect(hook.current.messages).toEqual([]);
  });
  it(`user message insert ${mode} settles thinking without invoking the function`, async () => {
    const hook = await ready();
    if (mode === 'error') api.insert.mockResolvedValue(failure('Insert failed')); else api.insert.mockRejectedValue(new Error('Insert failed'));
    await hook.current.send('hello'); await settle();
    expect(hook.current.error).toBe('Insert failed'); expect(hook.current.isThinking).toBe(false); expect(api.invoke).not.toHaveBeenCalled();
  });
  it(`invoke ${mode} retains the acknowledged user message and settles thinking`, async () => {
    const hook = await ready();
    if (mode === 'error') api.invoke.mockResolvedValue(failure('Invoke failed')); else api.invoke.mockRejectedValue(new Error('Invoke failed'));
    await hook.current.send('hello'); await settle();
    expect(hook.current.messages.some(m => m.content === 'hello')).toBe(true); expect(hook.current.error).toBe('Invoke failed'); expect(hook.current.isThinking).toBe(false);
  });
}
it('coalesces overlapping New requests into one server insertion', async () => {
  const hook = await ready(); const wait = deferred<ReturnType<typeof ok>>(); api.create.mockReturnValue(wait.promise);
  const first = hook.current.startNewConversation(); const second = hook.current.startNewConversation(); await settle();
  expect(first).toBe(second); expect(api.create).toHaveBeenCalledTimes(1); expect(hook.current.isReady).toBe(false);
  wait.resolve(ok({ id: 'new' })); await first; await settle(); expect(hook.current.isReady).toBe(true);
});
it('serializes distinct sends, coalesces duplicate pending text, and waits before New', async () => {
  const hook = await ready(); const wait = deferred<ReturnType<typeof ok>>(); api.invoke.mockReturnValueOnce(wait.promise);
  const first = hook.current.send('first'); const duplicate = hook.current.send(' first '); const second = hook.current.send('second');
  const next = hook.current.startNewConversation(); await settle();
  expect(first).toBe(duplicate); expect(api.insert).toHaveBeenCalledTimes(1); expect(api.create).not.toHaveBeenCalled();
  expect(hook.current.isReady).toBe(false); expect(hook.current.isThinking).toBe(true);
  wait.resolve(ok({ message: message('old-reply', 'session-a', 'ASSISTANT') })); await Promise.all([first, second, next]); await settle();
  expect(api.insert.mock.calls.map(([row]) => row.content)).toEqual(['first', 'second']);
  expect(api.create).toHaveBeenCalledTimes(1); expect(hook.current.messages).toEqual([]); expect(hook.current.isThinking).toBe(false);
  await hook.current.send('new'); expect(api.insert).toHaveBeenLastCalledWith({ session_id: 'new-a', sender: 'USER', content: 'new' });
});
it('New supersedes initialization and late history cannot replace the new conversation', async () => {
  const wait = deferred<ReturnType<typeof ok>>(); api.history.mockReturnValueOnce(wait.promise);
  const hook = new AiChatHarness(() => useAiChat('a')); await settle();
  await hook.current.startNewConversation(); await settle();
  wait.resolve(ok([message('old-history')])); await settle();
  expect(hook.current.messages).toEqual([]); expect(hook.current.isReady).toBe(true);
});
it('hides owner A before effects, rejects A-B-A late replies and stale handlers', async () => {
  let owner = 'a'; const hook = new AiChatHarness(() => useAiChat(owner)); await settle();
  const staleSend = hook.current.send; const staleNew = hook.current.startNewConversation;
  const wait = deferred<ReturnType<typeof ok>>(); api.invoke.mockReturnValueOnce(wait.promise);
  const pending = hook.current.send('old'); await settle();
  owner = 'b'; hook.render(false); expect(hook.current.messages).toEqual([]); expect(hook.current.isReady).toBe(false); hook.commit(); await settle();
  expect(hook.current.messages[0].session_id).toBe('session-b');
  owner = 'a'; hook.render(); await settle();
  wait.resolve(ok({ message: message('late-old-reply', 'session-a', 'ASSISTANT') })); await pending; await settle();
  expect(hook.current.messages.map(m => m.id)).toEqual(['history']); expect(hook.current.isThinking).toBe(false);
  const writes = api.insert.mock.calls.length; await staleSend('stale'); await staleNew();
  expect(api.insert).toHaveBeenCalledTimes(writes); expect(api.create).not.toHaveBeenCalled();
});
it('late user insertion after owner switch does not start a function request', async () => {
  let owner = 'a'; const hook = new AiChatHarness(() => useAiChat(owner)); await settle();
  const wait = deferred<ReturnType<typeof ok>>(); api.insert.mockReturnValueOnce(wait.promise);
  const pending = hook.current.send('old'); await settle(); owner = 'b'; hook.render(); await settle();
  wait.resolve(ok(message('committed-old'))); await pending; await settle();
  expect(api.invoke).not.toHaveBeenCalled(); expect(hook.current.messages[0].session_id).toBe('session-b');
});
it('late New insertion cannot replace another owner conversation', async () => {
  let owner = 'a'; const hook = new AiChatHarness(() => useAiChat(owner)); await settle();
  const wait = deferred<ReturnType<typeof ok>>(); api.create.mockReturnValueOnce(wait.promise);
  const pending = hook.current.startNewConversation(); await settle(); owner = 'b'; hook.render(); await settle();
  wait.resolve(ok({ id: 'committed-old-new' })); await pending; await settle();
  await hook.current.send('b'); expect(api.insert).toHaveBeenLastCalledWith({ session_id: 'session-b', sender: 'USER', content: 'b' });
});
for (const stage of ['lookup', 'create', 'history', 'insert', 'invoke', 'new'] as const) {
  it(`unmount ignores late ${stage} and starts no further stage`, async () => {
    const wait = deferred<ReturnType<typeof ok>>();
    let hook: AiChatHarness<ReturnType<typeof useAiChat>>; let pending: Promise<void> | undefined;
    if (stage === 'lookup' || stage === 'create' || stage === 'history') {
      if (stage === 'lookup') api.lookup.mockReturnValueOnce(wait.promise);
      if (stage === 'create') { api.lookup.mockResolvedValueOnce(ok(null)); api.create.mockReturnValueOnce(wait.promise); }
      if (stage === 'history') api.history.mockReturnValueOnce(wait.promise);
      hook = new AiChatHarness(() => useAiChat('a')); await settle();
    } else {
      hook = await ready();
      if (stage === 'new') { api.create.mockReturnValueOnce(wait.promise); pending = hook.current.startNewConversation(); }
      else { api[stage].mockReturnValueOnce(wait.promise); pending = hook.current.send('hello'); }
      await settle();
    }
    const prior = hook.current; const histories = api.history.mock.calls.length; const invocations = api.invoke.mock.calls.length;
    hook.unmount(); wait.resolve(ok(stage === 'lookup' ? null : stage === 'history' ? [message('late')] : stage === 'invoke' ? { message: message('late') } : { id: 'late' }));
    await pending; await settle();
    expect(hook.current).toBe(prior); expect(api.history).toHaveBeenCalledTimes(histories); expect(api.invoke).toHaveBeenCalledTimes(invocations);
    if (stage === 'lookup') expect(api.create).not.toHaveBeenCalled();
  });
}
