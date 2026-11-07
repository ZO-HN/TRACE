-- One-off dated planning uses the existing immutable assignment operation.
-- Calendar cancellation never deletes a template, session or offline capability.
CREATE TABLE public.coach_calendar_assignments (
  id uuid PRIMARY KEY,
  operation_id uuid NOT NULL UNIQUE,
  coach_id uuid NOT NULL REFERENCES public.profiles(id),
  trainee_id uuid NOT NULL REFERENCES public.profiles(id),
  template_id uuid NOT NULL UNIQUE REFERENCES public.workout_templates(id),
  workout_name text NOT NULL,
  scheduled_date date NOT NULL,
  cancelled boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  request jsonb NOT NULL
);
CREATE INDEX coach_calendar_recipient_date ON public.coach_calendar_assignments(trainee_id,scheduled_date,id);
CREATE INDEX coach_calendar_owner_date ON public.coach_calendar_assignments(coach_id,scheduled_date,id);
ALTER TABLE public.coach_calendar_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coach_calendar_assignments FROM PUBLIC, anon, authenticated;
GRANT SELECT(id,coach_id,trainee_id,template_id,workout_name,scheduled_date,cancelled,revision,created_at)
  ON public.coach_calendar_assignments TO authenticated;
CREATE POLICY calendar_read ON public.coach_calendar_assignments FOR SELECT TO authenticated USING (
  trainee_id=auth.uid() OR (coach_id=auth.uid() AND public.is_current_coach_of(trainee_id))
);

CREATE TABLE public.coach_calendar_change_operations (
  operation_id uuid PRIMARY KEY,
  coach_id uuid NOT NULL,
  event_id uuid NOT NULL,
  request jsonb NOT NULL,
  result_revision integer NOT NULL
);
ALTER TABLE public.coach_calendar_change_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coach_calendar_change_operations FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.schedule_coach_workout(
  p_operation_id uuid,p_event_id uuid,p_template_id uuid,p_source_template_id uuid,
  p_coach_id uuid,p_trainee_id uuid,p_date date,p_expected_snapshot jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid(); v_request jsonb; v_saved public.coach_calendar_assignments%ROWTYPE;
BEGIN
  IF v_user IS NULL OR v_user IS DISTINCT FROM p_coach_id
    OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_user AND role='coach') THEN
    RAISE EXCEPTION 'Only the authenticated coach can schedule workouts' USING ERRCODE='42501';
  END IF;
  IF p_operation_id IS NULL OR p_event_id IS NULL OR p_template_id IS NULL OR p_source_template_id IS NULL
    OR p_trainee_id IS NULL OR p_date IS NULL OR NOT isfinite(p_date)
    OR p_date < DATE '2000-01-01' OR p_date > DATE '2100-12-31' THEN
    RAISE EXCEPTION 'Stable IDs and a valid calendar date are required' USING ERRCODE='22023';
  END IF;
  v_request:=jsonb_build_object('event',p_event_id,'template',p_template_id,'source',p_source_template_id,
    'coach',p_coach_id,'trainee',p_trainee_id,'date',p_date,'snapshot',p_expected_snapshot);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calendar-create:'||p_operation_id::text,0));
  SELECT * INTO v_saved FROM public.coach_calendar_assignments WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF v_saved.coach_id IS DISTINCT FROM v_user OR v_saved.request IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Calendar operation already used for different content or ownership' USING ERRCODE='23505';
    END IF;
    RETURN v_saved.id;
  END IF;
  -- Any failure below, including an event-ID collision, rolls back the copy too.
  PERFORM public.assign_workout_template(p_operation_id,p_template_id,p_source_template_id,p_coach_id,p_trainee_id,p_expected_snapshot);
  INSERT INTO public.coach_calendar_assignments(id,operation_id,coach_id,trainee_id,template_id,workout_name,scheduled_date,request)
  VALUES(p_event_id,p_operation_id,v_user,p_trainee_id,p_template_id,p_expected_snapshot->>'name',p_date,v_request);
  RETURN p_event_id;
END;
$$;
REVOKE ALL ON FUNCTION public.schedule_coach_workout(uuid,uuid,uuid,uuid,uuid,uuid,date,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.schedule_coach_workout(uuid,uuid,uuid,uuid,uuid,uuid,date,jsonb) TO authenticated;

CREATE FUNCTION public.change_coach_calendar(
  p_operation_id uuid,p_event_id uuid,p_coach_id uuid,p_expected_revision integer,p_date date,p_cancelled boolean
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid(); v_request jsonb; v_event public.coach_calendar_assignments%ROWTYPE;
  v_saved public.coach_calendar_change_operations%ROWTYPE;
BEGIN
  IF v_user IS NULL OR v_user IS DISTINCT FROM p_coach_id
    OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_user AND role='coach') THEN
    RAISE EXCEPTION 'Only the authenticated coach can change calendar assignments' USING ERRCODE='42501';
  END IF;
  IF p_operation_id IS NULL OR p_event_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision<1
    OR p_date IS NULL OR NOT isfinite(p_date) OR p_date<DATE '2000-01-01' OR p_date>DATE '2100-12-31'
    OR p_cancelled IS NULL THEN
    RAISE EXCEPTION 'Stable operation, revision and calendar date are required' USING ERRCODE='22023';
  END IF;
  v_request:=jsonb_build_object('event',p_event_id,'revision',p_expected_revision,'date',p_date,'cancelled',p_cancelled);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('calendar-change:'||p_operation_id::text,0));
  SELECT * INTO v_saved FROM public.coach_calendar_change_operations WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF v_saved.coach_id IS DISTINCT FROM v_user OR v_saved.request IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Calendar change operation already used for different content or ownership' USING ERRCODE='23505';
    END IF;
    RETURN v_saved.result_revision;
  END IF;
  SELECT * INTO v_event FROM public.coach_calendar_assignments WHERE id=p_event_id AND coach_id=v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Calendar assignment unavailable' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=v_event.trainee_id AND coach_id=v_user AND role='trainee' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trainee is not currently linked to this coach' USING ERRCODE='42501'; END IF;
  IF v_event.revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'Calendar assignment changed. Reload before editing.' USING ERRCODE='40001';
  END IF;
  IF v_event.cancelled THEN RAISE EXCEPTION 'Cancelled assignments cannot be changed; schedule a new copy' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.workout_sessions WHERE template_id=v_event.template_id) THEN
    RAISE EXCEPTION 'A recorded workout cannot be moved or cancelled' USING ERRCODE='22023';
  END IF;
  UPDATE public.coach_calendar_assignments SET scheduled_date=p_date,cancelled=p_cancelled,revision=revision+1 WHERE id=p_event_id;
  INSERT INTO public.coach_calendar_change_operations(operation_id,coach_id,event_id,request,result_revision)
  VALUES(p_operation_id,v_user,p_event_id,v_request,v_event.revision+1);
  RETURN v_event.revision+1;
END;
$$;
REVOKE ALL ON FUNCTION public.change_coach_calendar(uuid,uuid,uuid,integer,date,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.change_coach_calendar(uuid,uuid,uuid,integer,date,boolean) TO authenticated;
