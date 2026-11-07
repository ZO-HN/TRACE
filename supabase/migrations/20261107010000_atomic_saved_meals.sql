-- Personal meal snapshots: parent, ordered items and retry receipt commit together.
CREATE TABLE public.meal_save_operations (
  operation_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  template_id uuid NOT NULL UNIQUE,
  request jsonb NOT NULL
);
ALTER TABLE public.meal_save_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meal_save_operations FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.save_personal_meal(p_operation_id uuid,p_template_id uuid,p_user_id uuid,p_name text,p_items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid(); v_request jsonb; v_receipt public.meal_save_operations%ROWTYPE;
  v_item jsonb; v_field text; v_number numeric; v_position integer:=0;
BEGIN
  PERFORM 1 FROM public.profiles WHERE id=v_user AND role='trainee' FOR UPDATE;
  IF v_user IS NULL OR NOT FOUND OR v_user IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Matching trainee account required' USING ERRCODE='42501'; END IF;
  IF p_operation_id IS NULL OR p_template_id IS NULL OR p_name IS NULL OR btrim(p_name)='' OR char_length(btrim(p_name))>100 THEN RAISE EXCEPTION 'Meal name must contain 1 to 100 characters'; END IF;
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Meal items must be a list'; END IF;
  IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 OR octet_length(p_items::text)>131072 THEN RAISE EXCEPTION 'A meal needs 1 to 100 foods'; END IF;
  v_request:=jsonb_build_object('name',btrim(p_name),'items',p_items);
  SELECT * INTO v_receipt FROM public.meal_save_operations WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF v_receipt.user_id<>v_user OR v_receipt.template_id<>p_template_id OR v_receipt.request<>v_request THEN RAISE EXCEPTION 'Operation already used with different content or ownership'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.meal_templates WHERE id=p_template_id AND user_id=v_user) THEN RAISE EXCEPTION 'Saved meal no longer available'; END IF;
    RETURN p_template_id;
  END IF;
  IF EXISTS(SELECT 1 FROM public.meal_templates WHERE id=p_template_id) THEN RAISE EXCEPTION 'Meal identity already exists'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_item) k WHERE k NOT IN ('id','name','protein_g','carbs_g','fat_g','calories')) THEN RAISE EXCEPTION 'Invalid meal item'; END IF;
    IF coalesce(v_item->>'id','')='' OR jsonb_typeof(v_item->'name') IS DISTINCT FROM 'string' OR btrim(v_item->>'name')='' OR char_length(v_item->>'name')>280 THEN RAISE EXCEPTION 'Food identity and name required'; END IF;
    IF NOT EXISTS(SELECT 1 FROM jsonb_each(v_item) e WHERE e.key IN ('protein_g','carbs_g','fat_g','calories') AND jsonb_typeof(e.value)='number') THEN RAISE EXCEPTION 'Food needs calories or macros'; END IF;
    FOREACH v_field IN ARRAY ARRAY['protein_g','carbs_g','fat_g','calories'] LOOP
      IF v_item->v_field IS NOT NULL AND v_item->v_field<>'null'::jsonb THEN
        IF jsonb_typeof(v_item->v_field)<>'number' THEN RAISE EXCEPTION 'Invalid food quantity'; END IF;
        v_number:=(v_item->>v_field)::numeric;
        IF v_number<0 OR (v_field='calories' AND (v_number>2147483647 OR v_number<>trunc(v_number))) OR
          (v_field<>'calories' AND (v_number>9999.99 OR v_number<>round(v_number,2))) THEN RAISE EXCEPTION 'Food quantity outside supported storage precision or bounds'; END IF;
      END IF;
    END LOOP;
  END LOOP;
  INSERT INTO public.meal_save_operations VALUES(p_operation_id,v_user,p_template_id,v_request);
  INSERT INTO public.meal_templates(id,user_id,name) VALUES(p_template_id,v_user,btrim(p_name));
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO public.meal_template_items(id,meal_template_id,"order",name,protein_g,carbs_g,fat_g,calories)
      VALUES((v_item->>'id')::uuid,p_template_id,v_position,v_item->>'name',(v_item->>'protein_g')::numeric,(v_item->>'carbs_g')::numeric,(v_item->>'fat_g')::numeric,(v_item->>'calories')::numeric::integer);
    v_position:=v_position+1;
  END LOOP;
  RETURN p_template_id;
END $$;
REVOKE ALL ON FUNCTION public.save_personal_meal(uuid,uuid,uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_personal_meal(uuid,uuid,uuid,text,jsonb) TO authenticated;
