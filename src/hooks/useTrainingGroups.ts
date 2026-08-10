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

  return { groups, isLoading, error, createGroup, deleteGroup };
}
