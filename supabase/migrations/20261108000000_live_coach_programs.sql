-- Coach programs are live plans; issued workout copies are immutable recovery
-- capabilities. Personal workout_programs/program_days remain independent.
CREATE TABLE public.coach_program_heads (
  program_id uuid PRIMARY KEY REFERENCES public.programs(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES public.profiles(id),
  revision integer NOT NULL CHECK(revision>0),
  slots jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.coach_program_versions (
  program_id uuid NOT NULL,
  coach_id uuid NOT NULL,
  revision integer NOT NULL,
  slots jsonb NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(program_id,revision)
);
CREATE TABLE public.coach_program_deliveries (
  id uuid PRIMARY KEY,
  coach_id uuid NOT NULL REFERENCES public.profiles(id),
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  trainee_id uuid REFERENCES public.profiles(id),
  group_id uuid REFERENCES public.training_groups(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  active boolean NOT NULL,
  revision integer NOT NULL CHECK(revision>0),
  CHECK ((trainee_id IS NULL) <> (group_id IS NULL))
);
CREATE UNIQUE INDEX coach_program_direct_delivery ON public.coach_program_deliveries(program_id,trainee_id) WHERE trainee_id IS NOT NULL;
CREATE UNIQUE INDEX coach_program_group_delivery ON public.coach_program_deliveries(group_id) WHERE group_id IS NOT NULL;
CREATE TABLE public.coach_program_operations (
  operation_id uuid PRIMARY KEY,coach_id uuid NOT NULL,kind text NOT NULL,request jsonb NOT NULL,result jsonb NOT NULL
);
CREATE TABLE public.coach_program_grants (
  id uuid PRIMARY KEY,
  trainee_id uuid NOT NULL REFERENCES public.profiles(id),
  coach_id uuid NOT NULL REFERENCES public.profiles(id),
  program_id uuid NOT NULL,
  slot_id uuid NOT NULL,
  anchor_date date NOT NULL,
  scheduled_date date NOT NULL,
  revision integer NOT NULL,
  fingerprint text NOT NULL,
  snapshot jsonb NOT NULL,
  template_id uuid NOT NULL UNIQUE REFERENCES public.workout_templates(id),
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trainee_id,program_id,slot_id,anchor_date,revision,fingerprint)
);
ALTER TABLE public.workout_templates ADD COLUMN delivery_kind text NOT NULL DEFAULT 'standalone'
  CHECK(delivery_kind IN('standalone','program'));

ALTER TABLE public.coach_program_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_program_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_program_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_program_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_program_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.coach_program_heads,public.coach_program_versions,public.coach_program_deliveries,
  public.coach_program_operations,public.coach_program_grants FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.coach_program_heads,public.coach_program_versions,public.coach_program_deliveries TO authenticated;
GRANT SELECT(id,trainee_id,coach_id,program_id,slot_id,anchor_date,scheduled_date,revision,template_id,issued_at)
  ON public.coach_program_grants TO authenticated;
CREATE POLICY program_head_owner ON public.coach_program_heads FOR SELECT TO authenticated USING(coach_id=auth.uid());
CREATE POLICY program_version_owner ON public.coach_program_versions FOR SELECT TO authenticated USING(coach_id=auth.uid());
CREATE POLICY program_delivery_owner ON public.coach_program_deliveries FOR SELECT TO authenticated USING(coach_id=auth.uid());
CREATE POLICY program_grant_read ON public.coach_program_grants FOR SELECT TO authenticated USING(
  trainee_id=auth.uid() OR (coach_id=auth.uid() AND public.is_current_coach_of(trainee_id)));

CREATE FUNCTION public.save_coach_program(p_operation_id uuid,p_program_id uuid,p_coach_id uuid,p_expected_revision integer,p_slots jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid(); v_request jsonb; v_saved public.coach_program_operations%ROWTYPE;
  v_revision integer; v_slot jsonb; v_ids uuid[]:='{}'; v_offsets integer[]:='{}'; v_id uuid; v_offset integer; v_source uuid;
BEGIN
  IF v_user IS NULL OR v_user IS DISTINCT FROM p_coach_id OR NOT public.is_coach(v_user) THEN
    RAISE EXCEPTION 'Only the authenticated coach can save a program' USING ERRCODE='42501';
  END IF;
  IF p_operation_id IS NULL OR p_program_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision<0
    OR jsonb_typeof(p_slots) IS DISTINCT FROM 'array' OR jsonb_array_length(p_slots) NOT BETWEEN 1 AND 366
    OR octet_length(p_slots::text)>131072 THEN RAISE EXCEPTION 'A bounded ordered program is required' USING ERRCODE='22023'; END IF;
  v_request:=jsonb_build_object('program',p_program_id,'revision',p_expected_revision,'slots',p_slots);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('coach-program-op:'||p_operation_id::text,0));
  SELECT * INTO v_saved FROM public.coach_program_operations WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF v_saved.coach_id IS DISTINCT FROM v_user OR v_saved.kind<>'save' OR v_saved.request IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Program operation was used for different content or ownership' USING ERRCODE='23505'; END IF;
    RETURN (v_saved.result->>'revision')::integer;
  END IF;
  PERFORM 1 FROM public.programs WHERE id=p_program_id AND coach_id=v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Coach program unavailable' USING ERRCODE='42501'; END IF;
  SELECT revision INTO v_revision FROM public.coach_program_heads WHERE program_id=p_program_id;
  v_revision:=coalesce(v_revision,0);
  IF v_revision<>p_expected_revision THEN RAISE EXCEPTION 'Program changed. Reload before saving.' USING ERRCODE='40001'; END IF;
  FOR v_slot IN SELECT value FROM jsonb_array_elements(p_slots) LOOP
    IF jsonb_typeof(v_slot)<>'object' OR v_slot->>'id' IS NULL OR v_slot->>'offset' IS NULL
      OR jsonb_typeof(v_slot->'offset')<>'number' OR (v_slot->>'offset')::numeric<>trunc((v_slot->>'offset')::numeric)
      OR (v_slot->>'offset')::numeric NOT BETWEEN 0 AND 365
      OR length(coalesce(v_slot->>'label','')) NOT BETWEEN 1 AND 100 THEN
      RAISE EXCEPTION 'Each program day needs a stable ID, day offset and label' USING ERRCODE='22023'; END IF;
    v_id:=(v_slot->>'id')::uuid; v_offset:=(v_slot->>'offset')::integer; v_source:=(v_slot->>'template_id')::uuid;
    IF v_id=ANY(v_ids) OR v_offset=ANY(v_offsets) THEN RAISE EXCEPTION 'Program day IDs and offsets must be unique' USING ERRCODE='22023'; END IF;
    v_ids:=array_append(v_ids,v_id); v_offsets:=array_append(v_offsets,v_offset);
    IF v_source IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.workout_templates
      WHERE id=v_source AND creator_id=v_user AND scope='PRIVATE' AND is_active) THEN
      RAISE EXCEPTION 'Program day must use an active private workout owned by this coach' USING ERRCODE='42501'; END IF;
  END LOOP;
  v_revision:=v_revision+1;
  INSERT INTO public.coach_program_versions(program_id,coach_id,revision,slots) VALUES(p_program_id,v_user,v_revision,p_slots);
  INSERT INTO public.coach_program_heads(program_id,coach_id,revision,slots) VALUES(p_program_id,v_user,v_revision,p_slots)
  ON CONFLICT(program_id) DO UPDATE SET revision=EXCLUDED.revision,slots=EXCLUDED.slots,updated_at=now();
  INSERT INTO public.coach_program_operations VALUES(p_operation_id,v_user,'save',v_request,jsonb_build_object('revision',v_revision));
  RETURN v_revision;
END;
$$;
REVOKE ALL ON FUNCTION public.save_coach_program(uuid,uuid,uuid,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_coach_program(uuid,uuid,uuid,integer,jsonb) TO authenticated;

CREATE FUNCTION public.set_coach_program_delivery(p_operation_id uuid,p_delivery_id uuid,p_program_id uuid,p_coach_id uuid,
  p_start_date date,p_active boolean,p_expected_revision integer,p_trainee_id uuid DEFAULT NULL,p_group_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid(); v_request jsonb; v_saved public.coach_program_operations%ROWTYPE;
  v_delivery public.coach_program_deliveries%ROWTYPE; v_revision integer;
BEGIN
  IF v_user IS NULL OR v_user IS DISTINCT FROM p_coach_id OR NOT public.is_coach(v_user) THEN
    RAISE EXCEPTION 'Only the authenticated coach can deliver a program' USING ERRCODE='42501'; END IF;
  IF p_operation_id IS NULL OR p_delivery_id IS NULL OR p_program_id IS NULL
    OR ((p_trainee_id IS NULL) = (p_group_id IS NULL)) OR p_active IS NULL
    OR p_start_date IS NULL OR NOT isfinite(p_start_date) OR p_start_date NOT BETWEEN DATE '2000-01-01' AND DATE '2100-12-31'
    OR p_expected_revision IS NULL OR p_expected_revision<0 THEN
    RAISE EXCEPTION 'Stable delivery IDs, one recipient and a valid start date are required' USING ERRCODE='22023'; END IF;
  v_request:=jsonb_build_object('id',p_delivery_id,'program',p_program_id,'trainee',p_trainee_id,'group',p_group_id,
    'date',p_start_date,'active',p_active,'revision',p_expected_revision);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('coach-program-op:'||p_operation_id::text,0));
  SELECT * INTO v_saved FROM public.coach_program_operations WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF v_saved.coach_id IS DISTINCT FROM v_user OR v_saved.kind<>'delivery' OR v_saved.request IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Program operation was used for different content or ownership' USING ERRCODE='23505'; END IF;
    RETURN (v_saved.result->>'revision')::integer;
  END IF;
  PERFORM 1 FROM public.programs WHERE id=p_program_id AND coach_id=v_user FOR SHARE;
  IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.coach_program_heads WHERE program_id=p_program_id) THEN
    RAISE EXCEPTION 'Save the coach program days before delivering it' USING ERRCODE='42501'; END IF;
  IF p_trainee_id IS NOT NULL THEN
    PERFORM 1 FROM public.profiles WHERE id=p_trainee_id AND coach_id=v_user AND role='trainee' FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Trainee is not currently linked to this coach' USING ERRCODE='42501'; END IF;
  ELSE
    PERFORM 1 FROM public.training_groups WHERE id=p_group_id AND coach_id=v_user FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Training group unavailable' USING ERRCODE='42501'; END IF;
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('coach-program-delivery:'||p_delivery_id::text,0));
  SELECT * INTO v_delivery FROM public.coach_program_deliveries WHERE id=p_delivery_id FOR UPDATE;
  v_revision:=CASE WHEN FOUND THEN v_delivery.revision ELSE 0 END;
  IF v_revision<>p_expected_revision THEN RAISE EXCEPTION 'Program delivery changed. Reload before saving.' USING ERRCODE='40001'; END IF;
  IF v_revision>0 AND (v_delivery.coach_id IS DISTINCT FROM v_user OR v_delivery.trainee_id IS DISTINCT FROM p_trainee_id
    OR v_delivery.group_id IS DISTINCT FROM p_group_id) THEN
    RAISE EXCEPTION 'Delivery identity belongs to another recipient or coach' USING ERRCODE='42501'; END IF;
  IF p_group_id IS NOT NULL THEN UPDATE public.training_groups SET program_id=p_program_id WHERE id=p_group_id; END IF;
  INSERT INTO public.coach_program_deliveries(id,coach_id,program_id,trainee_id,group_id,start_date,active,revision)
  VALUES(p_delivery_id,v_user,p_program_id,p_trainee_id,p_group_id,p_start_date,p_active,v_revision+1)
  ON CONFLICT(id) DO UPDATE SET program_id=EXCLUDED.program_id,start_date=EXCLUDED.start_date,active=EXCLUDED.active,revision=EXCLUDED.revision;
  INSERT INTO public.coach_program_operations VALUES(p_operation_id,v_user,'delivery',v_request,jsonb_build_object('revision',v_revision+1));
  RETURN v_revision+1;
END;
$$;
REVOKE ALL ON FUNCTION public.set_coach_program_delivery(uuid,uuid,uuid,uuid,date,boolean,integer,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_coach_program_delivery(uuid,uuid,uuid,uuid,date,boolean,integer,uuid,uuid) TO authenticated;

-- Old CRUD remains compatible, but cannot attach foreign programs or clients.
CREATE FUNCTION public.check_training_group_delivery_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_coach uuid;
BEGIN
  IF TG_TABLE_NAME='training_groups' THEN
    IF NEW.program_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.programs WHERE id=NEW.program_id AND coach_id=NEW.coach_id) THEN
      RAISE EXCEPTION 'Group program belongs to another coach' USING ERRCODE='42501'; END IF;
  ELSE
    SELECT coach_id INTO v_coach FROM public.training_groups WHERE id=NEW.group_id;
    IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=NEW.client_id AND coach_id=v_coach AND role='trainee') THEN
      RAISE EXCEPTION 'Group member is not currently linked to this coach' USING ERRCODE='42501'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.check_training_group_delivery_owner() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER check_training_group_program BEFORE INSERT OR UPDATE ON public.training_groups FOR EACH ROW EXECUTE FUNCTION public.check_training_group_delivery_owner();
CREATE TRIGGER check_training_group_member BEFORE INSERT OR UPDATE ON public.training_group_members FOR EACH ROW EXECUTE FUNCTION public.check_training_group_delivery_owner();

-- Metadata only. Merely viewing a week does not copy all of its workouts.
CREATE FUNCTION public.get_coach_program_schedule(p_trainee_id uuid,p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_coach uuid; v_result jsonb;
BEGIN
  SELECT coach_id INTO v_coach FROM public.profiles WHERE id=p_trainee_id AND role='trainee';
  IF auth.uid() IS NULL OR (auth.uid() IS DISTINCT FROM p_trainee_id AND NOT public.is_current_coach_of(p_trainee_id)) THEN
    RAISE EXCEPTION 'Program schedule belongs to another trainee' USING ERRCODE='42501'; END IF;
  IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_to<p_from OR p_to-p_from>30 THEN
    RAISE EXCEPTION 'Choose a calendar range of at most 31 days' USING ERRCODE='22023'; END IF;
  WITH sources AS (
    SELECT d.program_id,d.start_date,'Coach program'::text AS source FROM public.coach_program_deliveries d
      WHERE d.coach_id=v_coach AND d.trainee_id=p_trainee_id AND d.active
    UNION
    SELECT d.program_id,d.start_date,'Group: '||g.name FROM public.coach_program_deliveries d
      JOIN public.training_groups g ON g.id=d.group_id AND g.coach_id=d.coach_id AND g.program_id=d.program_id
      JOIN public.training_group_members m ON m.group_id=g.id AND m.client_id=p_trainee_id
      WHERE d.coach_id=v_coach AND d.active
  ), combined AS (
    SELECT program_id,start_date,string_agg(DISTINCT source,', ' ORDER BY source) AS source FROM sources GROUP BY program_id,start_date
  ), days AS (
    SELECT p.id AS program_id,p.name,h.revision,c.start_date,c.source,s.value AS slot,
      c.start_date+(s.value->>'offset')::integer AS scheduled_date
    FROM combined c JOIN public.programs p ON p.id=c.program_id AND p.coach_id=v_coach
    JOIN public.coach_program_heads h ON h.program_id=p.id CROSS JOIN LATERAL jsonb_array_elements(h.slots) s
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('program_id',program_id,'program_name',name,'revision',revision,
    'anchor_date',start_date,'slot_id',slot->>'id','label',slot->>'label','scheduled_date',scheduled_date,
    'rest',slot->>'template_id' IS NULL,'source',source) ORDER BY scheduled_date,program_id,slot->>'id'),'[]'::jsonb)
  INTO v_result FROM (SELECT * FROM days WHERE scheduled_date BETWEEN p_from AND p_to
    ORDER BY scheduled_date,program_id,slot->>'id' LIMIT 1001) selected;
  IF jsonb_array_length(v_result)>1000 THEN RAISE EXCEPTION 'Too many program days; choose a shorter calendar range' USING ERRCODE='22023'; END IF;
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_coach_program_schedule(uuid,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_coach_program_schedule(uuid,date,date) TO authenticated;

CREATE FUNCTION public.open_coach_program_workout(p_operation_id uuid,p_trainee_id uuid,p_program_id uuid,
  p_slot_id uuid,p_anchor_date date,p_expected_revision integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid(); v_coach uuid; v_request jsonb; v_saved public.coach_program_operations%ROWTYPE;
  v_head public.coach_program_heads%ROWTYPE; v_slot jsonb; v_date date; v_source uuid; v_snapshot jsonb;
  v_grant public.coach_program_grants%ROWTYPE; v_fingerprint text; v_grant_id uuid; v_copy uuid;
BEGIN
  IF v_user IS NULL OR v_user IS DISTINCT FROM p_trainee_id
    OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_user AND role='trainee') THEN
    RAISE EXCEPTION 'Only the owning trainee can open this program workout' USING ERRCODE='42501'; END IF;
  IF p_operation_id IS NULL OR p_program_id IS NULL OR p_slot_id IS NULL OR p_anchor_date IS NULL
    OR NOT isfinite(p_anchor_date) OR p_expected_revision IS NULL OR p_expected_revision<1 THEN
    RAISE EXCEPTION 'A stable operation and exact program day are required' USING ERRCODE='22023'; END IF;
  v_request:=jsonb_build_object('trainee',v_user,'program',p_program_id,'slot',p_slot_id,'anchor',p_anchor_date,'revision',p_expected_revision);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('coach-program-op:'||p_operation_id::text,0));
  SELECT * INTO v_saved FROM public.coach_program_operations WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF v_saved.kind<>'open' OR v_saved.request IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Program operation was used for different content or ownership' USING ERRCODE='23505'; END IF;
    RETURN (v_saved.result->>'template_id')::uuid;
  END IF;
  -- Current link/membership gates fresh opens. Existing receipts remain recovery
  -- capabilities after removal; no old session or downloaded copy is rewritten.
  SELECT coach_id INTO v_coach FROM public.profiles WHERE id=v_user FOR SHARE;
  SELECT * INTO v_head FROM public.coach_program_heads WHERE program_id=p_program_id AND coach_id=v_coach FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Current coach program unavailable' USING ERRCODE='42501'; END IF;
  IF v_head.revision<>p_expected_revision THEN RAISE EXCEPTION 'Program changed. Reload the schedule before opening.' USING ERRCODE='40001'; END IF;
  SELECT value INTO v_slot FROM jsonb_array_elements(v_head.slots) WHERE (value->>'id')::uuid=p_slot_id;
  IF NOT FOUND OR v_slot->>'template_id' IS NULL THEN RAISE EXCEPTION 'This day has no program workout' USING ERRCODE='22023'; END IF;
  v_date:=p_anchor_date+(v_slot->>'offset')::integer;
  PERFORM 1 FROM public.coach_program_deliveries d WHERE d.program_id=p_program_id AND d.start_date=p_anchor_date
    AND d.coach_id=v_coach AND d.trainee_id=v_user AND d.active FOR SHARE;
  IF NOT FOUND THEN
    PERFORM 1 FROM public.coach_program_deliveries d JOIN public.training_groups g
      ON g.id=d.group_id AND g.coach_id=d.coach_id AND g.program_id=d.program_id
      JOIN public.training_group_members m ON m.group_id=g.id AND m.client_id=v_user
      WHERE d.program_id=p_program_id AND d.start_date=p_anchor_date AND d.coach_id=v_coach AND d.active
      FOR SHARE OF d,g,m;
    IF NOT FOUND THEN RAISE EXCEPTION 'Program delivery is no longer available to this trainee' USING ERRCODE='42501'; END IF;
  END IF;
  -- Serialize two opens for the same trainee; no duplicate template after a lost
  -- reply or parallel taps, including different operation IDs on two devices.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('program-open:'||v_user::text,0));
  v_source:=(v_slot->>'template_id')::uuid;
  PERFORM 1 FROM public.workout_templates WHERE id=v_source AND creator_id=v_coach AND scope='PRIVATE' AND is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Program workout source unavailable; ask the coach to replace this day' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.template_items WHERE template_id=v_source FOR UPDATE;
  SELECT jsonb_build_object('name',t.name,'description',t.description,'items',coalesce(jsonb_agg(jsonb_build_object(
    'exercise_id',i.exercise_id,'position',i.position,'target_sets',i.target_sets,'target_reps',i.target_reps,
    'target_rpe',i.target_rpe,'rest_seconds',i.rest_seconds) ORDER BY i.position) FILTER(WHERE i.id IS NOT NULL),'[]'::jsonb))
    INTO v_snapshot FROM public.workout_templates t LEFT JOIN public.template_items i ON i.template_id=t.id WHERE t.id=v_source GROUP BY t.id;
  IF jsonb_array_length(v_snapshot->'items')=0 THEN RAISE EXCEPTION 'Program workout has no exercises' USING ERRCODE='22023'; END IF;
  v_fingerprint:=md5(v_snapshot::text);
  SELECT * INTO v_grant FROM public.coach_program_grants WHERE trainee_id=v_user AND program_id=p_program_id
    AND slot_id=p_slot_id AND anchor_date=p_anchor_date AND revision=p_expected_revision AND fingerprint=v_fingerprint;
  IF FOUND THEN
    -- The fingerprint only indexes candidates. Equality is authoritative.
    IF v_grant.snapshot IS DISTINCT FROM v_snapshot THEN RAISE EXCEPTION 'Program snapshot fingerprint collision' USING ERRCODE='23505'; END IF;
    v_copy:=v_grant.template_id;
  ELSE
    v_copy:=gen_random_uuid(); v_grant_id:=gen_random_uuid();
    INSERT INTO public.workout_assignment_operations(operation_id,assigned_template_id,source_template_id,coach_id,trainee_id,request,source_snapshot)
      VALUES(v_grant_id,v_copy,v_source,v_coach,v_user,v_request,v_snapshot);
    PERFORM pg_catalog.set_config('app.workout_assignment_operation',v_grant_id::text,true);
    INSERT INTO public.workout_templates(id,creator_id,name,description,scope,assigned_trainee_id,is_active,delivery_kind)
      VALUES(v_copy,v_coach,v_snapshot->>'name',v_snapshot->>'description','ASSIGNED',v_user,true,'program');
    INSERT INTO public.template_items(template_id,exercise_id,position,target_sets,target_reps,target_rpe,rest_seconds)
      SELECT v_copy,x.exercise_id,x.position,x.target_sets,x.target_reps,x.target_rpe,x.rest_seconds
      FROM jsonb_to_recordset(v_snapshot->'items') AS x(exercise_id uuid,position int,target_sets int,target_reps int,target_rpe int,rest_seconds int);
    PERFORM pg_catalog.set_config('app.workout_assignment_operation','',true);
    INSERT INTO public.coach_program_grants(id,trainee_id,coach_id,program_id,slot_id,anchor_date,scheduled_date,revision,fingerprint,snapshot,template_id)
      VALUES(v_grant_id,v_user,v_coach,p_program_id,p_slot_id,p_anchor_date,v_date,p_expected_revision,v_fingerprint,v_snapshot,v_copy);
  END IF;
  INSERT INTO public.coach_program_operations VALUES(p_operation_id,v_coach,'open',v_request,jsonb_build_object('template_id',v_copy));
  RETURN v_copy;
END;
$$;
REVOKE ALL ON FUNCTION public.open_coach_program_workout(uuid,uuid,uuid,uuid,date,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.open_coach_program_workout(uuid,uuid,uuid,uuid,date,integer) TO authenticated;
CREATE INDEX coach_program_active_trainee ON public.coach_program_deliveries(trainee_id,coach_id) WHERE active;
CREATE INDEX coach_program_active_group ON public.coach_program_deliveries(group_id,coach_id) WHERE active;
CREATE INDEX coach_program_member_lookup ON public.training_group_members(client_id,group_id);
