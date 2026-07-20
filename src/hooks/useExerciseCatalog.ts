// Loads the exercise catalog from Supabase and exposes a name -> id lookup.
// Offline (or before env config) the fetch fails softly and the logger falls
// back to placeholder ids; queued items retry once real ids are available.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { indexByName, type ExerciseRow } from '../lib/workout/catalog';

export interface ExerciseCatalog {
  byName: Record<string, string>;
  rows: ExerciseRow[];
  isLoaded: boolean;
}

export function useExerciseCatalog(): ExerciseCatalog {
  const [byName, setByName] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from('exercises')
          .select('id, name')
          .order('name');
        if (!cancelled && !error && data) {
          setByName(indexByName(data as ExerciseRow[]));
          setRows(data as ExerciseRow[]);
          setIsLoaded(true);
        }
      } catch {
        // Offline / unconfigured — leave the empty index; logger degrades.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { byName, rows, isLoaded };
}
