-- ==========================================
-- TRACE PATCH: 20260814020000_server_invite_links.sql
-- Replaces the client-side-only onboarding invite link (base64 config
-- encoded straight into the URL, no server record, unrevokable) with a
-- server-issued opaque invite id, matching the gap identified against
-- Tracked's model:
--   - Link is minted server-side on "Generate Invite Link", not built
--     instantly client-side.
--   - One active link per coach; "Generate New Link" rotates it (revokes
--     the old one, mints a new id) -- enforced by a partial unique index,
--     not just app logic.
--   - A revoked/rotated-away link stops resolving -- the wizard shows
--     "this invite is no longer valid" instead of silently still working.
--   - The enabled/ordered onboarding screens are snapshotted into the
--     invite row at generation time, not read live from Settings -- so
--     editing Settings later doesn't retroactively change an
--     already-shared link's behavior.
--
-- Old base64 `?config=...` links keep working as a read-only fallback
-- (onboardingScreens.ts's parseInviteConfig is untouched) -- only the
-- generation path is replaced, per user decision (full replacement going
-- forward, no migration of already-shared old-style links needed since
-- they still resolve).
-- ==========================================

CREATE TABLE public.client_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    screens_config JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_client_invites_coach ON public.client_invites(coach_id);

-- Enforces "one active link per coach" at the DB level, not just in the
-- RPC below -- a second concurrent generate can't race past this.
CREATE UNIQUE INDEX idx_client_invites_one_active_per_coach
    ON public.client_invites(coach_id) WHERE status = 'active';

ALTER TABLE public.client_invites ENABLE ROW LEVEL SECURITY;

-- Coach can see their own invite history (active + revoked). No direct
-- INSERT/UPDATE policy -- writes only happen through the RPCs below, so
-- the one-active-per-coach invariant can't be bypassed by writing to the
-- table directly.
CREATE POLICY "Coaches can view their own invite links"
    ON public.client_invites FOR SELECT
    USING (coach_id = auth.uid());


-- ==========================================
-- rotate_invite_link: revoke the coach's current active link (if any) and
-- mint a new one with a fresh snapshot of their onboarding screens config.
-- ==========================================
CREATE OR REPLACE FUNCTION public.rotate_invite_link(p_coach_id UUID, p_screens_config JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  IF auth.uid() != p_coach_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_coach_id AND role = 'coach') THEN
    RAISE EXCEPTION 'Not a coach account';
  END IF;

  UPDATE public.client_invites
  SET status = 'revoked', revoked_at = NOW()
  WHERE coach_id = p_coach_id AND status = 'active';

  INSERT INTO public.client_invites (coach_id, screens_config)
  VALUES (p_coach_id, p_screens_config)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- ==========================================
-- revoke_invite_link: kill the coach's current active link without
-- replacing it (e.g. temporarily stop accepting new applicants).
-- ==========================================
CREATE OR REPLACE FUNCTION public.revoke_invite_link(p_coach_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_coach_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.client_invites
  SET status = 'revoked', revoked_at = NOW()
  WHERE coach_id = p_coach_id AND status = 'active';
END;
$$;

-- ==========================================
-- get_invite_link: public (unauthenticated) read used by the /onboarding
-- wizard's intro screen, before the trainee has signed in. Only ever
-- returns a row if the invite is still active -- a revoked/rotated-away
-- id returns nothing, which the wizard renders as "this invite is no
-- longer valid" rather than silently proceeding.
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_invite_link(p_invite_id UUID)
RETURNS TABLE (
    coach_id UUID,
    coach_first_name TEXT,
    screens_config JSONB
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT ci.coach_id, p.first_name, ci.screens_config
  FROM public.client_invites ci
  JOIN public.profiles p ON p.id = ci.coach_id
  WHERE ci.id = p_invite_id AND ci.status = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.rotate_invite_link(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_invite_link(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_link(UUID) TO anon, authenticated;
