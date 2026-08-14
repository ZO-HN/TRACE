import { useEffect, useRef, useState } from 'react';
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
  createProgram: (input: { name: string; description: string; category: string }) => Promise<{ error: string | null }>;
  deleteProgram: (id: string) => Promise<{ error: string | null }>;
}

export function usePrograms(coachId: string): UsePrograms {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchPrograms = async () => {
    const { data, error: queryError } = await supabase
      .from('programs')
      .select('id, name, description, category, created_at')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });
    if (!mountedRef.current) return;
    if (queryError) setError(queryError.message);
    else {
      setError(null);
      setPrograms((data as ProgramRow[]) ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchPrograms();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const createProgram: UsePrograms['createProgram'] = async ({ name, description, category }) => {
    const { error: insertError } = await supabase
      .from('programs')
      .insert({ coach_id: coachId, name, description: description || null, category: category || null });
    if (!insertError) await fetchPrograms();
    return { error: insertError?.message ?? null };
  };

  const deleteProgram = async (id: string) => {
    const { error: deleteError } = await supabase.from('programs').delete().eq('id', id);
    if (!deleteError) await fetchPrograms();
    return { error: deleteError?.message ?? null };
  };

  return { programs, isLoading, error, createProgram, deleteProgram };
}
