-- ==========================================
-- TRACE PATCH: 20260803000000_platform_settings_and_rls_fix.sql
-- Phase 0 of the coach-dashboard / client-app split:
-- 1. Close the RLS gap on coach_extensions (never enabled since init)
-- 2. Close the RLS gap on exercises (never enabled since init)
-- 3. Add platform_settings + auto-enroll every new trainee signup to the
--    configured coach (TRACE is now single-coach: there is no more
--    "solo trainee" signup path from the client app)
-- ==========================================


-- ==========================================
-- FIX 1: coach_extensions RLS
-- Table had RLS never enabled at all — fully open (or fully locked,
-- depending on client role) since init. Mirrors the landing_pages
-- public-read / owner-write pattern already used elsewhere.
-- ==========================================
ALTER TABLE public.coach_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach extensions are publicly viewable when public"
    ON public.coach_extensions FOR SELECT
    USING (is_public = TRUE);

CREATE POLICY "Coaches can manage their own extension row"
    ON public.coach_extensions FOR ALL
    USING (auth.uid() = coach_id)
    WITH CHECK (auth.uid() = coach_id);


-- ==========================================
-- FIX 2: exercises RLS
-- Table had RLS never enabled at all. Catalog needs to stay broadly
-- readable (client apps browse it, coach roster/analytics RPCs join it
-- for every trainee) — only writes are restricted to coaches.
-- ==========================================
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read the exercise catalog"
    ON public.exercises FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Coaches can insert exercises"
    ON public.exercises FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'coach'
        )
    );

CREATE POLICY "Coaches can update exercises they created"
    ON public.exercises FOR UPDATE
    USING (created_by_coach_id = auth.uid())
    WITH CHECK (created_by_coach_id = auth.uid());

CREATE POLICY "Coaches can delete exercises they created"
    ON public.exercises FOR DELETE
    USING (created_by_coach_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON public.exercises(target_muscle_group);


-- ==========================================
-- FIX 3: Single-coach auto-enrollment
-- Every trainee who signs up (from the client app) is now automatically
-- this platform's coach's client — there is no more public multi-coach
-- marketplace or "solo trainee" (coach_id IS NULL) path.
-- ==========================================
CREATE TABLE public.platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
-- Intentionally no client-facing policies: platform config is readable only
-- by SECURITY DEFINER functions (the signup trigger below) or the service
-- role / Supabase dashboard. Not user data, not exposed to PostgREST.

-- Bootstrap note: this table starts empty. After creating your own coach
-- account (sign up with raw_user_meta_data.role = 'coach'), run:
--   INSERT INTO public.platform_settings (key, value)
--   VALUES ('default_coach_id', '<your-profile-id>')
--   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
-- Until that row exists, new trainee signups get coach_id = NULL (unassigned)
-- rather than failing.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
  v_default_coach_id UUID;
BEGIN
  v_role := COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'trainee'::public.user_role);

  IF v_role = 'trainee' THEN
    SELECT value::UUID INTO v_default_coach_id
    FROM public.platform_settings
    WHERE key = 'default_coach_id';
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, role, coach_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', 'Trainee'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'User'),
    v_role,
    v_default_coach_id
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
