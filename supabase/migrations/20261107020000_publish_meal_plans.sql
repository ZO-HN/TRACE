-- Published plans are immutable historical copies, separate from editable coach drafts.
CREATE TABLE public.meal_plan_assignments (
  id uuid PRIMARY KEY,
  operation_id uuid NOT NULL UNIQUE,
  coach_id uuid NOT NULL REFERENCES public.profiles(id),
  trainee_id uuid NOT NULL REFERENCES public.profiles(id),
  source_plan_id uuid NOT NULL,
  source_data jsonb NOT NULL,
  name text NOT NULL,
  start_date date NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  snapshot jsonb NOT NULL
);
CREATE INDEX meal_plan_assignments_recipient_date ON public.meal_plan_assignments(trainee_id,start_date DESC,published_at DESC,id);
ALTER TABLE public.meal_plan_assignments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meal_plan_assignments FROM PUBLIC,anon,authenticated;
GRANT SELECT(id,operation_id,coach_id,trainee_id,source_plan_id,name,start_date,published_at,snapshot) ON public.meal_plan_assignments TO authenticated;
CREATE POLICY meal_plan_assignment_read ON public.meal_plan_assignments FOR SELECT TO authenticated USING (
  trainee_id=auth.uid() OR (coach_id=auth.uid() AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=trainee_id AND p.coach_id=auth.uid()))
);

CREATE FUNCTION public.publish_meal_plan(p_operation_id uuid,p_assignment_id uuid,p_coach_id uuid,p_plan_id uuid,p_trainee_id uuid,p_start_date date,p_expected_data jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_coach uuid:=auth.uid(); v_source public.meal_plans%ROWTYPE; v_previous public.meal_plan_assignments%ROWTYPE;
  v_day jsonb; v_meal jsonb; v_item jsonb; v_food public.foods%ROWTYPE;
  v_days jsonb:='[]'; v_meals jsonb; v_items jsonb; v_servings numeric; v_target numeric;
  v_p numeric; v_c numeric; v_f numeric; v_k numeric; v_count integer:=0;
BEGIN
  IF v_coach IS NULL OR v_coach IS DISTINCT FROM p_coach_id OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_coach AND role='coach') THEN RAISE EXCEPTION 'Authenticated coach required' USING ERRCODE='42501'; END IF;
  IF p_operation_id IS NULL OR p_assignment_id IS NULL OR p_start_date IS NULL THEN RAISE EXCEPTION 'Publication identities and start date required'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=p_trainee_id AND role='trainee' AND coach_id=v_coach FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trainee is not currently linked to this coach' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_previous FROM public.meal_plan_assignments WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF v_previous.id<>p_assignment_id OR v_previous.coach_id<>v_coach OR v_previous.trainee_id<>p_trainee_id OR v_previous.source_plan_id<>p_plan_id OR v_previous.start_date<>p_start_date OR v_previous.source_data IS DISTINCT FROM p_expected_data THEN RAISE EXCEPTION 'Publication operation already used with different content'; END IF;
    RETURN v_previous.id;
  END IF;
  SELECT * INTO v_source FROM public.meal_plans WHERE id=p_plan_id AND coach_id=v_coach FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Coach meal plan unavailable' USING ERRCODE='42501'; END IF;
  IF v_source.data IS DISTINCT FROM p_expected_data THEN RAISE EXCEPTION 'Draft changed; reload before publishing' USING ERRCODE='40001'; END IF;
  IF jsonb_typeof(v_source.data->'days') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Add plan days before publishing'; END IF;
  IF jsonb_array_length(v_source.data->'days') NOT BETWEEN 1 AND 31 OR octet_length(v_source.data::text)>262144 THEN RAISE EXCEPTION 'A published plan supports 1 to 31 days'; END IF;
  IF jsonb_typeof(v_source.data->'appliedTarget') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Set an explicit calorie target before publishing'; END IF;
  v_target:=(v_source.data->>'appliedTarget')::numeric;
  IF v_target<=0 OR v_target>2147483647 OR v_target<>trunc(v_target) THEN RAISE EXCEPTION 'Calorie target must be a positive supported integer'; END IF;
  FOR v_day IN SELECT value FROM jsonb_array_elements(v_source.data->'days') LOOP
    IF jsonb_typeof(v_day->'label') IS DISTINCT FROM 'string' OR btrim(v_day->>'label')='' OR char_length(v_day->>'label')>100 OR jsonb_typeof(v_day->'meals') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Each day needs a label and meals'; END IF;
    IF jsonb_array_length(v_day->'meals') NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Each day supports 1 to 20 meals'; END IF;
    v_meals:='[]';v_p:=0;v_c:=0;v_f:=0;v_k:=0;
    FOR v_meal IN SELECT value FROM jsonb_array_elements(v_day->'meals') LOOP
      IF jsonb_typeof(v_meal->'name') IS DISTINCT FROM 'string' OR btrim(v_meal->>'name')='' OR char_length(v_meal->>'name')>100 OR jsonb_typeof(v_meal->'items') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Each meal needs a name and foods'; END IF;
      IF jsonb_array_length(v_meal->'items') NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Each meal supports 1 to 50 foods'; END IF;
      v_items:='[]';
      FOR v_item IN SELECT value FROM jsonb_array_elements(v_meal->'items') LOOP
        v_count:=v_count+1; IF v_count>500 THEN RAISE EXCEPTION 'A plan supports up to 500 food rows'; END IF;
        IF jsonb_typeof(v_item->'servings') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Enter a positive serving quantity'; END IF;
        v_servings:=(v_item->>'servings')::numeric;
        IF v_servings<=0 OR v_servings>100 OR v_servings<>round(v_servings,3) THEN RAISE EXCEPTION 'Servings support up to 100 with three decimal places'; END IF;
        SELECT * INTO v_food FROM public.foods WHERE id=(v_item->>'foodId')::uuid AND coach_id=v_coach FOR SHARE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Food is missing or belongs to another coach' USING ERRCODE='42501'; END IF;
        IF v_food.serving_size IS NULL OR btrim(v_food.serving_size)='' THEN RAISE EXCEPTION 'Published foods require an explicit catalog serving label'; END IF;
        IF v_food.calories IS NULL OR v_food.protein_g IS NULL OR v_food.carbs_g IS NULL OR v_food.fat_g IS NULL OR least(v_food.calories,v_food.protein_g,v_food.carbs_g,v_food.fat_g)<0 THEN RAISE EXCEPTION 'Published foods require non-negative calories and all core macros'; END IF;
        IF v_food.protein_g*v_servings>99999.9 OR v_food.carbs_g*v_servings>99999.9 OR v_food.fat_g*v_servings>99999.9 OR v_food.calories*v_servings>2147483647 THEN RAISE EXCEPTION 'Scaled food exceeds supported logging bounds'; END IF;
        v_items:=v_items||jsonb_build_array(jsonb_build_object('food_id',v_food.id,'name',v_food.name,'serving_size',v_food.serving_size,'servings',v_servings,
          'protein_g',round(v_food.protein_g*v_servings,1),'carbs_g',round(v_food.carbs_g*v_servings,1),'fat_g',round(v_food.fat_g*v_servings,1),'calories',round(v_food.calories*v_servings)));
        v_p:=v_p+round(v_food.protein_g*v_servings,1);v_c:=v_c+round(v_food.carbs_g*v_servings,1);v_f:=v_f+round(v_food.fat_g*v_servings,1);v_k:=v_k+round(v_food.calories*v_servings);
      END LOOP;
      v_meals:=v_meals||jsonb_build_array(jsonb_build_object('name',v_meal->>'name','items',v_items));
    END LOOP;
    v_days:=v_days||jsonb_build_array(jsonb_build_object('label',v_day->>'label','meals',v_meals,'protein_g',v_p,'carbs_g',v_c,'fat_g',v_f,'calories',v_k));
  END LOOP;
  INSERT INTO public.meal_plan_assignments(id,operation_id,coach_id,trainee_id,source_plan_id,source_data,name,start_date,snapshot)
    VALUES(p_assignment_id,p_operation_id,v_coach,p_trainee_id,p_plan_id,v_source.data,v_source.name,p_start_date,jsonb_build_object('version',1,'target_calories',v_target,'days',v_days));
  RETURN p_assignment_id;
END $$;
REVOKE ALL ON FUNCTION public.publish_meal_plan(uuid,uuid,uuid,uuid,uuid,date,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_meal_plan(uuid,uuid,uuid,uuid,uuid,date,jsonb) TO authenticated;

CREATE FUNCTION public.get_current_meal_plan(p_trainee_id uuid,p_date date) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row public.meal_plan_assignments%ROWTYPE; v_coach uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_trainee_id THEN RAISE EXCEPTION 'Owning trainee required' USING ERRCODE='42501'; END IF;
  SELECT coach_id INTO v_coach FROM public.profiles WHERE id=p_trainee_id AND role='trainee';
  IF NOT FOUND THEN RAISE EXCEPTION 'Trainee account required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_row FROM public.meal_plan_assignments WHERE trainee_id=p_trainee_id AND coach_id=v_coach AND start_date<=p_date
    ORDER BY start_date DESC,published_at DESC,id DESC LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('id',v_row.id,'name',v_row.name,'start_date',v_row.start_date,'published_at',v_row.published_at,'snapshot',v_row.snapshot);
END $$;
REVOKE ALL ON FUNCTION public.get_current_meal_plan(uuid,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_current_meal_plan(uuid,date) TO authenticated;
