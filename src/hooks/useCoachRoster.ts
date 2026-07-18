// Loads the coach's roster with latest telemetry in a single RPC call
// (get_coach_roster_telemetry — avoids N+1 queries by design).

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { RosterRow } from '../lib/roster/display';

export interface UseCoachRoster {
  roster: RosterRow[];
  isLoading: boolean;
  error: string | null;
}

export function useCoachRoster(coachId: string): UseCoachRoster {
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error: rpcError } = await supabase.rpc(
        'get_coach_roster_telemetry',
        { p_coach_id: coachId },
      );
      if (cancelled) return;
      if (rpcError) setError(rpcError.message);
      else setRoster((data as RosterRow[]) ?? []);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [coachId]);

  return { roster, isLoading, error };
}
