// Whether the AI Copilot has an API key linked. There's no server-side
// secret storage for this yet (that would want a Supabase Edge Function
// secret, not a client-writable column) — this is a localStorage placeholder
// so the "not connected" / "connected" UI states are real to click through,
// not just static mock.

import { useCallback, useState } from 'react';

const STORAGE_KEY = 'trace_copilot_api_key';

export interface UseCopilotConnection {
  isConnected: boolean;
  connect: (apiKey: string) => void;
  disconnect: () => void;
}

export function useCopilotConnection(): UseCopilotConnection {
  const [isConnected, setIsConnected] = useState(() => !!localStorage.getItem(STORAGE_KEY));

  const connect = useCallback((apiKey: string) => {
    if (!apiKey.trim()) return;
    localStorage.setItem(STORAGE_KEY, apiKey.trim());
    setIsConnected(true);
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setIsConnected(false);
  }, []);

  return { isConnected, connect, disconnect };
}
