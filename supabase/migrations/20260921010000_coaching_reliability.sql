-- Cardio entries are the single source of truth for the mobile cardio feature.
CREATE OR REPLACE FUNCTION public.get_coach_cardio_summary(p_coach_id UUID, p_days INT DEFAULT 7)
RETURNS TABLE (client_id UUID, client_name TEXT, cardio_sessions BIGINT, cardio_minutes NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.first_name || ' ' || p.last_name, COUNT(c.id),
    COALESCE(SUM(c.duration_seconds) / 60.0, 0)
  FROM public.profiles p
  LEFT JOIN public.cardio_entries c ON c.user_id = p.id
    AND c.entry_date BETWEEN CURRENT_DATE - (GREATEST(p_days, 1) - 1) AND CURRENT_DATE
  WHERE p.coach_id = p_coach_id AND auth.uid() = p_coach_id
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'coach')
  GROUP BY p.id, p.first_name, p.last_name
  ORDER BY COALESCE(SUM(c.duration_seconds), 0), p.id;
$$;

-- Do not grant broad UPDATE access to session feedback. Only the owner can
-- deliver a logging snapshot, including replay after a lost HTTP response.
CREATE OR REPLACE FUNCTION public.sync_workout_session(p_session JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id UUID := (p_session->>'id')::uuid;
  v_user UUID := auth.uid();
  v_template UUID := (p_session->>'template_id')::uuid;
BEGIN
  IF v_user IS NULL OR (p_session->>'user_id')::uuid IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'Session belongs to another account' USING ERRCODE = '42501';
  END IF;
  IF v_template IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.workout_templates t WHERE t.id = v_template
      AND (t.creator_id = v_user OR t.scope = 'PUBLIC'
        OR (t.scope = 'ASSIGNED' AND t.assigned_trainee_id = v_user))
  ) THEN
    RAISE EXCEPTION 'Workout is unavailable' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.workout_sessions (id, user_id, template_id, session_name, completed_at, duration_seconds, rpe_average, compliance_score)
  VALUES (v_id, v_user, v_template, p_session->>'session_name',
    COALESCE((p_session->>'completed_at')::timestamptz, now()), (p_session->>'duration_seconds')::int,
    (p_session->>'rpe_average')::numeric, (p_session->>'compliance_score')::int)
  ON CONFLICT (id) DO UPDATE SET
    duration_seconds = GREATEST(workout_sessions.duration_seconds, EXCLUDED.duration_seconds),
    completed_at = CASE WHEN p_session->>'completed_at' IS NULL THEN workout_sessions.completed_at
      ELSE GREATEST(workout_sessions.completed_at, EXCLUDED.completed_at) END,
    rpe_average = COALESCE(EXCLUDED.rpe_average, workout_sessions.rpe_average),
    compliance_score = COALESCE(EXCLUDED.compliance_score, workout_sessions.compliance_score)
  WHERE workout_sessions.user_id = v_user;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session belongs to another account' USING ERRCODE = '42501';
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_workout_session(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_workout_session(JSONB) TO authenticated;

-- Possessing a token authorizes one RPC; having any token on a row must not
-- make all shared programs enumerable through the table API.
DROP POLICY IF EXISTS workout_programs_share_token_read ON public.workout_programs;
DROP POLICY IF EXISTS program_days_share_token_read ON public.program_days;

CREATE OR REPLACE FUNCTION public.join_program_by_token(p_token UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_source public.workout_programs%rowtype;
  v_program UUID := gen_random_uuid();
  v_user UUID := auth.uid();
  v_template public.workout_templates%rowtype;
  v_copy UUID;
  v_day RECORD;
  v_map JSONB := '{}'::jsonb;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sign in to join a program' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_source FROM public.workout_programs WHERE share_token = p_token FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No program found for that share link.'; END IF;
  INSERT INTO public.workout_programs (id, owner_id, name, description, category, split_type, total_weeks)
  VALUES (v_program, v_user, v_source.name, v_source.description, v_source.category, v_source.split_type, v_source.total_weeks);

  FOR v_day IN SELECT * FROM public.program_days WHERE program_id = v_source.id ORDER BY week_number, day_of_week LOOP
    v_copy := NULL;
    IF v_day.workout_template_id IS NOT NULL THEN
      v_copy := (v_map->>v_day.workout_template_id::text)::uuid;
      IF v_copy IS NULL THEN
        -- The definer must not copy an arbitrary private template referenced
        -- by a malicious source program. Recheck the source owner's access.
        SELECT * INTO v_template FROM public.workout_templates t
        WHERE t.id = v_day.workout_template_id AND
          (t.creator_id = v_source.owner_id OR t.scope = 'PUBLIC'
            OR (t.scope = 'ASSIGNED' AND t.assigned_trainee_id = v_source.owner_id));
        IF NOT FOUND THEN RAISE EXCEPTION 'A source workout is unavailable; ask the owner to update the program.'; END IF;
        v_copy := gen_random_uuid();
        INSERT INTO public.workout_templates (id, creator_id, name, description, week_number, day_number, is_active, scope)
        VALUES (v_copy, v_user, v_template.name, v_template.description, v_template.week_number, v_template.day_number, true, 'PRIVATE');
        INSERT INTO public.template_items (template_id, exercise_id, position, target_sets, target_reps, target_rpe, rest_seconds)
        SELECT v_copy, exercise_id, position, target_sets, target_reps, target_rpe, rest_seconds
        FROM public.template_items WHERE template_id = v_template.id;
        v_map := v_map || jsonb_build_object(v_template.id::text, v_copy);
      END IF;
    END IF;
    INSERT INTO public.program_days (program_id, week_number, day_of_week, workout_template_id, notes)
    VALUES (v_program, v_day.week_number, v_day.day_of_week, v_copy, v_day.notes);
  END LOOP;
  RETURN v_program;
END;
$$;
REVOKE ALL ON FUNCTION public.join_program_by_token(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_program_by_token(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.get_coach_cardio_summary(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_coach_cardio_summary(UUID, INT) TO authenticated;
REVOKE ALL ON FUNCTION public.list_coach_roster() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_exercise_leaderboard(UUID) FROM PUBLIC, anon;

-- Explicit table grants make clean installs independent of hosted defaults.
-- RLS continues to constrain every client operation; no service key in apps.
DO $$ DECLARE t RECORD; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.tablename);
  END LOOP;
END $$;
GRANT SELECT ON public.landing_pages TO anon;
GRANT SELECT ON public.coach_extensions TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Row ownership alone must not allow changing role/admin/coach linkage.
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;
GRANT UPDATE (first_name, last_name, dob, experience_level, primary_goal,
  injury_notes, wearable_sync_active, bio, height_cm, biological_sex,
  phone, username, avatar_key, expo_push_token) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.set_check_in_coach_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT coach_id INTO NEW.coach_id FROM public.profiles WHERE id = NEW.client_id AND role = 'trainee';
  IF NEW.coach_id IS NULL THEN RAISE EXCEPTION 'An assigned coach is required'; END IF;
  IF NEW.template_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.check_in_templates WHERE id = NEW.template_id AND coach_id = NEW.coach_id
  ) THEN RAISE EXCEPTION 'Check-in template does not belong to your coach'; END IF;
  RETURN NEW;
END;
$$;
DROP POLICY IF EXISTS "Trainees can submit their own check-ins" ON public.check_ins;
CREATE POLICY "Trainees can submit their own check-ins" ON public.check_ins FOR INSERT
  WITH CHECK (client_id = auth.uid() AND status = 'submitted' AND reviewed_at IS NULL
    AND reviewed_by IS NULL AND coach_notes IS NULL);
REVOKE UPDATE ON public.check_ins FROM authenticated;
GRANT UPDATE (status, reviewed_at, reviewed_by, coach_notes) ON public.check_ins TO authenticated;
REVOKE UPDATE ON public.form_checks FROM authenticated;
GRANT UPDATE (status, reviewed_at, coach_notes) ON public.form_checks TO authenticated;
DROP POLICY IF EXISTS "Trainees can submit their own form checks" ON public.form_checks;
CREATE POLICY "Trainees can submit their own form checks" ON public.form_checks FOR INSERT
  WITH CHECK (client_id = auth.uid() AND status = 'unreviewed' AND reviewed_at IS NULL AND coach_notes IS NULL);
