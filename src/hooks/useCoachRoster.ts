// Loads the coach's roster with latest telemetry (get_coach_roster_telemetry
// — avoids N+1 queries by design), then keeps it live: any change to a
// connected trainee's set_logs / workout_sessions / wearable_biometrics
// triggers a debounced refetch. Realtime's postgres_changes is RLS-aware,
// so this subscription only ever receives events for this coach's own
// trainees — see the coach SELECT policies on those tables.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { debounce } from '../lib/debounce';
import type { RosterRow } from '../lib/roster/display';

export interface UseCoachRoster {
  roster: RosterRow[];
  isLoading: boolean;
  error: string | null;
  /** True once the realtime subscription is confirmed live. */
  isLive: boolean;
}

const REFRESH_DEBOUNCE_MS = 800;
const WATCHED_TABLES = ['set_logs', 'workout_sessions', 'wearable_biometrics'] as const;

export function useCoachRoster(coachId: string): UseCoachRoster {
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchRoster = async () => {
      const { data, error: rpcError } = await supabase.rpc(
        'get_coach_roster_telemetry',
        { p_coach_id: coachId },
      );
      if (cancelled) return;
      if (rpcError) {
        setError(rpcError.message);
      } else {
        setError(null);
        setRoster((data as RosterRow[]) ?? []);
      }
      setIsLoading(false);
    };

    fetchRoster();

    const refresh = debounce(fetchRoster, REFRESH_DEBOUNCE_MS);

    let channel = supabase.channel(`coach-roster-${coachId}`);
    for (const table of WATCHED_TABLES) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => refresh.call(),
      );
    }
    channel.subscribe((status) => {
      if (!cancelled) setIsLive(status === 'SUBSCRIBED');
    });

    return () => {
      cancelled = true;
      refresh.cancel();
      void supabase.removeChannel(channel);
    };
  }, [coachId]);

  return { roster, isLoading, error, isLive };
}
