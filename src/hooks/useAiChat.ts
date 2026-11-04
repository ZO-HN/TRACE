// TRACE Brain chat: find-or-create the user's AI session, load history, send a
// USER turn (persisted client-side under RLS), then ask the trace-brain edge
// function for the ASSISTANT turn (written server-side with the service role).

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { appendMessage, type AiMessage } from '../lib/chat/aiTypes';

export interface UseAiChat {
  messages: AiMessage[];
  send: (content: string) => Promise<void>;
  startNewConversation: () => Promise<void>;
  isReady: boolean;
  isThinking: boolean;
  error: string | null;
}

interface ChatState {
  owner: string;
  token: symbol;
  messages: AiMessage[];
  error: string | null;
  isReady: boolean;
  isThinking: boolean;
}
interface ChatScope {
  owner: string;
  token: symbol;
  active: boolean;
  conversation: number;
  sessionId: string | null;
  state: ChatState;
  sendTail: Promise<void>;
  sends: Map<string, Promise<void>>;
  pendingSends: number;
  pendingNew: Promise<void> | null;
}
function emptyState(owner: string): ChatState {
  return { owner, token: Symbol('chat setup'), messages: [], error: null, isReady: false, isThinking: false };
}
function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error ? cause.message : fallback;
}

export function useAiChat(userId: string): UseAiChat {
  const [state, setState] = useState<ChatState>(() => emptyState(userId));
  const ownerRef = useRef(userId);
  ownerRef.current = userId;
  const scopeRef = useRef<ChatScope | null>(null);
  const current = useCallback((scope: ChatScope, conversation?: number) =>
    scope.active && scopeRef.current === scope && ownerRef.current === scope.owner
    && (conversation === undefined || conversation === scope.conversation), []);
  const publish = useCallback((scope: ChatScope, patch: Partial<ChatState>) => {
    if (!current(scope)) return;
    scope.state = { ...scope.state, ...patch };
    setState(scope.state);
  }, [current]);

  useEffect(() => {
    const initial = emptyState(userId);
    const scope: ChatScope = { owner: userId, token: initial.token, active: true, conversation: 0,
      sessionId: null, state: initial, sendTail: Promise.resolve(), sends: new Map(), pendingSends: 0, pendingNew: null };
    scopeRef.current = scope;
    setState(initial);
    const conversation = scope.conversation;
    const initialize = async () => {
      try {
        if (!current(scope, conversation)) return;
        const { data: existing, error: lookupError } = await supabase.from('ai_chat_sessions')
          .select('id').eq('user_id', userId).order('started_at', { ascending: false }).limit(1).maybeSingle();
        if (!current(scope, conversation)) return;
        if (lookupError) throw new Error(lookupError.message);
        let sessionId = existing?.id as string | undefined;
        if (!sessionId) {
          const { data: created, error: createError } = await supabase.from('ai_chat_sessions')
            .insert({ user_id: userId }).select('id').single();
          if (!current(scope, conversation)) return;
          if (createError || !created?.id) throw new Error(createError?.message ?? 'Could not start a session');
          sessionId = created.id as string;
        }
        const { data: history, error: historyError } = await supabase.from('ai_messages')
          .select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
        if (!current(scope, conversation)) return;
        if (historyError) throw new Error(historyError.message);
        scope.sessionId = sessionId;
        publish(scope, { messages: (history as AiMessage[]) ?? [], isReady: true, error: null });
      } catch (cause: unknown) {
        if (current(scope, conversation)) publish(scope, { error: errorMessage(cause, 'Could not load conversation'), isReady: false });
      }
    };
    // Replay cleanup can invalidate setup before it starts any database work.
    void Promise.resolve().then(initialize);
    return () => { scope.active = false; };
  }, [userId, current, publish]);

  const token = state.token;
  const startNewConversation = useCallback((): Promise<void> => {
    const scope = scopeRef.current;
    if (!scope || scope.token !== token || scope.owner !== userId || !current(scope)) return Promise.resolve();
    if (scope.pendingNew) return scope.pendingNew;
    const wasReady = scope.state.isReady;
    // New supersedes unfinished initialization. Already-started writes may still commit.
    if (!wasReady) scope.conversation += 1;
    publish(scope, { isReady: false, error: null });
    const operation = scope.sendTail.then(async () => {
      if (!current(scope)) return;
      const conversation = ++scope.conversation;
      try {
        const { data: created, error: createError } = await supabase.from('ai_chat_sessions')
          .insert({ user_id: scope.owner }).select('id').single();
        if (!current(scope, conversation)) return;
        if (createError || !created?.id) throw new Error(createError?.message ?? 'Could not start a new conversation');
        scope.sessionId = created.id as string;
        publish(scope, { messages: [], isReady: true, isThinking: false, error: null });
      } catch (cause: unknown) {
        if (current(scope, conversation)) publish(scope, { isReady: wasReady && scope.sessionId !== null,
          error: errorMessage(cause, 'Could not start a new conversation') });
      }
    }).finally(() => { if (scope.pendingNew === operation) scope.pendingNew = null; });
    scope.pendingNew = operation;
    return operation;
  }, [userId, token, current, publish]);

  const send = useCallback((content: string): Promise<void> => {
    const scope = scopeRef.current;
    const trimmed = content.trim();
    if (!scope || scope.token !== token || scope.owner !== userId || !current(scope) || !trimmed) return Promise.resolve();
    const duplicate = scope.sends.get(trimmed);
    if (duplicate) return duplicate;
    if (!scope.state.isReady || !scope.sessionId || scope.pendingNew) return Promise.resolve();
    const sessionId = scope.sessionId;
    const conversation = scope.conversation;
    scope.pendingSends += 1;
    publish(scope, { isThinking: true, error: null });
    // Preserve distinct sends in call order; coalesce repeated taps for the same
    // pending text. New waits for this queue before changing the conversation.
    const operation = scope.sendTail.then(async () => {
      if (!current(scope, conversation)) return;
      try {
        const { data: userMsg, error: sendError } = await supabase.from('ai_messages')
          .insert({ session_id: sessionId, sender: 'USER', content: trimmed }).select().single();
        if (!current(scope, conversation)) return;
        if (sendError || !userMsg) throw new Error(sendError?.message ?? 'Could not send');
        publish(scope, { messages: appendMessage(scope.state.messages, userMsg as AiMessage) });
        const { data, error: fnError } = await supabase.functions.invoke<{ message: AiMessage }>(
          'trace-brain', { body: { sessionId, content: trimmed } });
        if (!current(scope, conversation)) return;
        if (fnError) throw new Error(fnError.message);
        if (data?.message) publish(scope, { messages: appendMessage(scope.state.messages, data.message) });
      } catch (cause: unknown) {
        if (current(scope, conversation)) publish(scope, { error: errorMessage(cause, 'TRACE Brain is unavailable') });
      }
    }).finally(() => {
      scope.sends.delete(trimmed);
      scope.pendingSends -= 1;
      if (current(scope, conversation)) publish(scope, { isThinking: scope.pendingSends > 0 });
    });
    scope.sendTail = operation;
    scope.sends.set(trimmed, operation);
    return operation;
  }, [userId, token, current, publish]);

  // Do not expose the previous owner's state during the render before cleanup.
  const visible = state.owner === userId && state.token === scopeRef.current?.token
    && scopeRef.current?.active ? state : emptyState(userId);
  return { messages: visible.messages, error: visible.error, isReady: visible.isReady,
    isThinking: visible.isThinking, send, startNewConversation };
}
