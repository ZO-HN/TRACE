import { useEffect, useRef, useState } from 'react';
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

export function useFoods(coachId: string): UseFoods {
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Guards setState in fetchFoods when it's called from createFood/deleteFood
  // after the component has unmounted (e.g. navigate away mid-save).
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchFoods = async () => {
    const { data, error: queryError } = await supabase
      .from('foods')
      .select('id, name, serving_size, calories, protein_g, carbs_g, fat_g, recipe, created_at')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false });
    if (!mountedRef.current) return;
    if (queryError) setError(queryError.message);
    else {
      setError(null);
      setFoods((data as FoodRow[]) ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchFoods();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const createFood: UseFoods['createFood'] = async ({ name, servingSize, calories, protein, carbs, fat, recipe }) => {
    const { error: insertError } = await supabase.from('foods').insert({
      coach_id: coachId,
      name,
      serving_size: servingSize || null,
      calories: toNumOrNull(calories),
      protein_g: toNumOrNull(protein),
      carbs_g: toNumOrNull(carbs),
      fat_g: toNumOrNull(fat),
      recipe: recipe || null,
    });
    if (!insertError) await fetchFoods();
    return { error: insertError?.message ?? null };
  };

  const deleteFood = async (id: string) => {
    const { error: deleteError } = await supabase.from('foods').delete().eq('id', id);
    if (!deleteError) await fetchFoods();
    return { error: deleteError?.message ?? null };
  };

  return { foods, isLoading, error, createFood, deleteFood };
}
