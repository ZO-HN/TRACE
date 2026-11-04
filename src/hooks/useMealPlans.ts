import { useCallback, useEffect, useRef, useState } from 'react';
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
  refresh: () => Promise<void>;
  createMealPlan: (input: { name: string; clientId: string; data: Record<string, unknown> }) => Promise<{ error: string | null }>;
  deleteMealPlan: (id: string) => Promise<{ error: string | null }>;
}

type LoadScope = { coachId: string; request: number };

export function useMealPlans(coachId: string): UseMealPlans {
  const [state, setState] = useState<{ coachId: string; mealPlans: MealPlanRow[]; isLoading: boolean; error: string | null }>(
    () => ({ coachId, mealPlans: [], isLoading: Boolean(coachId), error: null }),
  );
  const owner = useRef(coachId);
  owner.current = coachId;
  const active = useRef<LoadScope | null>(null);

  const fetchMealPlans = useCallback(async (scope: LoadScope) => {
    const current = () => active.current === scope && owner.current === scope.coachId;
    if (!current()) return;
    const request = ++scope.request;
    setState((previous) => ({ coachId: scope.coachId,
      mealPlans: previous.coachId === scope.coachId ? previous.mealPlans : [], isLoading: true, error: null }));
    try {
      const { data, error: queryError } = await supabase
        .from('meal_plans')
        .select('id, client_id, name, data, created_at')
        .eq('coach_id', scope.coachId)
        .order('created_at', { ascending: false });
      if (queryError) throw new Error(queryError.message);
      if (current() && scope.request === request) {
        setState({ coachId: scope.coachId, mealPlans: (data as MealPlanRow[]) ?? [], isLoading: false, error: null });
      }
    } catch (cause) {
      if (current() && scope.request === request) {
        setState((previous) => ({ ...previous, isLoading: false,
          error: cause instanceof Error ? cause.message : 'Could not load meal plans. Please retry.' }));
      }
    }
  }, []);

  useEffect(() => {
    if (!coachId) {
      active.current = null;
      setState({ coachId, mealPlans: [], isLoading: false, error: null });
      return;
    }
    // A fresh setup identity also separates StrictMode replay and A -> B -> A.
    const scope: LoadScope = { coachId, request: 0 };
    active.current = scope;
    void fetchMealPlans(scope);
    return () => { if (active.current === scope) active.current = null; };
  }, [coachId, fetchMealPlans]);

  const refresh = useCallback(async () => {
    const scope = active.current;
    if (scope?.coachId === coachId && owner.current === coachId) await fetchMealPlans(scope);
  }, [coachId, fetchMealPlans]);

  const runMutation = async (operation: () => PromiseLike<{ error: { message: string } | null }>) => {
    const scope = active.current;
    if (!scope || scope.coachId !== coachId || owner.current !== coachId) return { error: 'The active coach changed. Please retry from the current account.' };
    try {
      const { error: mutationError } = await operation();
      if (!mutationError) await fetchMealPlans(scope);
      return { error: mutationError?.message ?? null };
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'Could not update meal plans. Please retry.' };
    }
  };

  const createMealPlan: UseMealPlans['createMealPlan'] = async ({ name, clientId, data }) => runMutation(() => supabase
    .from('meal_plans')
    .insert({ coach_id: coachId, client_id: clientId || null, name: name || 'Untitled plan', data }));

  const deleteMealPlan = async (id: string) => runMutation(() => supabase.from('meal_plans').delete().eq('id', id));

  const visible = state.coachId === coachId ? state : { mealPlans: [], isLoading: Boolean(coachId), error: null };
  return { mealPlans: visible.mealPlans, isLoading: visible.isLoading, error: visible.error, refresh, createMealPlan, deleteMealPlan };
}
