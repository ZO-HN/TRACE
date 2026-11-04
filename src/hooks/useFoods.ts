import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface FoodRow {
  id: string;
  name: string;
  serving_size: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  recipe: string | null;
  created_at: string;
}

export interface UseFoods {
  foods: FoodRow[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createFood: (input: {
    name: string;
    servingSize: string;
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    recipe: string;
  }) => Promise<{ error: string | null }>;
  deleteFood: (id: string) => Promise<{ error: string | null }>;
}

function toNumOrNull(v: string): number | null {
  const n = Number(v);
  return v.trim() !== '' && !Number.isNaN(n) ? n : null;
}

type LoadScope = { coachId: string; request: number };

export function useFoods(coachId: string): UseFoods {
  const [state, setState] = useState<{ coachId: string; foods: FoodRow[]; isLoading: boolean; error: string | null }>(
    () => ({ coachId, foods: [], isLoading: Boolean(coachId), error: null }),
  );
  const owner = useRef(coachId);
  owner.current = coachId;
  const active = useRef<LoadScope | null>(null);

  const fetchFoods = useCallback(async (scope: LoadScope) => {
    const current = () => active.current === scope && owner.current === scope.coachId;
    if (!current()) return;
    const request = ++scope.request;
    setState((previous) => ({ coachId: scope.coachId,
      foods: previous.coachId === scope.coachId ? previous.foods : [], isLoading: true, error: null }));
    try {
      const { data, error: queryError } = await supabase
        .from('foods')
        .select('id, name, serving_size, calories, protein_g, carbs_g, fat_g, recipe, created_at')
        .eq('coach_id', scope.coachId)
        .order('created_at', { ascending: false });
      if (queryError) throw new Error(queryError.message);
      if (current() && scope.request === request) {
        setState({ coachId: scope.coachId, foods: (data as FoodRow[]) ?? [], isLoading: false, error: null });
      }
    } catch (cause) {
      if (current() && scope.request === request) {
        setState((previous) => ({ ...previous, isLoading: false,
          error: cause instanceof Error ? cause.message : 'Could not load foods. Please retry.' }));
      }
    }
  }, []);

  useEffect(() => {
    if (!coachId) {
      active.current = null;
      setState({ coachId, foods: [], isLoading: false, error: null });
      return;
    }
    // A fresh setup identity also separates StrictMode replay and A -> B -> A.
    const scope: LoadScope = { coachId, request: 0 };
    active.current = scope;
    void fetchFoods(scope);
    return () => { if (active.current === scope) active.current = null; };
  }, [coachId, fetchFoods]);

  const refresh = useCallback(async () => {
    const scope = active.current;
    if (scope?.coachId === coachId && owner.current === coachId) await fetchFoods(scope);
  }, [coachId, fetchFoods]);

  const runMutation = async (operation: () => PromiseLike<{ error: { message: string } | null }>) => {
    const scope = active.current;
    if (!scope || scope.coachId !== coachId || owner.current !== coachId) return { error: 'The active coach changed. Please retry from the current account.' };
    try {
      const { error: mutationError } = await operation();
      if (!mutationError) await fetchFoods(scope);
      return { error: mutationError?.message ?? null };
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'Could not update foods. Please retry.' };
    }
  };

  const createFood: UseFoods['createFood'] = async ({ name, servingSize, calories, protein, carbs, fat, recipe }) => runMutation(() => supabase.from('foods').insert({
    coach_id: coachId,
    name,
    serving_size: servingSize || null,
    calories: toNumOrNull(calories),
    protein_g: toNumOrNull(protein),
    carbs_g: toNumOrNull(carbs),
    fat_g: toNumOrNull(fat),
    recipe: recipe || null,
  }));

  const deleteFood = async (id: string) => runMutation(() => supabase.from('foods').delete().eq('id', id));

  const visible = state.coachId === coachId ? state : { foods: [], isLoading: Boolean(coachId), error: null };
  return { foods: visible.foods, isLoading: visible.isLoading, error: visible.error, refresh, createFood, deleteFood };
}
