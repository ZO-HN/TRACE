// Flat muscle taxonomy for the exercise-creation muscle picker — each row is
// a standalone, selectable entry (see supabase/migrations/20260805000001_exercise_details.sql).

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface MuscleGroup {
  id: string;
  name: string;
}

export interface UseMuscleGroups {
  muscleGroups: MuscleGroup[];
  isLoading: boolean;
  error: string | null;
}

export function useMuscleGroups(): UseMuscleGroups {
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: queryError } = await supabase
        .from('muscle_groups')
        .select('id, name')
        .order('name');
      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
      } else {
        setError(null);
        setMuscleGroups((data as MuscleGroup[]) ?? []);
      }
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { muscleGroups, isLoading, error };
}
