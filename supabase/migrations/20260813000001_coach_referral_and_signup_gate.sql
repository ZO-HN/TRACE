-- Coach referral / signup gate
--
-- Previously, handle_new_user() auto-enrolled every new trainee under
-- platform_settings.default_coach_id. That's being removed: a trainee now
-- signs up with coach_id = NULL, and TRACE-client blocks them behind a
-- "choose your coach" screen until they either pick a coach from a
-- browsable list or enter a coach's referral code. This migration adds the
-- server-side pieces that screen needs; platform_settings.default_coach_id
-- is left in place (harmless, just unused) rather than dropped, in case a
-- future admin-configured fallback is wanted again.
--
-- Renumbered from the original 20260813000000 draft (collided on timestamp
-- with 20260813000000_coach_dashboard_analytics.sql) and updated to
-- preserve the coach_allowlist invite-only role check added in
-- 20260812010000_coach_allowlist.sql, which the original draft would have
-- silently overwritten (drafted against a stale copy of handle_new_user()).

-- ---------- Coach referral codes ----------
-- Short, human-typeable code per coach. Generated on insert for coach rows;
-- backfilled for existing coaches below.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coach_code TEXT UNIQUE;

CREATE OR REPLACE FUNCTION public.generate_coach_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I, avoids confusion
    result TEXT;
    attempt INT := 0;
BEGIN
    LOOP
        result := '';
        FOR i IN 1..6 LOOP
            result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
        END LOOP;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE coach_code = result);
        attempt := attempt + 1;
        IF attempt > 20 THEN
            RAISE EXCEPTION 'Could not generate a unique coach_code after 20 attempts';
        END IF;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_coach_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'coach' AND NEW.coach_code IS NULL THEN
        NEW.coach_code := public.generate_coach_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_set_coach_code ON public.profiles;
CREATE TRIGGER trg_set_coach_code
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_coach_code();

-- Backfill existing coaches that predate this column.
UPDATE public.profiles
SET coach_code = public.generate_coach_code()
WHERE role = 'coach' AND coach_code IS NULL;

-- ---------- handle_new_user: keep the coach_allowlist check, drop the
-- default_coach_id auto-enroll ----------
-- Preserves the invite-only role assignment from 20260812010000_coach_allowlist.sql
-- (email on public.coach_allowlist => role='coach', else 'trainee') so this
-- migration does NOT reopen client-side role tampering. The only change
-- from that version: trainees always insert with coach_id = NULL instead of
-- being looked up from platform_settings.default_coach_id.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.coach_allowlist WHERE lower(email) = lower(new.email)
  ) THEN
    v_role := 'coach'::public.user_role;
  ELSE
    v_role := 'trainee'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, first_name, last_name, role, coach_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    v_role,
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------- Trainee-facing coach discovery + claim RPCs ----------
-- SECURITY DEFINER so a trainee (whose RLS otherwise only lets them read
-- their own profile) can browse a minimal, safe slice of coach profiles and
-- claim one — without granting broad SELECT on public.profiles.

CREATE OR REPLACE FUNCTION public.list_available_coaches()
RETURNS TABLE (id UUID, first_name TEXT, last_name TEXT, coach_code TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, first_name, last_name, coach_code
  FROM public.profiles
  WHERE role = 'coach'
  ORDER BY first_name, last_name;
$$;

CREATE OR REPLACE FUNCTION public.claim_coach_by_id(p_coach_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_coach_id AND role = 'coach') THEN
    RAISE EXCEPTION 'No coach with that id';
  END IF;

  UPDATE public.profiles
  SET coach_id = p_coach_id
  WHERE id = auth.uid() AND role = 'trainee' AND coach_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You already have a coach, or this account is not a trainee';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_coach_by_code(p_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id UUID;
BEGIN
  SELECT id INTO v_coach_id FROM public.profiles WHERE role = 'coach' AND coach_code = upper(trim(p_code));

  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Invalid coach code';
  END IF;

  UPDATE public.profiles
  SET coach_id = v_coach_id
  WHERE id = auth.uid() AND role = 'trainee' AND coach_id IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You already have a coach, or this account is not a trainee';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_available_coaches() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_coach_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_coach_by_code(TEXT) TO authenticated;
