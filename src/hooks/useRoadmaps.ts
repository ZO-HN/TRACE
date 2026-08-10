import { useEffect, useState } from 'react';
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

export function useRoadmaps(coachId: string): UseRoadmaps {
  const [roadmaps, setRoadmaps] = useState<RoadmapRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoadmaps = async () => {
    const { data, error: queryError } = await supabase
      .from('roadmaps')
      .select('id, client_id, title, description, status, start_date, target_end_date, created_at, client:profiles!roadmaps_client_id_fkey(first_name,last_name)')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });
    if (queryError) setError(queryError.message);
    else {
      setError(null);
      const mapped = ((data as unknown as RawRoadmapRow[]) ?? []).map((r) => ({
        id: r.id,
        client_id: r.client_id,
        client_name: r.client ? `${r.client.first_name} ${r.client.last_name}` : null,
        title: r.title,
        description: r.description,
        status: r.status,
        start_date: r.start_date,
        target_end_date: r.target_end_date,
        created_at: r.created_at,
      }));
      setRoadmaps(mapped);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchRoadmaps();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const createRoadmap: UseRoadmaps['createRoadmap'] = async ({ title, description, clientId, status, startDate, targetEndDate }) => {
    const { error: insertError } = await supabase.from('roadmaps').insert({
      coach_id: coachId,
      client_id: clientId || null,
      title,
      description: description || null,
      status,
      start_date: startDate || null,
      target_end_date: targetEndDate || null,
    });
    if (!insertError) await fetchRoadmaps();
    return { error: insertError?.message ?? null };
  };

  const deleteRoadmap = async (id: string) => {
    const { error: deleteError } = await supabase.from('roadmaps').delete().eq('id', id);
    if (!deleteError) await fetchRoadmaps();
    return { error: deleteError?.message ?? null };
  };

  return { roadmaps, isLoading, error, createRoadmap, deleteRoadmap };
}
