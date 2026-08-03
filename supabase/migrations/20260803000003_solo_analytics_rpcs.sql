-- ==========================================
-- TRACE PATCH: 20260803000003_solo_analytics_rpcs.sql
-- Phase 4: solo analytics — Personal Records, Exercise Statistics, Muscle
-- Analytics. All three are computed over existing set_logs/exercises/
-- workout_sessions data — no new tables.
--
-- Unlike get_coach_roster_telemetry / get_coach_slot_count (see
-- 20260717000001_patch_schema_gaps.sql), these SECURITY DEFINER functions
-- explicitly check the caller is either the trainee themselves or that
-- trainee's coach before returning anything, rather than trusting the
-- p_user_id argument blindly. (The two older functions have the same gap
-- and should get the same fix — tracked separately, not part of this
-- migration so as not to touch unrelated, already-shipped behavior here.)
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_personal_records(p_user_id UUID)
RETURNS TABLE (
    exercise_id UUID,
    exercise_name VARCHAR,
    target_muscle_group VARCHAR,
    best_estimated_1rm NUMERIC,
    best_weight_kg NUMERIC,
    best_reps INT,
    achieved_at TIMESTAMP WITH TIME ZONE
) AS $$
    SELECT DISTINCT ON (sl.exercise_id)
        sl.exercise_id,
        e.name,
        e.target_muscle_group,
        sl.estimated_1rm,
        sl.weight_kg,
        sl.reps,
        ws.completed_at
    FROM public.set_logs sl
    JOIN public.workout_sessions ws ON ws.id = sl.session_id
    JOIN public.exercises e ON e.id = sl.exercise_id
    WHERE ws.user_id = p_user_id
      AND (
        auth.uid() = p_user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = p_user_id AND coach_id = auth.uid()
        )
      )
    ORDER BY sl.exercise_id, sl.estimated_1rm DESC NULLS LAST, ws.completed_at DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.get_exercise_stats(
    p_user_id UUID,
    p_exercise_id UUID,
    p_days INT DEFAULT 90
)
RETURNS TABLE (
    session_date DATE,
    total_volume_kg NUMERIC,
    top_weight_kg NUMERIC,
    top_estimated_1rm NUMERIC,
    total_sets BIGINT
) AS $$
    SELECT
        ws.completed_at::date,
        SUM(sl.weight_kg * sl.reps),
        MAX(sl.weight_kg),
        MAX(sl.estimated_1rm),
        COUNT(*)
    FROM public.set_logs sl
    JOIN public.workout_sessions ws ON ws.id = sl.session_id
    WHERE ws.user_id = p_user_id
      AND sl.exercise_id = p_exercise_id
      AND ws.completed_at >= NOW() - (p_days || ' days')::interval
      AND (
        auth.uid() = p_user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = p_user_id AND coach_id = auth.uid()
        )
      )
    GROUP BY ws.completed_at::date
    ORDER BY ws.completed_at::date;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.get_muscle_analytics(
    p_user_id UUID,
    p_days INT DEFAULT 30
)
RETURNS TABLE (
    target_muscle_group VARCHAR,
    total_volume_kg NUMERIC,
    total_sets BIGINT
) AS $$
    SELECT
        e.target_muscle_group,
        SUM(sl.weight_kg * sl.reps),
        COUNT(*)
    FROM public.set_logs sl
    JOIN public.workout_sessions ws ON ws.id = sl.session_id
    JOIN public.exercises e ON e.id = sl.exercise_id
    WHERE ws.user_id = p_user_id
      AND ws.completed_at >= NOW() - (p_days || ' days')::interval
      AND (
        auth.uid() = p_user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = p_user_id AND coach_id = auth.uid()
        )
      )
    GROUP BY e.target_muscle_group
    ORDER BY SUM(sl.weight_kg * sl.reps) DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
