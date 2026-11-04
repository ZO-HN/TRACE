import { useCallback, useEffect, useRef, useState } from 'react';
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
  refresh: () => Promise<void>;
  createMeal: (input: {
    clientId: string;
    category: string;
    label: string;
    consumedAt: string;
    notes: string;
    foodIds: string[];
  }) => Promise<{ error: string | null }>;
}

type LoadScope = { coachId: string; request: number };

export function useMeals(coachId: string): UseMeals {
  const [state, setState] = useState<{ coachId: string; meals: MealRow[]; isLoading: boolean; error: string | null }>(
    () => ({ coachId, meals: [], isLoading: Boolean(coachId), error: null }),
  );
  const owner = useRef(coachId);
  owner.current = coachId;
  const active = useRef<LoadScope | null>(null);

  const fetchMeals = useCallback(async (scope: LoadScope) => {
    const current = () => active.current === scope && owner.current === scope.coachId;
    if (!current()) return;
    const request = ++scope.request;
    setState((previous) => ({ coachId: scope.coachId,
      meals: previous.coachId === scope.coachId ? previous.meals : [], isLoading: true, error: null }));
    try {
      const { data, error: queryError } = await supabase
        .from('meals')
        .select('id, client_id, category, label, consumed_at, notes, food_ids, created_at')
        .eq('coach_id', scope.coachId)
        .order('created_at', { ascending: false });
      if (queryError) throw new Error(queryError.message);
      if (current() && scope.request === request) {
        setState({ coachId: scope.coachId, meals: (data as MealRow[]) ?? [], isLoading: false, error: null });
      }
    } catch (cause) {
      if (current() && scope.request === request) {
        setState((previous) => ({ ...previous, isLoading: false,
          error: cause instanceof Error ? cause.message : 'Could not load meals. Please retry.' }));
      }
    }
  }, []);

  useEffect(() => {
    if (!coachId) {
      active.current = null;
      setState({ coachId, meals: [], isLoading: false, error: null });
      return;
    }
    // A fresh setup identity also separates StrictMode replay and A -> B -> A.
    const scope: LoadScope = { coachId, request: 0 };
    active.current = scope;
    void fetchMeals(scope);
    return () => { if (active.current === scope) active.current = null; };
  }, [coachId, fetchMeals]);

  const refresh = useCallback(async () => {
    const scope = active.current;
    if (scope?.coachId === coachId && owner.current === coachId) await fetchMeals(scope);
  }, [coachId, fetchMeals]);

  const runMutation = async (operation: () => PromiseLike<{ error: { message: string } | null }>) => {
    const scope = active.current;
    if (!scope || scope.coachId !== coachId || owner.current !== coachId) return { error: 'The active coach changed. Please retry from the current account.' };
    try {
      const { error: mutationError } = await operation();
      if (!mutationError) await fetchMeals(scope);
      return { error: mutationError?.message ?? null };
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'Could not update meals. Please retry.' };
    }
  };

  const createMeal: UseMeals['createMeal'] = async ({ clientId, category, label, consumedAt, notes, foodIds }) => runMutation(() => supabase.from('meals').insert({
    coach_id: coachId,
    client_id: clientId || null,
    category: category || null,
    label: label || null,
    consumed_at: consumedAt || null,
    notes: notes || null,
    food_ids: foodIds,
  }));

  const visible = state.coachId === coachId ? state : { meals: [], isLoading: Boolean(coachId), error: null };
  return { meals: visible.meals, isLoading: visible.isLoading, error: visible.error, refresh, createMeal };
}
