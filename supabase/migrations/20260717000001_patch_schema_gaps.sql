-- ==========================================
-- TRACE PATCH: 20260717000001_patch_schema_gaps.sql
-- Fixes all critical issues identified in the architectural audit:
-- 1. Add coach_trainee_relations junction table (consumes relation_status ENUM)
-- 2. Add scope column to workout_templates + RLS
-- 3. Add missing set_logs RLS policies
-- 4. Replace slots_occupied with a computed RPC function
-- 5. Harden landing_pages RLS WITH CHECK
-- ==========================================


-- ==========================================
-- FIX 1: Coach-Trainee Relations Junction Table
-- Uses the previously orphaned relation_status ENUM
-- Creates an auditable history of coaching relationships
-- instead of mutating profiles.coach_id directly on status changes
-- ==========================================
CREATE TABLE public.coach_trainee_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    trainee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status public.relation_status NOT NULL DEFAULT 'ACTIVE',
    linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(coach_id, trainee_id)
);

ALTER TABLE public.coach_trainee_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can manage their own relations"
    ON public.coach_trainee_relations FOR ALL
    USING (auth.uid() = coach_id)
    WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Trainees can view their own relation status"
    ON public.coach_trainee_relations FOR SELECT
    USING (auth.uid() = trainee_id);

CREATE INDEX IF NOT EXISTS idx_relations_coach ON public.coach_trainee_relations(coach_id);
CREATE INDEX IF NOT EXISTS idx_relations_trainee ON public.coach_trainee_relations(trainee_id);


-- ==========================================
-- FIX 2: workout_templates scope column + RLS
-- Prevents solo trainees from accidentally reading
-- private coach-assigned program templates
-- ==========================================
CREATE TYPE public.template_scope AS ENUM ('PUBLIC', 'PRIVATE', 'ASSIGNED');

ALTER TABLE public.workout_templates
    ADD COLUMN IF NOT EXISTS scope public.template_scope NOT NULL DEFAULT 'PRIVATE',
    ADD COLUMN IF NOT EXISTS assigned_trainee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;

-- Creators can always read and modify their own templates
CREATE POLICY "Creators can manage their own templates"
    ON public.workout_templates FOR ALL
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

-- Anyone can read PUBLIC templates (global exercise library)
CREATE POLICY "Public templates are readable by all authenticated users"
    ON public.workout_templates FOR SELECT
    USING (scope = 'PUBLIC' AND auth.uid() IS NOT NULL);

-- Assigned trainees can read templates assigned specifically to them
CREATE POLICY "Assigned trainees can read their assigned templates"
    ON public.workout_templates FOR SELECT
    USING (scope = 'ASSIGNED' AND assigned_trainee_id = auth.uid());


-- ==========================================
-- FIX 3: set_logs missing RLS policies
-- Critical: table had RLS enabled but NO policies,
-- making ALL set log data inaccessible in production
-- ==========================================

-- Users can read their own set logs (via session ownership)
CREATE POLICY "Users can view their own set logs"
    ON public.set_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_sessions ws
            WHERE ws.id = set_logs.session_id
            AND ws.user_id = auth.uid()
        )
    );

-- Users can insert set logs into their own sessions
CREATE POLICY "Users can insert set logs into their own sessions"
    ON public.set_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_sessions ws
            WHERE ws.id = set_logs.session_id
            AND ws.user_id = auth.uid()
        )
    );

-- Users can update their own set logs
CREATE POLICY "Users can update their own set logs"
    ON public.set_logs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_sessions ws
            WHERE ws.id = set_logs.session_id
            AND ws.user_id = auth.uid()
        )
    );

-- Coaches can view set logs of their connected clients
CREATE POLICY "Coaches can view connected clients set logs"
    ON public.set_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.workout_sessions ws
            JOIN public.profiles client ON client.id = ws.user_id
            WHERE ws.id = set_logs.session_id
            AND client.coach_id = auth.uid()
        )
    );


-- ==========================================
-- FIX 4: Replace slots_occupied drift risk
-- Drop the unreliable integer counter and replace
-- with a computed RPC function that reads truth from profiles
-- ==========================================
ALTER TABLE public.coach_extensions DROP COLUMN IF EXISTS slots_occupied;

-- Computed function: always accurate, cannot drift
CREATE OR REPLACE FUNCTION public.get_coach_slot_count(p_coach_id UUID)
RETURNS INTEGER AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.profiles
    WHERE coach_id = p_coach_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ==========================================
-- FIX 5: Harden landing_pages RLS WITH CHECK
-- Original FOR ALL policy had no WITH CHECK clause,
-- allowing potential coach_id spoofing on INSERT
-- ==========================================
DROP POLICY IF EXISTS "Coaches can edit their own landing page" ON public.landing_pages;

CREATE POLICY "Coaches can edit their own landing page"
    ON public.landing_pages FOR ALL
    USING (auth.uid() = coach_id)
    WITH CHECK (auth.uid() = coach_id);


-- ==========================================
-- FIX 6: Roster Telemetry RPC (prevents N+1 queries)
-- Returns all clients for a coach with their latest
-- wearable biometrics and session count in one query
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_coach_roster_telemetry(p_coach_id UUID)
RETURNS TABLE (
    trainee_id UUID,
    first_name VARCHAR,
    last_name VARCHAR,
    experience_level public.experience_tier,
    total_sessions BIGINT,
    latest_hrv INT,
    latest_sleep_score INT,
    latest_readiness_score INT,
    latest_biometric_date DATE
) AS $$
    SELECT
        p.id AS trainee_id,
        p.first_name,
        p.last_name,
        p.experience_level,
        COUNT(ws.id) AS total_sessions,
        wb.hrv_ms AS latest_hrv,
        wb.sleep_score AS latest_sleep_score,
        wb.readiness_score AS latest_readiness_score,
        wb.recorded_date AS latest_biometric_date
    FROM public.profiles p
    LEFT JOIN public.workout_sessions ws ON ws.user_id = p.id
    LEFT JOIN LATERAL (
        SELECT hrv_ms, sleep_score, readiness_score, recorded_date
        FROM public.wearable_biometrics
        WHERE user_id = p.id
        ORDER BY recorded_date DESC
        LIMIT 1
    ) wb ON TRUE
    WHERE p.coach_id = p_coach_id
    GROUP BY p.id, p.first_name, p.last_name, p.experience_level,
             wb.hrv_ms, wb.sleep_score, wb.readiness_score, wb.recorded_date;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
