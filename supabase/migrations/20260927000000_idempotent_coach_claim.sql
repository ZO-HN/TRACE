-- Allow onboarding retries for a trainee already linked to the same coach.
-- Switching to a different coach remains blocked by the NULL/current-coach checks.

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
  WHERE id = auth.uid()
    AND role = 'trainee'
    AND (coach_id IS NULL OR coach_id = p_coach_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You already have a different coach, or this account is not a trainee';
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
  SELECT id INTO v_coach_id
  FROM public.profiles
  WHERE role = 'coach' AND coach_code = upper(trim(p_code));

  IF v_coach_id IS NULL THEN
    RAISE EXCEPTION 'Invalid coach code';
  END IF;

  UPDATE public.profiles
  SET coach_id = v_coach_id
  WHERE id = auth.uid()
    AND role = 'trainee'
    AND (coach_id IS NULL OR coach_id = v_coach_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You already have a different coach, or this account is not a trainee';
  END IF;
END;
$$;
