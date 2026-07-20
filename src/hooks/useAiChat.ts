// TRACE Brain chat: find-or-create the user's AI session, load history, send a
// USER turn (persisted client-side under RLS), then ask the trace-brain edge
// function for the ASSISTANT turn (written server-side with the service role).

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { appendMessage, type AiMessage } from '../lib/chat/aiTypes';

export interface UseAiChat {
  messages: AiMessage[];
  send: (content: string) => Promise<void>;
  isReady: boolean;
  isThinking: boolean;
  error: string | null;
}

export function useAiChat(userId: string): UseAiChat {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Reuse the most recent session, or create one.
      const { data: existing } = await supabase
        .from('ai_chat_sessions')
        .select('id')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let sessionId = existing?.id as string | undefined;
      if (!sessionId) {
        const { data: created, error: createError } = await supabase
          .from('ai_chat_sessions')
          .insert({ user_id: userId })
          .select('id')
          .single();
        if (createError || !created) {
          if (!cancelled) setError(createError?.message ?? 'Could not start a session');
          return;
        }
        sessionId = created.id as string;
      }
      if (cancelled) return;
      sessionIdRef.current = sessionId;

      const { data: history } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (!cancelled) {
        if (history) setMessages(history as AiMessage[]);
        setIsReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const send = useCallback(async (content: string) => {
    const trimmed = content.trim();
    const sessionId = sessionIdRef.current;
    if (!trimmed || !sessionId) return;

    const { data: userMsg, error: sendError } = await supabase
      .from('ai_messages')
      .insert({ session_id: sessionId, sender: 'USER', content: trimmed })
      .select()
      .single();
    if (sendError || !userMsg) {
      setError(sendError?.message ?? 'Could not send');
      return;
    }
    setMessages((prev) => appendMessage(prev, userMsg as AiMessage));

    setIsThinking(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke<{
        message: AiMessage;
      }>('trace-brain', { body: { sessionId, content: trimmed } });
      if (fnError) throw fnError;
      if (data?.message) setMessages((prev) => appendMessage(prev, data.message));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'TRACE Brain is unavailable');
    } finally {
      setIsThinking(false);
    }
  }, []);

  return { messages, send, isReady, isThinking, error };
}
