// Live 1-on-1 chat over the direct_messages table: initial history load,
// realtime INSERT subscription, and a send action.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  isBetween,
  mergeMessage,
  type DirectMessage,
} from '../lib/chat/types';

export interface UseDirectChat {
  messages: DirectMessage[];
  send: (content: string) => Promise<void>;
  error: string | null;
}

export function useDirectChat(myId: string, peerId: string): UseDirectChat {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error: loadError } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${myId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${myId})`,
        )
        .order('created_at', { ascending: true })
        .limit(200);
      if (!cancelled) {
        if (loadError) setError(loadError.message);
        else if (data) setMessages(data as DirectMessage[]);
      }
    })();

    const channel = supabase
      .channel(`dm-${myId}-${peerId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new as DirectMessage;
          if (isBetween(msg, myId, peerId)) {
            setMessages((prev) => mergeMessage(prev, msg));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [myId, peerId]);

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const { data, error: sendError } = await supabase
        .from('direct_messages')
        .insert({ sender_id: myId, recipient_id: peerId, content: trimmed })
        .select()
        .single();
      if (sendError) {
        setError(sendError.message);
        throw sendError;
      }
      if (data) setMessages((prev) => mergeMessage(prev, data as DirectMessage));
    },
    [myId, peerId],
  );

  return { messages, send, error };
}
