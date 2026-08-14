import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface EquipmentRow {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
}

export interface UseEquipment {
  equipment: EquipmentRow[];
  isLoading: boolean;
  error: string | null;
  createEquipment: (input: { name: string; category: string }) => Promise<{ error: string | null }>;
  deleteEquipment: (id: string) => Promise<{ error: string | null }>;
}

export function useEquipment(coachId: string): UseEquipment {
  const [equipment, setEquipment] = useState<EquipmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchEquipment = async () => {
    const { data, error: queryError } = await supabase
      .from('equipment')
      .select('id, name, category, created_at')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });
    if (!mountedRef.current) return;
    if (queryError) setError(queryError.message);
    else {
      setError(null);
      setEquipment((data as EquipmentRow[]) ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchEquipment();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const createEquipment: UseEquipment['createEquipment'] = async ({ name, category }) => {
    const { error: insertError } = await supabase.from('equipment').insert({ coach_id: coachId, name, category: category || null });
    if (!insertError) await fetchEquipment();
    return { error: insertError?.message ?? null };
  };

  const deleteEquipment = async (id: string) => {
    const { error: deleteError } = await supabase.from('equipment').delete().eq('id', id);
    if (!deleteError) await fetchEquipment();
    return { error: deleteError?.message ?? null };
  };

  return { equipment, isLoading, error, createEquipment, deleteEquipment };
}
