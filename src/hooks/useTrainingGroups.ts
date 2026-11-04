import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface TrainingGroupRow {
  id: string;
  name: string;
  description: string | null;
  program_id: string | null;
  program_name: string | null;
  member_count: number;
  created_at: string;
}

interface RawGroupRow {
  id: string;
  name: string;
  description: string | null;
  program_id: string | null;
  created_at: string;
  program: { name: string } | null;
  training_group_members: { count: number }[];
}

export interface UseTrainingGroups {
  groups: TrainingGroupRow[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createGroup: (input: { name: string; description: string; programId: string }) => Promise<{ error: string | null }>;
  deleteGroup: (id: string) => Promise<{ error: string | null }>;
  fetchMemberIds: (groupId: string) => Promise<{ memberIds: string[]; error: string | null }>;
  addMember: (groupId: string, clientId: string) => Promise<{ error: string | null }>;
  removeMember: (groupId: string, clientId: string) => Promise<{ error: string | null }>;
}

type LoadedData = { groups: TrainingGroupRow[] };
type LoadScope = { owner: string; request: number };
const emptyData = (): LoadedData => ({ groups: [] });

export function useTrainingGroups(coachId: string): UseTrainingGroups {
  const [state, setState] = useState<LoadedData & { isLoading: boolean; error: string | null; owner: string }>(
    () => ({ ...emptyData(), owner: coachId, isLoading: Boolean(coachId), error: null }),
  );
  const owner = useRef(coachId);
  owner.current = coachId;
  const active = useRef<LoadScope | null>(null);
  const fetchGroups = useCallback(async (scope: LoadScope) => {
    const current = () => active.current === scope && owner.current === scope.owner;
    if (!current()) return;
    const request = ++scope.request;
    setState((previous) => ({ ...(previous.owner === scope.owner ? previous : emptyData()), owner: scope.owner, isLoading: true, error: null }));
    try {
      const { data, error: queryError } = await supabase
        .from('training_groups')
        .select('id, name, description, program_id, created_at, program:programs(name), training_group_members(count)')
        .eq('coach_id', scope.owner)
        .order('created_at', { ascending: false });
      if (queryError) throw new Error(queryError.message);
      const next: LoadedData = { groups: ((data as unknown as RawGroupRow[]) ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        program_id: g.program_id,
        program_name: g.program?.name ?? null,
        member_count: g.training_group_members?.[0]?.count ?? 0,
        created_at: g.created_at,
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
    void fetchGroups(scope);
    return () => { if (active.current === scope) active.current = null; };
  }, [coachId, fetchGroups]);

  const refresh = useCallback(async () => {
    const scope = active.current;
    if (scope?.owner === coachId && owner.current === coachId) await fetchGroups(scope);
  }, [coachId, fetchGroups]);

  const runMutation = async (operation: (scope: LoadScope) => Promise<{ error: string | null }>) => {
    const scope = active.current;
    if (!scope || scope.owner !== coachId || owner.current !== coachId) return { error: 'The active account changed. Please retry from the current view.' };
    try {
      const result = await operation(scope);
      if (!result.error && active.current === scope && owner.current === scope.owner) await fetchGroups(scope);
      return result;
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'Could not complete the operation. Please retry.' };
    }
  };

  const createGroup: UseTrainingGroups['createGroup'] = async ({ name, description, programId }) => runMutation(async () => {
    const { error: insertError } = await supabase
      .from('training_groups')
      .insert({ coach_id: coachId, name, description: description || null, program_id: programId || null });
    return { error: insertError?.message ?? null };
  });

  const deleteGroup = async (id: string) => runMutation(async () => {
    const { error: deleteError } = await supabase.from('training_groups').delete().eq('id', id);
    return { error: deleteError?.message ?? null };
  });

  const fetchMemberIds: UseTrainingGroups['fetchMemberIds'] = async (groupId) => {
    const scope = active.current;
    if (!scope || scope.owner !== coachId || owner.current !== coachId) return { memberIds: [], error: 'The active coach changed. Please reopen the group.' };
    try {
      const { data, error: queryError } = await supabase
        .from('training_group_members')
        .select('client_id')
        .eq('group_id', groupId);
      if (active.current !== scope || owner.current !== scope.owner) return { memberIds: [], error: 'The active coach changed. Please reopen the group.' };
      if (queryError) return { memberIds: [], error: queryError.message };
      return { memberIds: (data ?? []).map((r) => r.client_id as string), error: null };
    } catch (cause) {
      return { memberIds: [], error: cause instanceof Error ? cause.message : 'Could not load members. Please retry.' };
    }
  };

  const addMember: UseTrainingGroups['addMember'] = async (groupId, clientId) => runMutation(async () => {
    const { error: insertError } = await supabase
      .from('training_group_members')
      .insert({ group_id: groupId, client_id: clientId });
    return { error: insertError?.message ?? null };
  });

  const removeMember: UseTrainingGroups['removeMember'] = async (groupId, clientId) => runMutation(async () => {
    const { error: deleteError } = await supabase
      .from('training_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('client_id', clientId);
    return { error: deleteError?.message ?? null };
  });

  const visible = state.owner === coachId ? state : { ...emptyData(), isLoading: Boolean(coachId), error: null };
  return { groups: visible.groups, isLoading: visible.isLoading, error: visible.error, refresh, createGroup, deleteGroup, fetchMemberIds, addMember, removeMember };
}
