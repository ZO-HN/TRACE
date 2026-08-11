import { useEffect, useState } from 'react';
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
  createGroup: (input: { name: string; description: string; programId: string }) => Promise<{ error: string | null }>;
  deleteGroup: (id: string) => Promise<{ error: string | null }>;
  fetchMemberIds: (groupId: string) => Promise<{ memberIds: string[]; error: string | null }>;
  addMember: (groupId: string, clientId: string) => Promise<{ error: string | null }>;
  removeMember: (groupId: string, clientId: string) => Promise<{ error: string | null }>;
}

export function useTrainingGroups(coachId: string): UseTrainingGroups {
  const [groups, setGroups] = useState<TrainingGroupRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = async () => {
    const { data, error: queryError } = await supabase
      .from('training_groups')
      .select('id, name, description, program_id, created_at, program:programs(name), training_group_members(count)')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });
    if (queryError) setError(queryError.message);
    else {
      setError(null);
      const mapped = ((data as unknown as RawGroupRow[]) ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        description: g.description,
        program_id: g.program_id,
        program_name: g.program?.name ?? null,
        member_count: g.training_group_members?.[0]?.count ?? 0,
        created_at: g.created_at,
      }));
      setGroups(mapped);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchGroups();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const createGroup: UseTrainingGroups['createGroup'] = async ({ name, description, programId }) => {
    const { error: insertError } = await supabase
      .from('training_groups')
      .insert({ coach_id: coachId, name, description: description || null, program_id: programId || null });
    if (!insertError) await fetchGroups();
    return { error: insertError?.message ?? null };
  };

  const deleteGroup = async (id: string) => {
    const { error: deleteError } = await supabase.from('training_groups').delete().eq('id', id);
    if (!deleteError) await fetchGroups();
    return { error: deleteError?.message ?? null };
  };

  const fetchMemberIds: UseTrainingGroups['fetchMemberIds'] = async (groupId) => {
    const { data, error: queryError } = await supabase
      .from('training_group_members')
      .select('client_id')
      .eq('group_id', groupId);
    if (queryError) return { memberIds: [], error: queryError.message };
    return { memberIds: (data ?? []).map((r) => r.client_id as string), error: null };
  };

  const addMember: UseTrainingGroups['addMember'] = async (groupId, clientId) => {
    const { error: insertError } = await supabase
      .from('training_group_members')
      .insert({ group_id: groupId, client_id: clientId });
    if (!insertError) await fetchGroups();
    return { error: insertError?.message ?? null };
  };

  const removeMember: UseTrainingGroups['removeMember'] = async (groupId, clientId) => {
    const { error: deleteError } = await supabase
      .from('training_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('client_id', clientId);
    if (!deleteError) await fetchGroups();
    return { error: deleteError?.message ?? null };
  };

  return { groups, isLoading, error, createGroup, deleteGroup, fetchMemberIds, addMember, removeMember };
}
