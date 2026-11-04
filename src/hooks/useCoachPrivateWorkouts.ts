import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PrivateWorkoutItem {
  id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps: number;
  target_rpe: number | null;
  rest_seconds: number;
  exercise: { id: string; name: string } | null;
}
export interface PrivateWorkout {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  template_items: PrivateWorkoutItem[];
}

export function useCoachPrivateWorkouts(coachId: string) {
  const [state, setState] = useState({ owner: coachId, rows: [] as PrivateWorkout[], loading: true, error: null as string | null });
  const revision = useRef(0);
  const lifecycle = useRef({ active: false });
  const owner = useRef(coachId);
  owner.current = coachId;
  const refresh = useCallback(async () => {
    const lease = lifecycle.current;
    if (!lease.active || owner.current !== coachId) return;
    const version = ++revision.current;
    const current = () => lease.active && owner.current === coachId && revision.current === version;
    setState({ owner: coachId, rows: [], loading: true, error: null });
    if (!coachId) { setState({ owner: coachId, rows: [], loading: false, error: null }); return; }
    try {
      const { data, error } = await supabase.from('workout_templates')
        .select('id, name, description, created_at, template_items(id, exercise_id, position, target_sets, target_reps, target_rpe, rest_seconds, exercise:exercises(id, name))')
        .eq('creator_id', coachId).eq('scope', 'PRIVATE').eq('is_active', true)
        .order('created_at', { ascending: false }).order('id');
      if (error) throw new Error(error.message);
      const rows = ((data ?? []) as unknown as PrivateWorkout[]).map((row) => ({
        ...row, template_items: [...row.template_items].sort((a, b) => a.position - b.position),
      }));
      if (current()) setState({ owner: coachId, rows, loading: false, error: null });
    } catch (cause) {
      if (current()) setState({ owner: coachId, rows: [], loading: false,
        error: cause instanceof Error ? cause.message : 'Could not load workouts.' });
    }
  }, [coachId]);
  useEffect(() => {
    const lease = { active: true };
    lifecycle.current = lease;
    void refresh();
    return () => { lease.active = false; };
  }, [refresh]);
  return {
    rows: state.owner === coachId ? state.rows : [],
    loading: state.owner !== coachId || state.loading,
    error: state.owner === coachId ? state.error : null,
    refresh,
  };
}
