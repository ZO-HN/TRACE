import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface MealPlanRow {
  id: string;
  client_id: string | null;
  name: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface UseMealPlans {
  mealPlans: MealPlanRow[];
  isLoading: boolean;
  error: string | null;
  createMealPlan: (input: { name: string; clientId: string; data: Record<string, unknown> }) => Promise<{ error: string | null }>;
  deleteMealPlan: (id: string) => Promise<{ error: string | null }>;
}

export function useMealPlans(coachId: string): UseMealPlans {
  const [mealPlans, setMealPlans] = useState<MealPlanRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchMealPlans = async () => {
    const { data, error: queryError } = await supabase
      .from('meal_plans')
      .select('id, client_id, name, data, created_at')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });
    if (!mountedRef.current) return;
    if (queryError) setError(queryError.message);
    else {
      setError(null);
      setMealPlans((data as MealPlanRow[]) ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchMealPlans();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const createMealPlan: UseMealPlans['createMealPlan'] = async ({ name, clientId, data }) => {
    const { error: insertError } = await supabase
      .from('meal_plans')
      .insert({ coach_id: coachId, client_id: clientId || null, name: name || 'Untitled plan', data });
    if (!insertError) await fetchMealPlans();
    return { error: insertError?.message ?? null };
  };

  const deleteMealPlan = async (id: string) => {
    const { error: deleteError } = await supabase.from('meal_plans').delete().eq('id', id);
    if (!deleteError) await fetchMealPlans();
    return { error: deleteError?.message ?? null };
  };

  return { mealPlans, isLoading, error, createMealPlan, deleteMealPlan };
}
