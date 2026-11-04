// Coach's client roster — trainees whose profiles.coach_id points at this
// coach. Auto-populated by handle_new_user() on trainee signup (see
// supabase/migrations/20260803000000_platform_settings_and_rls_fix.sql).

import { useCallback, useEffect, useRef, useState } from 'react';
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
  refresh: () => Promise<void>;
  setChurned: (clientId: string, churned: boolean) => Promise<{ error: string | null }>;
}

type RosterState = { coachId: string; clients: ClientRow[]; isLoading: boolean; error: string | null };
type RosterScope = { coachId: string; request: number };

export function useClients(coachId: string): UseClients {
  const [state, setState] = useState<RosterState>(() => ({ coachId, clients: [], isLoading: Boolean(coachId), error: null }));
  const owner = useRef(coachId);
  owner.current = coachId;
  const active = useRef<RosterScope | null>(null);

  const fetchClients = useCallback(async (scope: RosterScope) => {
    const current = () => active.current === scope && owner.current === scope.coachId;
    if (!current()) return;
    const request = ++scope.request;
    setState((previous) => ({ coachId: scope.coachId,
      clients: previous.coachId === scope.coachId ? previous.clients : [], isLoading: true, error: null }));
    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, created_at, manually_marked_churned')
        .eq('coach_id', scope.coachId)
        .order('created_at', { ascending: false });
      if (queryError) throw new Error(queryError.message);
      if (current() && scope.request === request) {
        setState({ coachId: scope.coachId, clients: (data as ClientRow[]) ?? [], isLoading: false, error: null });
      }
    } catch (cause) {
      if (current() && scope.request === request) {
        setState((previous) => ({ ...previous, isLoading: false,
          error: cause instanceof Error ? cause.message : 'Could not load clients. Please retry.' }));
      }
    }
  }, []);

  useEffect(() => {
    if (!coachId) {
      active.current = null;
      setState({ coachId, clients: [], isLoading: false, error: null });
      return;
    }
    // Every setup gets a new identity, including StrictMode replay and A→B→A.
    const scope: RosterScope = { coachId, request: 0 };
    active.current = scope;
    void fetchClients(scope);
    return () => {
      if (active.current === scope) active.current = null;
    };
  }, [coachId, fetchClients]);

  const refresh = useCallback(async () => {
    const scope = active.current;
    if (scope?.coachId === coachId && owner.current === coachId) await fetchClients(scope);
  }, [coachId, fetchClients]);

  const setChurned = useCallback<UseClients['setChurned']>(async (clientId, churned) => {
    const scope = active.current;
    if (!scope || scope.coachId !== coachId || owner.current !== coachId) return { error: 'The active coach changed. Please retry from the current roster.' };
    // Plain .update() can't work here: profiles' RLS only lets a user write
    // their own row, not a coach writing a client's row. See
    // supabase/migrations/20260814010000_fix_client_churn_update.sql.
    try {
      const { error: updateError } = await supabase.rpc('set_client_churned', {
        p_client_id: clientId,
        p_churned: churned,
      });
      if (!updateError) await fetchClients(scope);
      return { error: updateError?.message ?? null };
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'Could not update the client. Please retry.' };
    }
  }, [coachId, fetchClients]);

  const visible = state.coachId === coachId ? state : { clients: [], isLoading: Boolean(coachId), error: null };
  return { clients: visible.clients, isLoading: visible.isLoading, error: visible.error, refresh, setChurned };
}
