-- Additive onboarding drafts and receipt-backed completion. Old submissions stay intact.
ALTER TABLE public.onboarding_responses
  ADD COLUMN invite_id uuid REFERENCES public.client_invites(id),
  ADD COLUMN operation_id uuid UNIQUE,
  ADD COLUMN form_version integer,
  ADD COLUMN form_config jsonb,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN reviewed_by uuid REFERENCES public.profiles(id);

CREATE TABLE public.client_onboarding_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_id uuid NOT NULL REFERENCES public.client_invites(id),
  coach_id uuid NOT NULL REFERENCES public.profiles(id),
  coach_name text NOT NULL,
  form_version integer NOT NULL DEFAULT 1 CHECK (form_version = 1),
  form_config jsonb NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(answers) = 'object'),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  submitted_response_id uuid REFERENCES public.onboarding_responses(id),
  submission_operation_id uuid UNIQUE,
  submission_revision integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainee_id, invite_id)
);
ALTER TABLE public.client_onboarding_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_onboarding_drafts FROM PUBLIC, anon, authenticated;

-- Harden the compatible legacy insert path without deleting old answers.
DROP POLICY "Trainees can submit their own onboarding responses" ON public.onboarding_responses;
CREATE POLICY "Trainees can submit their own onboarding responses"
  ON public.onboarding_responses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = trainee_id AND EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'trainee'
      AND p.coach_id = onboarding_responses.coach_id
    ) AND operation_id IS NULL AND invite_id IS NULL AND form_version IS NULL AND form_config IS NULL
      AND reviewed_at IS NULL AND reviewed_by IS NULL);

CREATE FUNCTION public.onboarding_form_v1(p_config jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path = '' AS $$
DECLARE v_form jsonb := '[{"k":"name","e":true},{"k":"email","e":true}]'; v_item jsonb; v_key text;
BEGIN
  IF jsonb_typeof(p_config) IS DISTINCT FROM 'array' OR jsonb_array_length(p_config) > 32 THEN
    RAISE EXCEPTION 'Invalid invitation form; ask the coach for a new link';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_config) LOOP
    v_key := v_item->>'k';
    IF v_key IN ('dob','height','weight','current-goal','current-workouts','current-training-split',
      'exercise-selection','equipment-list-gym','injuries','avg-cardio-per-week','avg-steps-per-day',
      'food-preferences','allergies','daily-calories','daily-macros','avg-number-meals-per-day',
      'meals-you-usually-eat','num-meals-before-gym','pre-workout-meal','recent-physique-shots')
      AND v_item->'e' = 'true'::jsonb AND NOT v_form @> jsonb_build_array(jsonb_build_object('k',v_key)) THEN
      v_form := v_form || jsonb_build_array(jsonb_build_object('k',v_key,'e',true));
    END IF;
  END LOOP;
  RETURN v_form;
END $$;
REVOKE ALL ON FUNCTION public.onboarding_form_v1(jsonb) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.validate_onboarding_v1(p_answers jsonb, p_form jsonb, p_complete boolean)
RETURNS void LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE v_key text; v_value jsonb; v_text text; v_field text; v_month int; v_date date;
BEGIN
  IF p_answers IS NULL OR jsonb_typeof(p_answers) IS DISTINCT FROM 'object' OR octet_length(p_answers::text) > 32768 THEN
    RAISE EXCEPTION 'Answers must be an object no larger than 32 KiB';
  END IF;
  FOR v_key,v_value IN SELECT key,value FROM jsonb_each(p_answers) LOOP
    IF NOT p_form @> jsonb_build_array(jsonb_build_object('k',v_key)) THEN RAISE EXCEPTION 'Unknown or disabled question: %',v_key; END IF;
    IF v_key IN ('current-goal','current-workouts','exercise-selection','equipment-list-gym','injuries','food-preferences','allergies','meals-you-usually-eat') THEN
      IF jsonb_typeof(v_value) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Expected a list for %',v_key; END IF;
      IF jsonb_array_length(v_value) > 50 OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_value) e
        WHERE jsonb_typeof(e) IS DISTINCT FROM 'string' OR char_length(e#>>'{}') > 280) THEN
        RAISE EXCEPTION 'Invalid or oversized list for %',v_key;
      END IF;
    ELSIF v_key IN ('dob','daily-macros') THEN
      IF jsonb_typeof(v_value) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Expected fields for %',v_key; END IF;
      FOR v_field IN SELECT key FROM jsonb_each(v_value) LOOP
        IF (v_key='dob' AND v_field NOT IN ('month','day','year')) OR
          (v_key='daily-macros' AND v_field NOT IN ('protein','carbs','fat')) OR
          jsonb_typeof(v_value->v_field) IS DISTINCT FROM 'string' OR char_length(v_value->>v_field)>64 THEN
          RAISE EXCEPTION 'Invalid fields for %',v_key;
        END IF;
      END LOOP;
    ELSE
      IF jsonb_typeof(v_value) IS DISTINCT FROM 'string' OR char_length(v_value#>>'{}')>4000 THEN
        RAISE EXCEPTION 'Invalid or oversized answer for %',v_key;
      END IF;
    END IF;
  END LOOP;
  IF NOT p_complete THEN RETURN; END IF;
  FOR v_key IN SELECT value->>'k' FROM jsonb_array_elements(p_form) LOOP
    v_value := p_answers->v_key;
    IF v_value IS NULL THEN RAISE EXCEPTION 'Answer required: %',v_key; END IF;
    IF jsonb_typeof(v_value)='array' THEN
      IF jsonb_array_length(v_value)=0 OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(v_value) e WHERE btrim(e)='') THEN
        RAISE EXCEPTION 'Answer required: %',v_key;
      END IF;
      IF v_key='current-goal' AND (jsonb_array_length(v_value)>3 OR EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(v_value) e WHERE e NOT IN
        ('Build muscle','Lose weight','Improve strength','Increase endurance','General fitness','Sport-specific training','Rehabilitation'))) THEN
        RAISE EXCEPTION 'Choose one to three supported goals';
      END IF;
    ELSIF v_key='dob' THEN
      IF coalesce(v_value->>'day','') !~ '^\d{1,2}$' OR coalesce(v_value->>'year','') !~ '^\d{4}$' THEN RAISE EXCEPTION 'Enter a valid date of birth'; END IF;
      v_month := array_position(ARRAY['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'],lower(left(v_value->>'month',3)));
      BEGIN v_date := make_date((v_value->>'year')::int,v_month,(v_value->>'day')::int);
      EXCEPTION WHEN datetime_field_overflow THEN RAISE EXCEPTION 'Enter a valid date of birth'; END;
      IF v_date IS NULL OR v_date >= current_date THEN RAISE EXCEPTION 'Enter a valid past date of birth'; END IF;
    ELSIF v_key='daily-macros' THEN
      FOREACH v_field IN ARRAY ARRAY['protein','carbs','fat'] LOOP
        IF coalesce(v_value->>v_field,'') !~ '^\d+(\.\d+)?$' THEN RAISE EXCEPTION 'Enter finite non-negative macros'; END IF;
      END LOOP;
    ELSE
      v_text := btrim(v_value#>>'{}');
      IF v_text='' OR v_text='__other__' THEN RAISE EXCEPTION 'Answer required: %',v_key; END IF;
      IF v_key='email' AND v_text !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Enter a valid email address'; END IF;
      IF v_key='weight' AND (v_text !~ '^\d+(\.\d+)?$' OR v_text::numeric<=0) THEN RAISE EXCEPTION 'Enter a positive weight'; END IF;
      IF v_key='height' THEN
        IF v_text ~ '^\d+(\.\d+)?$' THEN
          IF v_text::numeric<100 OR v_text::numeric>250 THEN RAISE EXCEPTION 'Height must be 100 to 250 cm'; END IF;
        ELSIF v_text !~ '^\d+''([0-9]|1[01])$' THEN RAISE EXCEPTION 'Enter height in cm or feet and inches'; END IF;
      END IF;
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.validate_onboarding_v1(jsonb,jsonb,boolean) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_client_onboarding(p_invite_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid:=auth.uid(); v_profile public.profiles%ROWTYPE; v_invite public.client_invites%ROWTYPE; v_draft public.client_onboarding_drafts%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id=v_user FOR UPDATE;
  IF v_user IS NULL OR NOT FOUND OR v_profile.role<>'trainee' THEN RAISE EXCEPTION 'Sign in with a client account' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_draft FROM public.client_onboarding_drafts WHERE trainee_id=v_user AND invite_id=p_invite_id;
  IF FOUND AND v_draft.submitted_response_id IS NOT NULL THEN RETURN to_jsonb(v_draft); END IF;
  SELECT * INTO v_invite FROM public.client_invites WHERE id=p_invite_id AND status='active' FOR SHARE;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_invite.coach_id AND role='coach') THEN RAISE EXCEPTION 'Invitation unavailable; ask the coach for a new link'; END IF;
  IF v_profile.coach_id IS NOT NULL AND v_profile.coach_id<>v_invite.coach_id THEN RAISE EXCEPTION 'Already linked to a different coach' USING ERRCODE='42501'; END IF;
  INSERT INTO public.client_onboarding_drafts(trainee_id,invite_id,coach_id,coach_name,form_config)
    SELECT v_user,v_invite.id,v_invite.coach_id,first_name,public.onboarding_form_v1(v_invite.screens_config)
      FROM public.profiles WHERE id=v_invite.coach_id
    ON CONFLICT(trainee_id,invite_id) DO NOTHING;
  SELECT * INTO v_draft FROM public.client_onboarding_drafts WHERE trainee_id=v_user AND invite_id=p_invite_id;
  RETURN to_jsonb(v_draft);
END $$;

CREATE FUNCTION public.save_client_onboarding(p_draft_id uuid,p_expected_revision integer,p_answers jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid:=auth.uid(); v_profile public.profiles%ROWTYPE; v_draft public.client_onboarding_drafts%ROWTYPE; v_invite public.client_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id=v_user FOR UPDATE;
  IF v_user IS NULL OR NOT FOUND OR v_profile.role<>'trainee' THEN RAISE EXCEPTION 'Sign in with a client account' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_draft FROM public.client_onboarding_drafts WHERE id=p_draft_id AND trainee_id=v_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Draft unavailable' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_invite FROM public.client_invites WHERE id=v_draft.invite_id AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable; ask the coach for a new link'; END IF;
  SELECT * INTO v_draft FROM public.client_onboarding_drafts WHERE id=p_draft_id FOR UPDATE;
  IF v_draft.submitted_response_id IS NOT NULL THEN RAISE EXCEPTION 'Already submitted; reload your confirmation'; END IF;
  IF v_profile.coach_id IS NOT NULL AND v_profile.coach_id<>v_draft.coach_id THEN RAISE EXCEPTION 'Already linked to a different coach' USING ERRCODE='42501'; END IF;
  PERFORM public.validate_onboarding_v1(p_answers,v_draft.form_config,false);
  -- A lost save response can be retried unchanged without consuming a revision.
  IF v_draft.revision=p_expected_revision+1 AND v_draft.answers=p_answers THEN RETURN to_jsonb(v_draft); END IF;
  IF p_expected_revision IS NULL OR v_draft.revision<>p_expected_revision THEN RAISE EXCEPTION 'Draft changed on another page; reload before saving' USING ERRCODE='40001'; END IF;
  UPDATE public.client_onboarding_drafts SET answers=p_answers,revision=revision+1,updated_at=now()
    WHERE id=p_draft_id RETURNING * INTO v_draft;
  RETURN to_jsonb(v_draft);
END $$;

CREATE FUNCTION public.complete_client_onboarding(p_draft_id uuid,p_operation_id uuid,p_expected_revision integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user uuid:=auth.uid(); v_profile public.profiles%ROWTYPE; v_draft public.client_onboarding_drafts%ROWTYPE;
  v_invite public.client_invites%ROWTYPE; v_response uuid; v_names text[]; v_last text;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id=v_user FOR UPDATE;
  IF v_user IS NULL OR NOT FOUND OR v_profile.role<>'trainee' OR p_operation_id IS NULL THEN RAISE EXCEPTION 'Client account and operation ID required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_draft FROM public.client_onboarding_drafts WHERE id=p_draft_id AND trainee_id=v_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'Draft unavailable' USING ERRCODE='42501'; END IF;
  -- Completed receipts remain retrievable after invitation revocation.
  IF v_draft.submitted_response_id IS NOT NULL THEN
    IF v_draft.submission_operation_id=p_operation_id AND v_draft.submission_revision=p_expected_revision THEN RETURN v_draft.submitted_response_id; END IF;
    RAISE EXCEPTION 'Already submitted; reload your confirmation';
  END IF;
  SELECT * INTO v_invite FROM public.client_invites WHERE id=v_draft.invite_id AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable; ask the coach for a new link'; END IF;
  SELECT * INTO v_draft FROM public.client_onboarding_drafts WHERE id=p_draft_id FOR UPDATE;
  IF p_expected_revision IS NULL OR v_draft.revision<>p_expected_revision THEN RAISE EXCEPTION 'Draft changed; reload before submitting' USING ERRCODE='40001'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_draft.coach_id AND role='coach') THEN RAISE EXCEPTION 'Coach unavailable'; END IF;
  IF v_profile.coach_id IS NOT NULL AND v_profile.coach_id<>v_draft.coach_id THEN RAISE EXCEPTION 'Already linked to a different coach' USING ERRCODE='42501'; END IF;
  PERFORM public.validate_onboarding_v1(v_draft.answers,v_draft.form_config,true);
  v_names:=regexp_split_to_array(btrim(v_draft.answers->>'name'),'[[:space:]]+'); v_last:=coalesce(array_to_string(v_names[2:],' '),'');
  IF char_length(v_names[1])>100 OR char_length(v_last)>100 THEN RAISE EXCEPTION 'First and last names must each fit 100 characters'; END IF;
  UPDATE public.profiles SET first_name=v_names[1],last_name=v_last,coach_id=v_draft.coach_id WHERE id=v_user;
  INSERT INTO public.onboarding_responses(trainee_id,coach_id,answers,invite_id,operation_id,form_version,form_config)
    VALUES(v_user,v_draft.coach_id,v_draft.answers,v_draft.invite_id,p_operation_id,v_draft.form_version,v_draft.form_config) RETURNING id INTO v_response;
  UPDATE public.client_onboarding_drafts SET submitted_response_id=v_response,submission_operation_id=p_operation_id,
    submission_revision=p_expected_revision,updated_at=now() WHERE id=p_draft_id;
  RETURN v_response;
END $$;

CREATE FUNCTION public.review_client_onboarding(p_response_id uuid) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_reviewed timestamptz;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='coach') THEN RAISE EXCEPTION 'Coach account required' USING ERRCODE='42501'; END IF;
  UPDATE public.onboarding_responses SET reviewed_at=coalesce(reviewed_at,now()),reviewed_by=auth.uid()
    WHERE id=p_response_id AND coach_id=auth.uid() RETURNING reviewed_at INTO v_reviewed;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission unavailable' USING ERRCODE='42501'; END IF;
  RETURN v_reviewed;
END $$;

REVOKE ALL ON FUNCTION public.get_client_onboarding(uuid),public.save_client_onboarding(uuid,integer,jsonb),
  public.complete_client_onboarding(uuid,uuid,integer),public.review_client_onboarding(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_onboarding(uuid),public.save_client_onboarding(uuid,integer,jsonb),
  public.complete_client_onboarding(uuid,uuid,integer),public.review_client_onboarding(uuid) TO authenticated;
