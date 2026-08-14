import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface MealRow {
  id: string;
  client_id: string | null;
  category: string | null;
  label: string | null;
  consumed_at: string | null;
  notes: string | null;
  food_ids: string[];
  created_at: string;
}

export interface UseMeals {
  meals: MealRow[];
  isLoading: boolean;
  error: string | null;
  createMeal: (input: {
    clientId: string;
    category: string;
    label: string;
    consumedAt: string;
    notes: string;
    foodIds: string[];
  }) => Promise<{ error: string | null }>;
}

export function useMeals(coachId: string): UseMeals {
  const [meals, setMeals] = useState<MealRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchMeals = async () => {
    const { data, error: queryError } = await supabase
      .from('meals')
      .select('id, client_id, category, label, consumed_at, notes, food_ids, created_at')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });
    if (!mountedRef.current) return;
    if (queryError) setError(queryError.message);
    else {
      setError(null);
      setMeals((data as MealRow[]) ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchMeals();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const createMeal: UseMeals['createMeal'] = async ({ clientId, category, label, consumedAt, notes, foodIds }) => {
    const { error: insertError } = await supabase.from('meals').insert({
      coach_id: coachId,
      client_id: clientId || null,
      category: category || null,
      label: label || null,
      consumed_at: consumedAt || null,
      notes: notes || null,
      food_ids: foodIds,
    });
    if (!insertError) await fetchMeals();
    return { error: insertError?.message ?? null };
  };

  return { meals, isLoading, error, createMeal };
}
