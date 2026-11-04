import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface RoadmapRow {
  id: string;
  client_id: string | null;
  client_name: string | null;
  title: string;
  description: string | null;
  status: 'draft' | 'active';
  start_date: string | null;
  target_end_date: string | null;
  created_at: string;
}

interface RawRoadmapRow {
  id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  status: 'draft' | 'active';
  start_date: string | null;
  target_end_date: string | null;
  created_at: string;
  client: { first_name: string; last_name: string } | null;
}

export interface UseRoadmaps {
  roadmaps: RoadmapRow[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createRoadmap: (input: {
    title: string;
    description: string;
    clientId: string;
    status: 'draft' | 'active';
    startDate: string;
    targetEndDate: string;
  }) => Promise<{ error: string | null }>;
  deleteRoadmap: (id: string) => Promise<{ error: string | null }>;
}

type LoadedData = { roadmaps: RoadmapRow[] };
type LoadScope = { owner: string; request: number };
const emptyData = (): LoadedData => ({ roadmaps: [] });

export function useRoadmaps(coachId: string): UseRoadmaps {
  const [state, setState] = useState<LoadedData & { isLoading: boolean; error: string | null; owner: string }>(
    () => ({ ...emptyData(), owner: coachId, isLoading: Boolean(coachId), error: null }),
  );
  const owner = useRef(coachId);
  owner.current = coachId;
  const active = useRef<LoadScope | null>(null);
  const fetchRoadmaps = useCallback(async (scope: LoadScope) => {
    const current = () => active.current === scope && owner.current === scope.owner;
    if (!current()) return;
    const request = ++scope.request;
    setState((previous) => ({ ...(previous.owner === scope.owner ? previous : emptyData()), owner: scope.owner, isLoading: true, error: null }));
    try {
      const { data, error: queryError } = await supabase
        .from('roadmaps')
        .select('id, client_id, title, description, status, start_date, target_end_date, created_at, client:profiles!roadmaps_client_id_fkey(first_name,last_name)')
        .eq('coach_id', scope.owner)
        .order('created_at', { ascending: false });
      if (queryError) throw new Error(queryError.message);
      const next: LoadedData = { roadmaps: ((data as unknown as RawRoadmapRow[]) ?? []).map((r) => ({
        id: r.id,
        client_id: r.client_id,
        client_name: r.client ? `${r.client.first_name} ${r.client.last_name}` : null,
        title: r.title,
        description: r.description,
        status: r.status,
        start_date: r.start_date,
        target_end_date: r.target_end_date,
        created_at: r.created_at,
      })) };
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
    void fetchRoadmaps(scope);
    return () => { if (active.current === scope) active.current = null; };
  }, [coachId, fetchRoadmaps]);

  const refresh = useCallback(async () => {
    const scope = active.current;
    if (scope?.owner === coachId && owner.current === coachId) await fetchRoadmaps(scope);
  }, [coachId, fetchRoadmaps]);

  const runMutation = async (operation: (scope: LoadScope) => Promise<{ error: string | null }>) => {
    const scope = active.current;
    if (!scope || scope.owner !== coachId || owner.current !== coachId) return { error: 'The active account changed. Please retry from the current view.' };
    try {
      const result = await operation(scope);
      if (!result.error && active.current === scope && owner.current === scope.owner) await fetchRoadmaps(scope);
      return result;
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'Could not complete the operation. Please retry.' };
    }
  };

  const createRoadmap: UseRoadmaps['createRoadmap'] = async ({ title, description, clientId, status, startDate, targetEndDate }) => runMutation(async () => {
    const { error: insertError } = await supabase.from('roadmaps').insert({
      coach_id: coachId,
      client_id: clientId || null,
      title,
      description: description || null,
      status,
      start_date: startDate || null,
      target_end_date: targetEndDate || null,
    });
    return { error: insertError?.message ?? null };
  });

  const deleteRoadmap = async (id: string) => runMutation(async () => {
    const { error: deleteError } = await supabase.from('roadmaps').delete().eq('id', id);
    return { error: deleteError?.message ?? null };
  });

  const visible = state.owner === coachId ? state : { ...emptyData(), isLoading: Boolean(coachId), error: null };
  return { roadmaps: visible.roadmaps, isLoading: visible.isLoading, error: visible.error, refresh, createRoadmap, deleteRoadmap };
}
