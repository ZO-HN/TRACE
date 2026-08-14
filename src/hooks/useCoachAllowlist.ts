// Platform-admin-only: who may become a coach on signup (email OTP or
// Google OAuth). Enforced server-side in handle_new_user() — this hook is
// just the admin UI over the coach_allowlist table; RLS is the real gate.

import { useEffect, useRef, useState } from 'react';
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
  addEmail: (email: string, note: string, invitedBy: string) => Promise<{ error: string | null }>;
  removeEmail: (email: string) => Promise<{ error: string | null }>;
}

export function useCoachAllowlist(): UseCoachAllowlist {
  const [entries, setEntries] = useState<CoachAllowlistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchEntries = async () => {
    const { data, error: queryError } = await supabase
      .from('coach_allowlist')
      .select('email, note, created_at')
      .order('created_at', { ascending: false });
    if (!mountedRef.current) return;
    if (queryError) setError(queryError.message);
    else {
      setError(null);
      setEntries(data ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    void fetchEntries();
  }, []);

  const addEmail: UseCoachAllowlist['addEmail'] = async (email, note, invitedBy) => {
    const { error: insertError } = await supabase
      .from('coach_allowlist')
      .insert({ email: email.trim().toLowerCase(), note: note || null, invited_by: invitedBy });
    if (!insertError) await fetchEntries();
    return { error: insertError?.message ?? null };
  };

  const removeEmail: UseCoachAllowlist['removeEmail'] = async (email) => {
    const { error: deleteError } = await supabase.from('coach_allowlist').delete().eq('email', email);
    if (!deleteError) await fetchEntries();
    return { error: deleteError?.message ?? null };
  };

  return { entries, isLoading, error, addEmail, removeEmail };
}
