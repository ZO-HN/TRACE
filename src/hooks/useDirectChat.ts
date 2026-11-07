// Cursor-paged history and realtime inserts share one conversation-owned list.
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { isBetween, mergeMessage, type DirectMessage } from '../lib/chat/types';

type Scope = { key: string; mine: string; peer: string; loaded: boolean; reading: boolean; cursor?: { at: string | null; id: string }; request: { id: string; content: string } | null; sending: Promise<void> | null };
type State = { key: string; messages: DirectMessage[]; error: string | null; isLoading: boolean; loadingOlder: boolean; hasMore: boolean; isSending: boolean };
export interface UseDirectChat extends Omit<State, 'key'> { send: (content: string) => Promise<void>; loadOlder: () => Promise<void>; refresh: () => Promise<void> }
function row(raw: unknown, mine: string, peer: string): DirectMessage {
  const m = raw as DirectMessage;
  if (!m || typeof m.id !== 'string' || typeof m.content !== 'string' || !isBetween(m, mine, peer) || (m.created_at != null && typeof m.created_at !== 'string')) throw new Error('Invalid conversation response. Retry loading messages.');
  return { ...m, created_at: m.created_at ?? '' };
}
export function useDirectChat(myId: string, peerId: string): UseDirectChat {
  const key = `${myId}:${peerId}`;
  const owner = useRef(key); owner.current = key;
  const active = useRef<Scope | null>(null);
  const [state, setState] = useState<State>({ key, messages: [], error: null, isLoading: true, loadingOlder: false, hasMore: false, isSending: false });
  const valid = useCallback((scope: Scope) => active.current === scope && owner.current === scope.key, []);
  const loadPage = useCallback(async (scope: Scope, initial: boolean) => {
    if (!valid(scope) || scope.reading) return;
    scope.reading = true;
    setState(s => ({ ...s, error: null, isLoading: initial, loadingOlder: !initial }));
    try {
      const cursor = initial ? undefined : scope.cursor;
      const { data, error } = await supabase.rpc('get_direct_messages_page', {
        p_owner_id: scope.mine, p_peer_id: scope.peer, p_limit: 50,
        ...(cursor ? { p_before_id: cursor.id, ...(cursor.at ? { p_before: cursor.at } : {}) } : {}),
      });
      if (error) throw new Error(error.message);
      if (!Array.isArray(data)) throw new Error('Invalid message history response.');
      const page = data.map(m => row(m, scope.mine, scope.peer));
      if (!valid(scope)) return;
      const last = page[page.length - 1];
      if (last) scope.cursor = { at: last.created_at || null, id: last.id };
      scope.loaded = true;
      setState(s => ({ ...s, messages: page.reduce(mergeMessage, s.messages), error: null, isLoading: false, loadingOlder: false, hasMore: page.length === 50 }));
    } catch (error) {
      if (valid(scope)) setState(s => ({ ...s, isLoading: false, loadingOlder: false, error: error instanceof Error ? error.message : 'Could not load messages.' }));
    } finally { scope.reading = false; }
  }, [valid]);
  useEffect(() => {
    const scope: Scope = { key, mine: myId, peer: peerId, loaded: false, reading: false, request: null, sending: null };
    active.current = scope;
    setState({ key, messages: [], error: null, isLoading: true, loadingOlder: false, hasMore: false, isSending: false });
    void loadPage(scope, true);
    const channel = supabase.channel(`dm-${myId}-${peerId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, payload => {
      if (!valid(scope)) return;
      const raw = payload.new as DirectMessage;
      if (!raw || !isBetween(raw, myId, peerId)) return;
      try { const message = row(raw, myId, peerId); setState(s => ({ ...s, messages: mergeMessage(s.messages, message) })); }
      catch { setState(s => ({ ...s, error: 'A message could not be displayed. Refresh the conversation.' })); }
    }).subscribe();
    return () => { if (active.current === scope) active.current = null; void Promise.resolve().then(() => supabase.removeChannel(channel)).catch(() => undefined); };
  }, [key, myId, peerId, loadPage, valid]);
  const send = useCallback((content: string): Promise<void> => {
    const scope = active.current;
    if (!scope || !valid(scope) || scope.key !== key) return Promise.reject(new Error('The active conversation changed.'));
    const trimmed = content.trim();
    if (!trimmed) return Promise.resolve();
    if (Array.from(trimmed).length > 4000) { const error = 'Keep messages to 4000 characters.'; setState(s => ({ ...s, error })); return Promise.reject(new Error(error)); }
    if (scope.request && scope.request.content !== trimmed) { const error = 'Retry the previous message first, or reopen its saved history before composing another message.'; setState(s => ({ ...s, error })); return Promise.reject(new Error(error)); }
    if (scope.sending) return scope.sending;
    scope.request ??= { id: crypto.randomUUID(), content: trimmed };
    const request = scope.request;
    setState(s => ({ ...s, error: null, isSending: true }));
    const operation = Promise.resolve().then(async () => {
      try {
        const { data, error } = await supabase.rpc('send_direct_message', { p_message_id: request.id, p_sender_id: scope.mine, p_recipient_id: scope.peer, p_content: request.content });
        if (error) throw new Error(error.message);
        const message = row(data, scope.mine, scope.peer);
        if (message.id !== request.id || message.sender_id !== scope.mine || message.content !== request.content) throw new Error('Message confirmation mismatch. Retry the same message.');
        scope.request = null;
        if (valid(scope)) setState(s => ({ ...s, messages: mergeMessage(s.messages, message), error: null }));
      } catch (error) {
        if (valid(scope)) setState(s => ({ ...s, error: error instanceof Error ? error.message : 'Could not send message.' }));
        throw error;
      } finally { scope.sending = null; if (valid(scope)) setState(s => ({ ...s, isSending: false })); }
    });
    scope.sending = operation;
    return operation;
  }, [key, valid]);
  const loadOlder = useCallback(async () => { const scope = active.current; if (scope?.key === key) await loadPage(scope, !scope.loaded); }, [key, loadPage]);
  const refresh = useCallback(async () => { const scope = active.current; if (scope?.key === key) await loadPage(scope, true); }, [key, loadPage]);
  const visible = state.key === key ? state : { key, messages: [], error: null, isLoading: true, loadingOlder: false, hasMore: false, isSending: false };
  return { ...visible, send, loadOlder, refresh };
}
