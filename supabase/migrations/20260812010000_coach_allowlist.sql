-- ==========================================
-- TRACE PATCH: 20260812010000_coach_allowlist.sql
-- Invite-only coach signup: TRACE is now a multi-coach deployment (each
-- coach's clients/data are already isolated by coach_id scoping on every
-- coach-owned table), but only a platform-admin-curated allowlist of
-- emails may ever become a coach account — via email OTP *or* Google
-- OAuth. The role decision moves server-side so it no longer depends on
-- client-supplied signup metadata (which a user could tamper with before
-- this patch, e.g. `role: 'coach'` in the OTP signup payload).
-- ==========================================

-- ==========================================
-- 1. Platform admin flag
-- The person(s) allowed to manage the coach allowlist. Not a new role in
-- user_role (that stays coach/trainee) — this is an orthogonal permission
-- on top of a coach profile.
-- ==========================================
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Bootstrap note: this starts FALSE for everyone, including existing coach
-- rows. After this migration is applied, run once:
--   UPDATE public.profiles SET is_platform_admin = TRUE WHERE id = '<your-profile-id>';


-- ==========================================
-- 2. Coach allowlist
-- ==========================================
CREATE TABLE public.coach_allowlist (
    email TEXT PRIMARY KEY,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.coach_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view the coach allowlist"
    ON public.coach_allowlist FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_platform_admin = TRUE)
    );

CREATE POLICY "Platform admins can add to the coach allowlist"
    ON public.coach_allowlist FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_platform_admin = TRUE)
    );

CREATE POLICY "Platform admins can remove from the coach allowlist"
    ON public.coach_allowlist FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_platform_admin = TRUE)
    );

-- Bootstrap note: seed your own email so it's on record (your profile row
-- already exists from before this migration, so handle_new_user() below
-- won't re-run for you — this row is just for the audit trail / so the
-- allowlist UI shows you in the list):
--   INSERT INTO public.coach_allowlist (email) VALUES ('<your-email>')
--   ON CONFLICT (email) DO NOTHING;


-- ==========================================
-- 3. Signup trigger: decide role server-side from the allowlist
-- Replaces the previous version, which trusted raw_user_meta_data->>'role'
-- from the client. Now: allowlisted email => coach (no coach_id, they run
-- their own workspace). Everyone else => trainee, auto-enrolled under
-- platform_settings.default_coach_id same as before. Email match is
-- case-insensitive since email providers vary in casing.
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
  v_default_coach_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.coach_allowlist WHERE lower(email) = lower(new.email)
  ) THEN
    v_role := 'coach'::public.user_role;
    v_default_coach_id := NULL;
  ELSE
    v_role := 'trainee'::public.user_role;
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
