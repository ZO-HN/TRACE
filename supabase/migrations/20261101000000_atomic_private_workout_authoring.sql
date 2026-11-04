-- Private coach authoring only. Existing mobile writes, assignments and logs are unchanged.
-- A receipt binds both UUIDs to one normalized request, including after response loss.
CREATE TABLE public.workout_template_save_operations (
  operation_id uuid PRIMARY KEY,
  template_id uuid NOT NULL UNIQUE,
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request jsonb NOT NULL
);
ALTER TABLE public.workout_template_save_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workout_template_save_operations FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.save_workout_template(
  p_operation_id uuid,
  p_template_id uuid,
  p_creator_id uuid,
  p_name text,
  p_description text,
  p_items jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_name text := btrim(p_name);
  v_description text := nullif(btrim(p_description), '');
  v_items jsonb;
  v_request jsonb;
  v_saved public.workout_template_save_operations%ROWTYPE;
BEGIN
  IF v_user IS NULL OR p_creator_id IS DISTINCT FROM v_user
    OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user AND role = 'coach') THEN
    RAISE EXCEPTION 'Only the authenticated coach can save this private workout' USING ERRCODE = '42501';
  END IF;
  IF p_operation_id IS NULL OR p_template_id IS NULL THEN
    RAISE EXCEPTION 'Stable operation and template IDs are required' USING ERRCODE = '22023';
  END IF;
  IF v_name IS NULL OR v_name = '' OR length(v_name) > 150 THEN
    RAISE EXCEPTION 'Workout name must contain 1-150 characters' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Workout items must be an array' USING ERRCODE = '22023';
  END IF;
  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Add at least one exercise' USING ERRCODE = '22023';
  END IF;
  -- Require the same integer ranges as template_items; reject malformed/null fields.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) WITH ORDINALITY AS a(item, ordinal)
    WHERE jsonb_typeof(item) IS DISTINCT FROM 'object'
      OR (item->>'position') IS DISTINCT FROM ordinal::text
      OR coalesce(item->>'target_sets', '') !~ '^[0-9]+$'
      OR coalesce(item->>'target_reps', '') !~ '^[0-9]+$'
      OR coalesce(item->>'rest_seconds', '') !~ '^[0-9]+$'
      OR (item->>'target_rpe' IS NOT NULL AND (item->>'target_rpe') !~ '^[0-9]+$')
  ) THEN
    RAISE EXCEPTION 'Invalid ordered workout prescription' USING ERRCODE = '22023';
  END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'exercise_id', x.exercise_id, 'position', x.position,
    'target_sets', x.target_sets, 'target_reps', x.target_reps,
    'target_rpe', x.target_rpe, 'rest_seconds', x.rest_seconds
  ) ORDER BY x.position) INTO v_items
  FROM jsonb_to_recordset(p_items) AS x(exercise_id uuid, position int,
    target_sets int, target_reps int, target_rpe int, rest_seconds int);
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(v_items) AS x(exercise_id uuid,
      target_sets int, target_reps int, target_rpe int, rest_seconds int)
    WHERE x.exercise_id IS NULL OR x.target_sets NOT BETWEEN 1 AND 20
      OR x.target_reps NOT BETWEEN 1 AND 100 OR x.rest_seconds NOT BETWEEN 0 AND 600
      OR (x.target_rpe IS NOT NULL AND x.target_rpe NOT BETWEEN 1 AND 10)
  ) THEN
    RAISE EXCEPTION 'Prescription is outside the supported ranges' USING ERRCODE = '22023';
  END IF;
  v_request := jsonb_build_object('name', v_name, 'description', v_description, 'items', v_items);

  -- Serialize both retry IDs; no ON CONFLICT update can replace an existing template.
  PERFORM pg_advisory_xact_lock(hashtextextended('workout-save-operation:' || p_operation_id::text, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('workout-save-template:' || p_template_id::text, 0));
  SELECT * INTO v_saved FROM public.workout_template_save_operations WHERE operation_id = p_operation_id;
  IF FOUND THEN
    IF v_saved.creator_id IS DISTINCT FROM v_user OR v_saved.template_id IS DISTINCT FROM p_template_id
      OR v_saved.request IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Save ID already used for different ownership or content. Reload the workout library to inspect the original save.' USING ERRCODE = '23505';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.workout_templates
      WHERE id = p_template_id AND creator_id = v_user AND scope = 'PRIVATE') THEN
      RAISE EXCEPTION 'The original saved workout is no longer available' USING ERRCODE = '42501';
    END IF;
    RETURN p_template_id;
  END IF;
  IF EXISTS (SELECT 1 FROM public.workout_templates WHERE id = p_template_id)
    OR EXISTS (SELECT 1 FROM public.workout_template_save_operations WHERE template_id = p_template_id) THEN
    RAISE EXCEPTION 'Template ID already exists; this operation cannot overwrite it' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.workout_templates(id, creator_id, name, description, scope, assigned_trainee_id, is_active)
  VALUES (p_template_id, v_user, v_name, v_description, 'PRIVATE', NULL, true);
  INSERT INTO public.template_items(template_id, exercise_id, position, target_sets, target_reps, target_rpe, rest_seconds)
  SELECT p_template_id, exercise_id, position, target_sets, target_reps, target_rpe, rest_seconds
  FROM jsonb_to_recordset(v_items) AS x(exercise_id uuid, position int,
    target_sets int, target_reps int, target_rpe int, rest_seconds int);
  INSERT INTO public.workout_template_save_operations(operation_id, template_id, creator_id, request)
  VALUES (p_operation_id, p_template_id, v_user, v_request);
  RETURN p_template_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_workout_template(uuid, uuid, uuid, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_workout_template(uuid, uuid, uuid, text, text, jsonb) TO authenticated;
