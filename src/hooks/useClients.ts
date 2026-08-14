// Coach's client roster — trainees whose profiles.coach_id points at this
// coach. Auto-populated by handle_new_user() on trainee signup (see
// supabase/migrations/20260803000000_platform_settings_and_rls_fix.sql).

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  manually_marked_churned: boolean;
}

export interface UseClients {
  clients: ClientRow[];
  isLoading: boolean;
  error: string | null;
  setChurned: (clientId: string, churned: boolean) => Promise<{ error: string | null }>;
}

export function useClients(coachId: string): UseClients {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchClients = async () => {
    const { data, error: queryError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, created_at, manually_marked_churned')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });

    if (!mountedRef.current) return;
    if (queryError) {
      setError(queryError.message);
    } else {
      setError(null);
      setClients((data as ClientRow[]) ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchClients();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const setChurned: UseClients['setChurned'] = async (clientId, churned) => {
    // Plain .update() can't work here: profiles' RLS only lets a user write
    // their own row, not a coach writing a client's row. See
    // supabase/migrations/20260814010000_fix_client_churn_update.sql.
    const { error: updateError } = await supabase.rpc('set_client_churned', {
      p_client_id: clientId,
      p_churned: churned,
    });
    if (!updateError) await fetchClients();
    return { error: updateError?.message ?? null };
  };

  return { clients, isLoading, error, setChurned };
}
