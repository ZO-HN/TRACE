-- Each assignment is an immutable copy of one private template revision.
CREATE TABLE public.workout_assignment_operations (
  operation_id uuid PRIMARY KEY,
  assigned_template_id uuid NOT NULL UNIQUE,
  source_template_id uuid NOT NULL,
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request jsonb NOT NULL,
  source_snapshot jsonb NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_assignment_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workout_assignment_operations FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.is_fixed_workout(p_template_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.workout_assignment_operations o WHERE o.assigned_template_id = p_template_id);
$$;
REVOKE ALL ON FUNCTION public.is_fixed_workout(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.guard_fixed_workout()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_operation uuid;
BEGIN
  IF TG_TABLE_NAME = 'workout_templates' THEN
    IF TG_OP = 'INSERT' AND NEW.scope = 'ASSIGNED' THEN
      v_operation := nullif(current_setting('app.workout_assignment_operation', true), '')::uuid;
      IF v_operation IS NULL OR NOT EXISTS (SELECT 1 FROM public.workout_assignment_operations
        WHERE operation_id = v_operation AND assigned_template_id = NEW.id) THEN
        RAISE EXCEPTION 'Assigned workouts must be created through the assignment operation' USING ERRCODE = '42501';
      END IF;
    ELSIF TG_OP = 'UPDATE' AND (public.is_fixed_workout(OLD.id) OR public.is_fixed_workout(NEW.id)) THEN
      RAISE EXCEPTION 'Assigned workout copies are immutable' USING ERRCODE = '42501';
    ELSIF TG_OP = 'DELETE' AND public.is_fixed_workout(OLD.id) THEN
      RAISE EXCEPTION 'Assigned workout copies are immutable' USING ERRCODE = '42501';
    END IF;
  ELSE
    IF TG_OP = 'INSERT' THEN
      -- An assigned item's insert is allowed only during the receipt-backed RPC.
      IF NOT public.is_fixed_workout(NEW.template_id) THEN RETURN NEW; END IF;
      v_operation := nullif(current_setting('app.workout_assignment_operation', true), '')::uuid;
      IF v_operation IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.workout_assignment_operations WHERE operation_id = v_operation AND assigned_template_id = NEW.template_id) THEN
        RAISE EXCEPTION 'Assigned workout copies are immutable' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    ELSIF TG_OP = 'UPDATE' AND (public.is_fixed_workout(OLD.template_id) OR public.is_fixed_workout(NEW.template_id)) THEN
      RAISE EXCEPTION 'Assigned workout copies are immutable' USING ERRCODE = '42501';
    ELSIF TG_OP = 'DELETE' AND public.is_fixed_workout(OLD.template_id) THEN
      RAISE EXCEPTION 'Assigned workout copies are immutable' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_fixed_workout() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_fixed_workout_template
  BEFORE INSERT OR UPDATE OR DELETE ON public.workout_templates
  FOR EACH ROW EXECUTE FUNCTION public.guard_fixed_workout();
CREATE TRIGGER guard_fixed_workout_items
  BEFORE INSERT OR UPDATE OR DELETE ON public.template_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_fixed_workout();

CREATE FUNCTION public.assign_workout_template(
  p_operation_id uuid,
  p_assigned_template_id uuid,
  p_source_template_id uuid,
  p_coach_id uuid,
  p_trainee_id uuid,
  p_expected_snapshot jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_snapshot jsonb;
  v_request jsonb;
  v_saved public.workout_assignment_operations%ROWTYPE;
BEGIN
  IF v_user IS NULL OR p_coach_id IS DISTINCT FROM v_user
    OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=v_user AND role='coach') THEN
    RAISE EXCEPTION 'Only the authenticated coach can assign workouts' USING ERRCODE = '42501';
  END IF;
  IF p_operation_id IS NULL OR p_assigned_template_id IS NULL OR p_source_template_id IS NULL OR p_trainee_id IS NULL THEN
    RAISE EXCEPTION 'Stable assignment IDs and recipient are required' USING ERRCODE = '22023';
  END IF;
  v_request := jsonb_build_object('source_template_id',p_source_template_id,'coach_id',p_coach_id,'trainee_id',p_trainee_id);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('workout-assignment:'||p_operation_id::text,0));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('workout-assignment-copy:'||p_assigned_template_id::text,0));
  SELECT * INTO v_saved FROM public.workout_assignment_operations WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF v_saved.coach_id IS DISTINCT FROM v_user OR v_saved.assigned_template_id IS DISTINCT FROM p_assigned_template_id
      OR v_saved.request IS DISTINCT FROM v_request OR v_saved.source_snapshot IS DISTINCT FROM p_expected_snapshot THEN
      RAISE EXCEPTION 'Assignment ID was used for different content or ownership' USING ERRCODE = '23505';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.workout_templates WHERE id=p_assigned_template_id AND scope='ASSIGNED'
      AND creator_id=v_user AND assigned_trainee_id=v_saved.trainee_id) THEN
      RAISE EXCEPTION 'The original assignment is unavailable' USING ERRCODE = '42501';
    END IF;
    RETURN p_assigned_template_id;
  END IF;
  IF EXISTS (SELECT 1 FROM public.workout_templates WHERE id=p_assigned_template_id)
    OR EXISTS (SELECT 1 FROM public.workout_assignment_operations WHERE assigned_template_id=p_assigned_template_id) THEN
    RAISE EXCEPTION 'Assignment template ID already exists' USING ERRCODE = '23505';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_trainee_id AND role='trainee' AND coach_id=v_user FOR SHARE;
  IF NOT FOUND OR NOT public.is_current_coach_of(p_trainee_id) THEN
    RAISE EXCEPTION 'Trainee is not currently linked to this coach' USING ERRCODE = '42501';
  END IF;
  -- Serialize source-header edits/inserts against this snapshot. Lock existing
  -- items too: updates/deletes need not take a lock on their unchanged FK parent.
  PERFORM 1 FROM public.workout_templates WHERE id=p_source_template_id AND creator_id=v_user AND scope='PRIVATE'
    AND is_active FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Private source workout is unavailable' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.template_items WHERE template_id=p_source_template_id FOR UPDATE;

  SELECT jsonb_build_object(
    'name',t.name,'description',t.description,
    'items',coalesce(jsonb_agg(jsonb_build_object('exercise_id',i.exercise_id,'position',i.position,
      'target_sets',i.target_sets,'target_reps',i.target_reps,'target_rpe',i.target_rpe,'rest_seconds',i.rest_seconds)
      ORDER BY i.position) FILTER (WHERE i.id IS NOT NULL),'[]'::jsonb))
  INTO v_snapshot FROM public.workout_templates t LEFT JOIN public.template_items i ON i.template_id=t.id
  WHERE t.id=p_source_template_id GROUP BY t.id;
  IF v_snapshot IS DISTINCT FROM p_expected_snapshot THEN
    RAISE EXCEPTION 'Source workout changed. Reload and review it before assigning.' USING ERRCODE = '40001';
  END IF;
  IF jsonb_array_length(v_snapshot->'items')=0 THEN
    RAISE EXCEPTION 'A workout needs at least one exercise before assignment' USING ERRCODE = '22023';
  END IF;

  -- Insert receipt first: triggers permit this transaction's copy and freeze it after commit.
  INSERT INTO public.workout_assignment_operations(operation_id,assigned_template_id,source_template_id,coach_id,trainee_id,request,source_snapshot)
  VALUES(p_operation_id,p_assigned_template_id,p_source_template_id,v_user,p_trainee_id,v_request,v_snapshot);
  PERFORM pg_catalog.set_config('app.workout_assignment_operation',p_operation_id::text,true);
  INSERT INTO public.workout_templates(id,creator_id,name,description,scope,assigned_trainee_id,is_active)
  VALUES(p_assigned_template_id,v_user,v_snapshot->>'name',v_snapshot->>'description','ASSIGNED',p_trainee_id,true);
  INSERT INTO public.template_items(template_id,exercise_id,position,target_sets,target_reps,target_rpe,rest_seconds)
  SELECT p_assigned_template_id,x.exercise_id,x.position,x.target_sets,x.target_reps,x.target_rpe,x.rest_seconds
  FROM jsonb_to_recordset(v_snapshot->'items') AS x(exercise_id uuid,position int,target_sets int,target_reps int,target_rpe int,rest_seconds int);
  PERFORM pg_catalog.set_config('app.workout_assignment_operation','',true);
  RETURN p_assigned_template_id;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_workout_template(uuid,uuid,uuid,uuid,uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_workout_template(uuid,uuid,uuid,uuid,uuid,jsonb) TO authenticated;
