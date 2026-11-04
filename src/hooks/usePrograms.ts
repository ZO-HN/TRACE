import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ProgramRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  created_at: string;
}

export interface UsePrograms {
  programs: ProgramRow[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createProgram: (input: { name: string; description: string; category: string }) => Promise<{ error: string | null }>;
  deleteProgram: (id: string) => Promise<{ error: string | null }>;
}

type LoadedData = { programs: ProgramRow[] };
type LoadScope = { owner: string; request: number };
const emptyData = (): LoadedData => ({ programs: [] });

export function usePrograms(coachId: string): UsePrograms {
  const [state, setState] = useState<LoadedData & { isLoading: boolean; error: string | null; owner: string }>(
    () => ({ ...emptyData(), owner: coachId, isLoading: Boolean(coachId), error: null }),
  );
  const owner = useRef(coachId);
  owner.current = coachId;
  const active = useRef<LoadScope | null>(null);
  const fetchPrograms = useCallback(async (scope: LoadScope) => {
    const current = () => active.current === scope && owner.current === scope.owner;
    if (!current()) return;
    const request = ++scope.request;
    setState((previous) => ({ ...(previous.owner === scope.owner ? previous : emptyData()), owner: scope.owner, isLoading: true, error: null }));
    try {
      const { data, error: queryError } = await supabase
        .from('programs')
        .select('id, name, description, category, created_at')
        .eq('coach_id', scope.owner)
        .order('created_at', { ascending: false });
      if (queryError) throw new Error(queryError.message);
      const next: LoadedData = { programs: (data as ProgramRow[]) ?? [] };
      if (current() && scope.request === request) setState({ ...next, owner: scope.owner, isLoading: false, error: null });
    } catch (cause) {
      if (current() && scope.request === request) setState((previous) => ({ ...previous, isLoading: false,
        error: cause instanceof Error ? cause.message : 'Could not load data. Please retry.' }));
    }
  }, []);

  useEffect(() => {
    if (!coachId) {
      active.current = null;
      setState({ ...emptyData(), owner: coachId, isLoading: false, error: null });
      return;
    }
    const scope: LoadScope = { owner: coachId, request: 0 };
    active.current = scope;
    void fetchPrograms(scope);
    return () => { if (active.current === scope) active.current = null; };
  }, [coachId, fetchPrograms]);

  const refresh = useCallback(async () => {
    const scope = active.current;
    if (scope?.owner === coachId && owner.current === coachId) await fetchPrograms(scope);
  }, [coachId, fetchPrograms]);

  const runMutation = async (operation: (scope: LoadScope) => Promise<{ error: string | null }>) => {
    const scope = active.current;
    if (!scope || scope.owner !== coachId || owner.current !== coachId) return { error: 'The active account changed. Please retry from the current view.' };
    try {
      const result = await operation(scope);
      if (!result.error && active.current === scope && owner.current === scope.owner) await fetchPrograms(scope);
      return result;
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'Could not complete the operation. Please retry.' };
    }
  };

  const createProgram: UsePrograms['createProgram'] = async ({ name, description, category }) => runMutation(async () => {
    const { error: insertError } = await supabase
      .from('programs')
      .insert({ coach_id: coachId, name, description: description || null, category: category || null });
    return { error: insertError?.message ?? null };
  });

  const deleteProgram = async (id: string) => runMutation(async () => {
    const { error: deleteError } = await supabase.from('programs').delete().eq('id', id);
    return { error: deleteError?.message ?? null };
  });

  const visible = state.owner === coachId ? state : { ...emptyData(), isLoading: Boolean(coachId), error: null };
  return { programs: visible.programs, isLoading: visible.isLoading, error: visible.error, refresh, createProgram, deleteProgram };
}
