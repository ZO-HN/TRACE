// Coach's client roster — trainees whose profiles.coach_id points at this
// coach. Auto-populated by handle_new_user() on trainee signup (see
// supabase/migrations/20260803000000_platform_settings_and_rls_fix.sql).

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

export interface UseClients {
  clients: ClientRow[];
  isLoading: boolean;
  error: string | null;
}

export function useClients(coachId: string): UseClients {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, created_at')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false });

      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
      } else {
        setError(null);
        setClients((data as ClientRow[]) ?? []);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [coachId]);

  return { clients, isLoading, error };
}
