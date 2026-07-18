// Wires the outbox to browser connectivity: hydrates on mount, and flushes to
// Supabase whenever the browser regains connectivity (fires on the `online` event).

import { useEffect } from 'react';
import { useOutboxStore } from '../lib/outbox/outboxStore';
import { flushOutboxLive } from '../lib/outbox/sync';

export function useOutboxSync(): void {
  const hydrate = useOutboxStore((s) => s.hydrate);

  useEffect(() => {
    let cancelled = false;

    const flushThenRefresh = async () => {
      await flushOutboxLive();
      if (!cancelled) await hydrate();
    };

    hydrate();
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      flushThenRefresh();
    }

    const onOnline = () => flushThenRefresh();
    window.addEventListener('online', onOnline);

    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
  }, [hydrate]);
}
