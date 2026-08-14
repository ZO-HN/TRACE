-- ==========================================
-- TRACE PATCH: 20260815000000_steps_and_cardio_tracking.sql
-- Closes the "Client steps" / "Client cardio" / "Behind on cardio"
-- dashboard schema gap flagged in docs/audit.md: wearable_biometrics had
-- no step-count column, and nothing distinguished cardio vs strength
-- workout_sessions. This is coordinated in docs/trace-app-open-items.md --
-- TRACE-client needs to actually start writing step_count and
-- session_type for these panels to show anything beyond zeros.
-- ==========================================

ALTER TABLE public.wearable_biometrics
    ADD COLUMN IF NOT EXISTS step_count INT CHECK (step_count >= 0);

ALTER TABLE public.workout_sessions
    ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'strength'
        CHECK (session_type IN ('strength', 'cardio', 'mixed'));

-- ==========================================
-- get_coach_steps_summary: avg daily steps per client, trailing N days.
-- Same SECURITY DEFINER + auth.uid() ownership check as the other
-- dashboard-analytics RPCs in 20260813000000_coach_dashboard_analytics.sql.
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_coach_steps_summary(p_coach_id UUID, p_days INT DEFAULT 7)
RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    avg_daily_steps NUMERIC,
    days_logged BIGINT
) AS $$
    SELECT
        p.id,
        p.first_name || ' ' || p.last_name,
        AVG(wb.step_count),
        COUNT(wb.step_count)
    FROM public.profiles p
    LEFT JOIN public.wearable_biometrics wb
        ON wb.user_id = p.id
        AND wb.recorded_date >= (CURRENT_DATE - (p_days || ' days')::interval)
        AND wb.step_count IS NOT NULL
    WHERE p.coach_id = p_coach_id
      AND auth.uid() = p_coach_id
    GROUP BY p.id, p.first_name, p.last_name
    ORDER BY AVG(wb.step_count) DESC NULLS LAST;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==========================================
-- get_coach_cardio_summary: cardio session count + total minutes per
-- client, trailing N days. Ordered ascending (least cardio first) so it
-- can back both the "Client cardio" panel (client-side re-sorted desc)
-- and the "Behind on cardio" panel (used as-is).
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_coach_cardio_summary(p_coach_id UUID, p_days INT DEFAULT 7)
RETURNS TABLE (
    client_id UUID,
    client_name TEXT,
    cardio_sessions BIGINT,
    cardio_minutes NUMERIC
) AS $$
    SELECT
        p.id,
        p.first_name || ' ' || p.last_name,
        COUNT(ws.id),
        COALESCE(SUM(ws.duration_seconds) / 60.0, 0)
    FROM public.profiles p
    LEFT JOIN public.workout_sessions ws
        ON ws.user_id = p.id
        AND ws.session_type = 'cardio'
        AND ws.completed_at >= NOW() - (p_days || ' days')::interval
    WHERE p.coach_id = p_coach_id
      AND auth.uid() = p_coach_id
    GROUP BY p.id, p.first_name, p.last_name
    ORDER BY COALESCE(SUM(ws.duration_seconds), 0) ASC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
