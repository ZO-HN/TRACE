-- ==========================================
-- TRACE PATCH: 20260813000000_coach_dashboard_analytics.sql
-- Real dashboard analytics (was all "not tracked yet" placeholders).
-- Business definitions confirmed with the user before writing this:
--   - Churned = no workout_sessions in the trailing 21 days (and had at
--     least one session before that, so brand-new clients aren't
--     miscounted), OR the coach manually marked them churned.
--   - "Wins this week" = a set logged in the last 7 days whose
--     estimated_1rm beats that client's prior best for that exercise.
--   - Client steps / Client cardio panels are explicitly OUT of scope --
--     wearable_biometrics has no step-count column and no table
--     distinguishes cardio vs strength sessions. Left as placeholders,
--     not built here.
-- ==========================================

-- ==========================================
-- 1. Manual churn override
-- ==========================================
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS manually_marked_churned BOOLEAN NOT NULL DEFAULT FALSE;


-- ==========================================
-- 2. Dashboard summary stats (new signups / workouts / churned)
-- SECURITY DEFINER, but only ever returns rows scoped to the calling
-- coach's own clients — verified via auth.uid() = p_coach_id.
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_coach_dashboard_stats(p_coach_id UUID)
RETURNS TABLE (
    new_signups_7d BIGINT,
    workouts_7d BIGINT,
    churned_count BIGINT
) AS $$
    WITH last_session AS (
        SELECT ws.user_id, MAX(ws.completed_at) AS last_at
        FROM public.workout_sessions ws
        GROUP BY ws.user_id
    )
    SELECT
        (SELECT COUNT(*) FROM public.profiles p
         WHERE p.coach_id = p_coach_id AND p.created_at >= NOW() - INTERVAL '7 days'),
        (SELECT COUNT(*) FROM public.workout_sessions ws
         JOIN public.profiles p ON p.id = ws.user_id
         WHERE p.coach_id = p_coach_id AND ws.completed_at >= NOW() - INTERVAL '7 days'),
        (SELECT COUNT(*) FROM public.profiles p
         LEFT JOIN last_session ls ON ls.user_id = p.id
         WHERE p.coach_id = p_coach_id
           AND (
             p.manually_marked_churned = TRUE
             OR (ls.last_at IS NOT NULL AND ls.last_at < NOW() - INTERVAL '21 days')
           ))
    WHERE auth.uid() = p_coach_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ==========================================
-- 3. Weekly wins — new personal records in the last 7 days
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_coach_weekly_wins(p_coach_id UUID)
RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    exercise_name VARCHAR,
    weight_kg NUMERIC,
    reps INT,
    estimated_1rm NUMERIC,
    achieved_at TIMESTAMP WITH TIME ZONE
) AS $$
    WITH ranked AS (
        SELECT
            ws.user_id,
            sl.exercise_id,
            sl.weight_kg,
            sl.reps,
            sl.estimated_1rm,
            ws.completed_at,
            MAX(sl.estimated_1rm) OVER (
                PARTITION BY ws.user_id, sl.exercise_id
                ORDER BY ws.completed_at
                ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
            ) AS prior_best
        FROM public.set_logs sl
        JOIN public.workout_sessions ws ON ws.id = sl.session_id
        WHERE ws.user_id IN (SELECT id FROM public.profiles WHERE coach_id = p_coach_id)
    )
    SELECT
        p.id,
        p.first_name || ' ' || p.last_name,
        e.name,
        r.weight_kg,
        r.reps,
        r.estimated_1rm,
        r.completed_at
    FROM ranked r
    JOIN public.profiles p ON p.id = r.user_id
    JOIN public.exercises e ON e.id = r.exercise_id
    WHERE r.completed_at >= NOW() - INTERVAL '7 days'
      AND (r.prior_best IS NULL OR r.estimated_1rm > r.prior_best)
      AND auth.uid() = p_coach_id
    ORDER BY r.completed_at DESC
    LIMIT 20;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ==========================================
-- 4. Nutrition logging summary — last N days, per client
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_coach_nutrition_summary(p_coach_id UUID, p_days INT DEFAULT 7)
RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    log_count BIGINT,
    avg_calories NUMERIC
) AS $$
    SELECT
        p.id,
        p.first_name || ' ' || p.last_name,
        COUNT(nl.id),
        AVG(nl.calories)
    FROM public.profiles p
    LEFT JOIN public.nutrition_logs nl
        ON nl.user_id = p.id AND nl.logged_at >= NOW() - (p_days || ' days')::interval
    WHERE p.coach_id = p_coach_id
      AND auth.uid() = p_coach_id
    GROUP BY p.id, p.first_name, p.last_name
    ORDER BY COUNT(nl.id) DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
