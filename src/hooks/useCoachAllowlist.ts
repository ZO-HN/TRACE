// Platform-admin-only: who may become a coach on signup (email OTP or
// Google OAuth). Enforced server-side in handle_new_user() — this hook is
// just the admin UI over the coach_allowlist table; RLS is the real gate.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface CoachAllowlistEntry {
  email: string;
  note: string | null;
  created_at: string;
}

export interface UseCoachAllowlist {
  entries: CoachAllowlistEntry[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addEmail: (email: string, note: string, invitedBy: string) => Promise<{ error: string | null }>;
  removeEmail: (email: string) => Promise<{ error: string | null }>;
}

type LoadedData = { entries: CoachAllowlistEntry[] };
type LoadScope = { request: number };
const emptyData = (): LoadedData => ({ entries: [] });

export function useCoachAllowlist(): UseCoachAllowlist {
  const [state, setState] = useState<LoadedData & { isLoading: boolean; error: string | null }>(
    () => ({ ...emptyData(), isLoading: true, error: null }),
  );
  const active = useRef<LoadScope | null>(null);
  const fetchEntries = useCallback(async (scope: LoadScope) => {
    const current = () => active.current === scope;
    if (!current()) return;
    const request = ++scope.request;
    setState((previous) => ({ ...previous, isLoading: true, error: null }));
    try {
      const { data, error: queryError } = await supabase
        .from('coach_allowlist')
        .select('email, note, created_at')
        .order('created_at', { ascending: false });
      if (queryError) throw new Error(queryError.message);
      const next: LoadedData = { entries: data ?? [] };
      if (current() && scope.request === request) setState({ ...next, isLoading: false, error: null });
    } catch (cause) {
      if (current() && scope.request === request) setState((previous) => ({ ...previous, isLoading: false,
        error: cause instanceof Error ? cause.message : 'Could not load data. Please retry.' }));
    }
  }, []);

  useEffect(() => {
    const scope: LoadScope = { request: 0 };
    active.current = scope;
    void fetchEntries(scope);
    return () => { if (active.current === scope) active.current = null; };
  }, [fetchEntries]);

  const refresh = useCallback(async () => {
    const scope = active.current;
    if (scope) await fetchEntries(scope);
  }, [fetchEntries]);

  const runMutation = async (operation: (scope: LoadScope) => Promise<{ error: string | null }>) => {
    const scope = active.current;
    if (!scope) return { error: 'The active account changed. Please retry from the current view.' };
    try {
      const result = await operation(scope);
      if (!result.error && active.current === scope) await fetchEntries(scope);
      return result;
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'Could not complete the operation. Please retry.' };
    }
  };

  const addEmail: UseCoachAllowlist['addEmail'] = async (email, note, invitedBy) => runMutation(async () => {
    const { error: insertError } = await supabase
      .from('coach_allowlist')
      .insert({ email: email.trim().toLowerCase(), note: note || null, invited_by: invitedBy });
    return { error: insertError?.message ?? null };
  });

  const removeEmail: UseCoachAllowlist['removeEmail'] = async (email) => runMutation(async () => {
    const { error: deleteError } = await supabase.from('coach_allowlist').delete().eq('email', email);
    return { error: deleteError?.message ?? null };
  });

  const visible = state;
  return { entries: visible.entries, isLoading: visible.isLoading, error: visible.error, refresh, addEmail, removeEmail };
}
