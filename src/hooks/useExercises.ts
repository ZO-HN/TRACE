// Coach's exercise library — list + create. Primary/secondary muscle
// involvement lives in exercise_muscles (see
// supabase/migrations/20260805000001_exercise_details.sql); target_muscle_group
// on exercises itself is kept in sync for the older solo-analytics RPCs.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type ExerciseType = 'regular' | 'isometric_yielding' | 'isometric_overcoming';
export type MuscleRole = 'primary' | 'secondary';

export interface ExerciseMuscleLink {
  id: string;
  name: string;
  role: MuscleRole;
}

export interface ExerciseRow {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  exercise_type: ExerciseType;
  movement_profile: string | null;
  exercise_position: string | null;
  is_bodyweight: boolean;
  is_unilateral: boolean;
  coaching_cues: string[];
  equipment_tags: string[];
  created_at: string;
  muscles: ExerciseMuscleLink[];
}

export interface CreateExerciseInput {
  name: string;
  category: string;
  description: string;
  exerciseType: ExerciseType;
  movementProfile: string | null;
  position: string | null;
  isBodyweight: boolean;
  isUnilateral: boolean;
  coachingCues: string[];
  equipmentTags: string[];
  primaryMuscles: { id: string; name: string }[];
  secondaryMuscles: { id: string; name: string }[];
}

interface RawExerciseRow {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  exercise_type: ExerciseType;
  movement_profile: string | null;
  exercise_position: string | null;
  is_bodyweight: boolean;
  is_unilateral: boolean;
  coaching_cues: string[] | null;
  equipment_tags: string[] | null;
  created_at: string;
  exercise_muscles: { role: MuscleRole; muscle_group: { id: string; name: string } | null }[] | null;
}

export interface UseExercises {
  exercises: ExerciseRow[];
  isLoading: boolean;
  error: string | null;
  createExercise: (input: CreateExerciseInput) => Promise<{ error: string | null }>;
}

const SELECT_COLUMNS =
  'id, name, category, description, exercise_type, movement_profile, exercise_position, is_bodyweight, is_unilateral, coaching_cues, equipment_tags, created_at, exercise_muscles(role, muscle_group:muscle_groups(id, name))';

function mapRow(r: RawExerciseRow): ExerciseRow {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    description: r.description,
    exercise_type: r.exercise_type,
    movement_profile: r.movement_profile,
    exercise_position: r.exercise_position,
    is_bodyweight: r.is_bodyweight,
    is_unilateral: r.is_unilateral,
    coaching_cues: r.coaching_cues ?? [],
    equipment_tags: r.equipment_tags ?? [],
    created_at: r.created_at,
    muscles: (r.exercise_muscles ?? [])
      .filter((m) => m.muscle_group)
      .map((m) => ({ id: m.muscle_group!.id, name: m.muscle_group!.name, role: m.role })),
  };
}

export function useExercises(coachId: string): UseExercises {
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExercises = async () => {
    // Own exercises + any shared/seeded ones (created_by_coach_id IS NULL).
    // Other coaches' custom exercises stay out of this list even though
    // exercises' SELECT RLS is open to any authenticated user — that
    // policy exists for read paths like useExerciseCatalog.ts (workout
    // logging lookups), not to blend every coach's private library
    // together on this management page.
    const { data, error: queryError } = await supabase
      .from('exercises')
      .select(SELECT_COLUMNS)
      .or(`created_by_coach_id.eq.${coachId},created_by_coach_id.is.null`)
      .order('created_at', { ascending: false });

    if (queryError) {
      setError(queryError.message);
    } else {
      setError(null);
      setExercises(((data as unknown as RawExerciseRow[]) ?? []).map(mapRow));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await fetchExercises();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId]);

  const createExercise = async (input: CreateExerciseInput) => {
    const { data: inserted, error: insertError } = await supabase
      .from('exercises')
      .insert({
        name: input.name,
        category: input.category,
        description: input.description || null,
        exercise_type: input.exerciseType,
        movement_profile: input.movementProfile,
        exercise_position: input.position,
        is_bodyweight: input.isBodyweight,
        is_unilateral: input.isUnilateral,
        coaching_cues: input.coachingCues,
        equipment_tags: input.equipmentTags,
        is_custom: true,
        created_by_coach_id: coachId,
        target_muscle_group: input.primaryMuscles[0]?.name ?? null,
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      return { error: insertError?.message ?? 'Could not create exercise' };
    }

    const links = [
      ...input.primaryMuscles.map(({ id: muscle_group_id }) => ({
        exercise_id: inserted.id,
        muscle_group_id,
        role: 'primary' as const,
      })),
      ...input.secondaryMuscles.map(({ id: muscle_group_id }) => ({
        exercise_id: inserted.id,
        muscle_group_id,
        role: 'secondary' as const,
      })),
    ];

    if (links.length > 0) {
      const { error: linkError } = await supabase.from('exercise_muscles').insert(links);
      if (linkError) return { error: linkError.message };
    }

    await fetchExercises();
    return { error: null };
  };

  return { exercises, isLoading, error, createExercise };
}
