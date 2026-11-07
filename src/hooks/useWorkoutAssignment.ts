import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { expectedWorkoutSnapshot } from '../lib/templates/assignment';
import type { PrivateWorkout } from './useCoachPrivateWorkouts';

export function useWorkoutAssignment(coachId: string, workout: PrivateWorkout) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'error' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const ids = useRef<{ operation: string; assigned: string; trainee: string } | null>(null);
  const pending = useRef<Promise<string | null> | null>(null);
  const generation = useRef(0);
  const lifecycle = useRef({ active: false });
  useEffect(() => {
    const lease = { active: true };
    lifecycle.current = lease;
    ++generation.current;
    return () => { lease.active = false; ++generation.current; };
  }, []);

  const assign = (traineeId: string) => {
    if (!lifecycle.current.active) return Promise.resolve(null);
    if (pending.current) return ids.current?.trainee === traineeId ? pending.current : Promise.resolve(null);
    const version = generation.current;
    const current = () => lifecycle.current.active && generation.current === version;
    const operation = (async () => {
      try {
        if (ids.current && ids.current.trainee !== traineeId) throw new Error('Retry the pending assignment before choosing another trainee.');
        ids.current ??= { operation: crypto.randomUUID(), assigned: crypto.randomUUID(), trainee: traineeId };
        setStatus('saving'); setError(null);
        const { data, error: rpcError } = await supabase.rpc('assign_workout_template', {
          p_operation_id: ids.current.operation,
          p_assigned_template_id: ids.current.assigned,
          p_source_template_id: workout.id,
          p_coach_id: coachId,
          p_trainee_id: traineeId,
          p_expected_snapshot: expectedWorkoutSnapshot(workout),
        });
        if (rpcError) throw new Error(rpcError.message);
        if (data !== ids.current.assigned) throw new Error('Assignment outcome is unknown. Retry the same assignment.');
        if (!current()) return null;
        ids.current = null;
        setStatus('saved');
        return data as string;
      } catch (cause) {
        if (current()) {
          setError(cause instanceof Error ? cause.message : 'Could not assign workout. Retry the same assignment.');
          setStatus('error');
        }
        return null;
      }
    })();
    pending.current = operation;
    void operation.finally(() => { if (pending.current === operation) pending.current = null; });
    return operation;
  };
  return { assign, status, error };
}
