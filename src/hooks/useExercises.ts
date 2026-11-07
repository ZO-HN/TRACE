// Coach's exercise library — list + create. Primary/secondary muscle
// involvement lives in exercise_muscles (see
// supabase/migrations/20260805000001_exercise_details.sql); target_muscle_group
// on exercises itself is kept in sync for the older solo-analytics RPCs.

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { escapeExerciseSearch, EXERCISE_PAGE_SIZE } from '../lib/exerciseCatalogQuery';

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
  search: string;
  setSearch: (value: string) => void;
  isLoadingMore: boolean;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
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

type LoadedData = { exercises: ExerciseRow[] };
type LoadScope = { owner: string; search: string; request: number; loadingMore: boolean };
type ExerciseState = LoadedData & { owner: string; search: string; isLoading: boolean; isLoadingMore: boolean; error: string | null; hasMore: boolean; nextOffset: number };
const emptyData = (owner: string, search = ''): ExerciseState => ({ exercises: [], owner, search, isLoading: Boolean(owner), isLoadingMore: false, error: null, hasMore: false, nextOffset: 0 });

export function useExercises(coachId: string): UseExercises {
  const [search, setSearchState] = useState('');
  const [state, setState] = useState<ExerciseState>(() => emptyData(coachId));
  const owner = useRef(coachId);
  owner.current = coachId;
  const searchRef = useRef(search);
  searchRef.current = search;
  const active = useRef<LoadScope | null>(null);

  const loadPage = useCallback(async (scope: LoadScope, offset: number, append: boolean) => {
    if (active.current !== scope || owner.current !== scope.owner || searchRef.current !== scope.search) return;
    const request = ++scope.request;
    setState((previous) => ({
      ...(previous.owner === scope.owner && previous.search === scope.search ? previous : emptyData(scope.owner, scope.search)),
      owner: scope.owner, search: scope.search, isLoading: !append, isLoadingMore: append, error: null,
    }));
    try {
      let query = supabase.from('exercises')
        .select(SELECT_COLUMNS)
        .or(`created_by_coach_id.eq.${scope.owner},created_by_coach_id.is.null`);
      if (scope.search) query = query.ilike('name', `%${escapeExerciseSearch(scope.search)}%`);
      const ordered = query.order('name', { ascending: true }).order('id', { ascending: true });
      const pageQuery = ordered.range(offset, offset + EXERCISE_PAGE_SIZE - 1);
      const { data, error: queryError } = await pageQuery;
      if (queryError) throw new Error(queryError.message);
      const mapped = ((data as unknown as RawExerciseRow[]) ?? []).map(mapRow);
      if (active.current !== scope || owner.current !== scope.owner || searchRef.current !== scope.search || scope.request !== request) return;
      setState((previous) => {
        if (previous.owner !== scope.owner || previous.search !== scope.search) return previous;
        const exercises = append ? [...previous.exercises, ...mapped.filter((row) => !previous.exercises.some((loaded) => loaded.id === row.id))] : mapped;
        return { ...previous, exercises, owner: scope.owner, search: scope.search, isLoading: false, isLoadingMore: false,
          error: null, hasMore: mapped.length === EXERCISE_PAGE_SIZE, nextOffset: offset + mapped.length };
      });
    } catch (cause) {
      if (active.current !== scope || owner.current !== scope.owner || searchRef.current !== scope.search || scope.request !== request) return;
      setState((previous) => ({ ...previous, isLoading: false, isLoadingMore: false,
        error: cause instanceof Error ? cause.message : 'Could not load data. Please retry.' }));
    }
  }, []);

  useEffect(() => {
    if (!coachId) {
      active.current = null;
      setState(emptyData(coachId));
      return;
    }
    const scope: LoadScope = { owner: coachId, search, request: 0, loadingMore: false };
    active.current = scope;
    void loadPage(scope, 0, false);
    return () => { if (active.current === scope) { active.current = null; scope.request += 1; } };
  }, [coachId, search, loadPage]);

  const updateSearch = useCallback((value: string) => {
    if (value === searchRef.current) return;
    searchRef.current = value;
    if (active.current) active.current.request += 1;
    setSearchState(value);
    setState(emptyData(owner.current, value));
  }, []);

  const refresh = useCallback(async () => {
    const scope = active.current;
    if (scope?.owner === coachId && scope.search === searchRef.current && owner.current === coachId) await loadPage(scope, 0, false);
  }, [coachId, loadPage]);

  const loadMore = useCallback(async () => {
    const scope = active.current;
    if (!scope || scope.owner !== coachId || scope.search !== searchRef.current || owner.current !== coachId
      || scope.loadingMore || !state.hasMore || state.isLoading || state.isLoadingMore || state.owner !== coachId || state.search !== scope.search) return;
    scope.loadingMore = true;
    try { await loadPage(scope, state.nextOffset, true); }
    finally { scope.loadingMore = false; }
  }, [coachId, loadPage, state.hasMore, state.isLoading, state.isLoadingMore, state.nextOffset, state.owner, state.search]);

  const runMutation = async (operation: (scope: LoadScope) => Promise<{ error: string | null }>) => {
    const scope = active.current;
    if (!scope || scope.owner !== coachId || owner.current !== coachId) return { error: 'The active account changed. Please retry from the current view.' };
    try {
      const result = await operation(scope);
      if (!result.error && active.current === scope && owner.current === scope.owner) {
        if (searchRef.current) updateSearch('');
        else await loadPage(scope, 0, false);
      }
      return result;
    } catch (cause) {
      return { error: cause instanceof Error ? cause.message : 'Could not complete the operation. Please retry.' };
    }
  };

  const createExercise = async (input: CreateExerciseInput) => runMutation(async (scope) => {
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
      if (active.current !== scope || owner.current !== scope.owner) {
        return { error: 'The active coach changed. The exercise may already have been created; reopen the library before retrying.' };
      }
      const { error: linkError } = await supabase.from('exercise_muscles').insert(links);
      if (linkError) return { error: linkError.message };
    }

    return { error: null };
  });

  const visible = state.owner === coachId && state.search === search
    ? state : emptyData(coachId, search);
  return { exercises: visible.exercises, isLoading: visible.isLoading, error: visible.error, search, setSearch: updateSearch,
    isLoadingMore: visible.isLoadingMore, hasMore: visible.hasMore, refresh, loadMore, createExercise };
}
