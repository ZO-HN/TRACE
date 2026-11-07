-- Private coach-file resources with explicit, current-link trainee publication.
CREATE TABLE public.vault_resources (
  id uuid PRIMARY KEY,
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.vault_folders(id) ON DELETE SET NULL,
  title varchar(150) NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 150),
  description text CHECK (description IS NULL OR length(description) <= 2000),
  filename varchar(255) NOT NULL CHECK (length(filename) BETWEEN 1 AND 255),
  media_key text NOT NULL UNIQUE REFERENCES public.media_objects(object_key) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('application/pdf','image/jpeg','image/png','image/webp')),
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 26214400),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vault_resources ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vault_resources FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.vault_resources TO authenticated;

CREATE TABLE public.vault_resource_create_operations (
  operation_id uuid PRIMARY KEY,
  resource_id uuid NOT NULL UNIQUE REFERENCES public.vault_resources(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vault_resource_create_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vault_resource_create_operations FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE public.vault_resource_publications (
  id uuid PRIMARY KEY,
  resource_id uuid NOT NULL REFERENCES public.vault_resources(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trainee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  published_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revocation_reason text,
  CHECK ((revoked_at IS NULL) = (revocation_reason IS NULL))
);
ALTER TABLE public.vault_resource_publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vault_resource_publications FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.vault_resource_publications TO authenticated;
CREATE UNIQUE INDEX vault_resource_one_active_publication
  ON public.vault_resource_publications(resource_id, trainee_id) WHERE revoked_at IS NULL;
CREATE INDEX vault_resources_coach_page ON public.vault_resources(coach_id, created_at DESC, id DESC);
CREATE INDEX vault_resource_publications_trainee_page
  ON public.vault_resource_publications(trainee_id, published_at DESC, id DESC);
CREATE INDEX vault_resource_publications_resource ON public.vault_resource_publications(resource_id, revoked_at);

CREATE TABLE public.vault_resource_publication_operations (
  operation_id uuid PRIMARY KEY,
  publication_id uuid NOT NULL UNIQUE REFERENCES public.vault_resource_publications(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vault_resource_publication_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vault_resource_publication_operations FROM PUBLIC, anon, authenticated, service_role;

-- Publication reads never query resources; resource reads may safely consult the
-- publication policy without creating recursive RLS evaluation.
CREATE POLICY vault_resource_owner_or_recipient_read ON public.vault_resources FOR SELECT TO authenticated
USING (coach_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.vault_resource_publications p
  JOIN public.profiles trainee ON trainee.id = p.trainee_id
  WHERE p.resource_id = vault_resources.id AND p.coach_id = vault_resources.coach_id
    AND p.trainee_id = auth.uid() AND p.revoked_at IS NULL
    AND trainee.role = 'trainee' AND trainee.coach_id = p.coach_id
));
CREATE POLICY vault_publication_owner_or_current_recipient_read ON public.vault_resource_publications FOR SELECT TO authenticated
USING (coach_id = auth.uid() OR (
  trainee_id = auth.uid() AND revoked_at IS NULL AND EXISTS (
    SELECT 1 FROM public.profiles trainee
    WHERE trainee.id = auth.uid() AND trainee.role = 'trainee' AND trainee.coach_id = coach_id
  )
));

CREATE FUNCTION public.create_vault_resource(
  p_operation_id uuid, p_resource_id uuid, p_coach_id uuid, p_folder_id uuid,
  p_title text, p_description text, p_filename text, p_media_key text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_request jsonb;
  v_saved public.vault_resource_create_operations%ROWTYPE;
  v_media public.media_objects%ROWTYPE;
BEGIN
  IF v_user IS NULL OR p_coach_id IS DISTINCT FROM v_user
    OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user AND role = 'coach') THEN
    RAISE EXCEPTION 'Only the authenticated coach can create a Vault resource' USING ERRCODE = '42501';
  END IF;
  IF p_operation_id IS NULL OR p_resource_id IS NULL OR p_media_key IS NULL
    OR p_title IS NULL OR length(btrim(p_title)) NOT BETWEEN 1 AND 150
    OR (p_description IS NOT NULL AND length(p_description) > 2000)
    OR p_filename IS NULL OR length(p_filename) NOT BETWEEN 1 AND 255
    OR position('/' in p_filename) > 0 OR position(chr(92) in p_filename) > 0 OR p_filename IN ('.','..')
    OR p_filename ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'A valid resource identity and display name are required' USING ERRCODE = '22023';
  END IF;
  v_request := jsonb_build_object('resource_id',p_resource_id,'coach_id',p_coach_id,'folder_id',p_folder_id,
    'title',p_title,'description',p_description,'filename',p_filename,'media_key',p_media_key);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('vault-resource-operation:'||p_operation_id::text,0));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('vault-resource-id:'||p_resource_id::text,0));
  SELECT * INTO v_saved FROM public.vault_resource_create_operations WHERE operation_id = p_operation_id FOR UPDATE;
  IF FOUND THEN
    IF v_saved.coach_id IS DISTINCT FROM v_user OR v_saved.resource_id IS DISTINCT FROM p_resource_id
      OR v_saved.request IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Vault resource operation was used for different content or ownership' USING ERRCODE = '23505';
    END IF;
    RETURN v_saved.resource_id;
  END IF;
  IF EXISTS (SELECT 1 FROM public.vault_resources WHERE id = p_resource_id)
    OR EXISTS (SELECT 1 FROM public.vault_resources WHERE media_key = p_media_key) THEN
    RAISE EXCEPTION 'Vault resource identity already exists' USING ERRCODE = '23505';
  END IF;
  IF p_folder_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.vault_folders WHERE id = p_folder_id AND coach_id = v_user FOR SHARE
  ) THEN RAISE EXCEPTION 'Vault folder is unavailable' USING ERRCODE = '42501'; END IF;

  SELECT * INTO v_media FROM public.media_objects
  WHERE object_key = p_media_key AND owner_id = v_user AND kind = 'file'
    AND protocol_version = 2 AND state = 'ready' AND verified_key = object_key
    AND actual_size_bytes BETWEEN 1 AND 26214400
    AND actual_content_type IN ('application/pdf','image/jpeg','image/png','image/webp')
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Verify this V2 file upload before creating a resource' USING ERRCODE = '42501'; END IF;

  INSERT INTO public.vault_resources(id,coach_id,folder_id,title,description,filename,media_key,content_type,size_bytes)
  VALUES(p_resource_id,v_user,p_folder_id,btrim(p_title),p_description,p_filename,p_media_key,
    v_media.actual_content_type,v_media.actual_size_bytes);
  INSERT INTO public.vault_resource_create_operations(operation_id,resource_id,coach_id,request)
  VALUES(p_operation_id,p_resource_id,v_user,v_request);
  RETURN p_resource_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_vault_resource(uuid,uuid,uuid,uuid,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_vault_resource(uuid,uuid,uuid,uuid,text,text,text,text) TO authenticated;

CREATE FUNCTION public.publish_vault_resource(
  p_operation_id uuid, p_publication_id uuid, p_coach_id uuid, p_resource_id uuid, p_trainee_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_request jsonb;
  v_saved public.vault_resource_publication_operations%ROWTYPE;
BEGIN
  IF v_user IS NULL OR p_coach_id IS DISTINCT FROM v_user
    OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user AND role = 'coach') THEN
    RAISE EXCEPTION 'Only the authenticated coach can publish a Vault resource' USING ERRCODE = '42501';
  END IF;
  IF p_operation_id IS NULL OR p_publication_id IS NULL OR p_resource_id IS NULL OR p_trainee_id IS NULL THEN
    RAISE EXCEPTION 'Stable publication IDs and recipient are required' USING ERRCODE = '22023';
  END IF;
  v_request := jsonb_build_object('publication_id',p_publication_id,'resource_id',p_resource_id,
    'coach_id',p_coach_id,'trainee_id',p_trainee_id);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('vault-publication-operation:'||p_operation_id::text,0));
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('vault-publication-id:'||p_publication_id::text,0));
  SELECT * INTO v_saved FROM public.vault_resource_publication_operations WHERE operation_id = p_operation_id FOR UPDATE;
  IF FOUND THEN
    IF v_saved.coach_id IS DISTINCT FROM v_user OR v_saved.publication_id IS DISTINCT FROM p_publication_id
      OR v_saved.request IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Vault publication operation was used for a different recipient or resource' USING ERRCODE = '23505';
    END IF;
    -- A replay acknowledges the original result; it never restores a revoked grant.
    RETURN v_saved.publication_id;
  END IF;
  IF EXISTS (SELECT 1 FROM public.vault_resource_publications WHERE id = p_publication_id) THEN
    RAISE EXCEPTION 'Vault publication identity already exists' USING ERRCODE = '23505';
  END IF;
  PERFORM 1 FROM public.profiles WHERE id = p_trainee_id AND role = 'trainee' AND coach_id = v_user FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Trainee is not currently linked to this coach' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.vault_resources r JOIN public.media_objects m ON m.object_key = r.media_key
  WHERE r.id = p_resource_id AND r.coach_id = v_user AND m.kind = 'file'
    AND m.protocol_version = 2 AND m.state = 'ready' AND m.verified_key = m.object_key
  FOR SHARE OF r,m;
  IF NOT FOUND THEN RAISE EXCEPTION 'Verified Vault resource is unavailable' USING ERRCODE = '42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.vault_resource_publications
    WHERE resource_id = p_resource_id AND trainee_id = p_trainee_id AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'This resource is already published to that trainee' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.vault_resource_publications(id,resource_id,coach_id,trainee_id)
  VALUES(p_publication_id,p_resource_id,v_user,p_trainee_id);
  INSERT INTO public.vault_resource_publication_operations(operation_id,publication_id,coach_id,request)
  VALUES(p_operation_id,p_publication_id,v_user,v_request);
  RETURN p_publication_id;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_vault_resource(uuid,uuid,uuid,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_vault_resource(uuid,uuid,uuid,uuid,uuid) TO authenticated;

CREATE FUNCTION public.revoke_vault_publications_on_link_end() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.role = 'trainee' AND (NEW.coach_id IS DISTINCT FROM OLD.coach_id OR NEW.role IS DISTINCT FROM 'trainee') THEN
    UPDATE public.vault_resource_publications SET revoked_at = now(), revocation_reason = 'coach_link_ended'
    WHERE trainee_id = OLD.id AND coach_id = OLD.coach_id AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_vault_publications_on_link_end() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER revoke_vault_publications_on_link_end
  AFTER UPDATE OF coach_id, role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.revoke_vault_publications_on_link_end();

-- Add the exact active recipient publication to the current private file grants.
CREATE OR REPLACE FUNCTION public.can_access_media_identity(p_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.media_objects m WHERE m.object_key = p_key AND auth.uid() IS NOT NULL AND (
    m.owner_id = auth.uid()
    OR (m.kind = 'form-video' AND public.is_current_coach_of(m.owner_id) AND (
      EXISTS (SELECT 1 FROM public.set_logs s JOIN public.workout_sessions w ON w.id = s.session_id
        WHERE s.form_video_s3_key = m.object_key AND w.user_id = m.owner_id)
      OR EXISTS (SELECT 1 FROM public.form_checks f WHERE f.video_key = m.object_key AND f.client_id = m.owner_id)))
    OR (m.kind = 'file' AND EXISTS (
      SELECT 1 FROM public.vault_resources r
      JOIN public.vault_resource_publications p ON p.resource_id = r.id
      JOIN public.profiles trainee ON trainee.id = p.trainee_id
      WHERE r.media_key = m.object_key AND r.coach_id = m.owner_id AND p.coach_id = m.owner_id
        AND p.trainee_id = auth.uid() AND p.revoked_at IS NULL
        AND trainee.role = 'trainee' AND trainee.coach_id = p.coach_id))
    OR (m.kind = 'file' AND public.is_current_coach_of(m.owner_id) AND EXISTS (
      SELECT 1 FROM public.check_ins c CROSS JOIN LATERAL jsonb_each(
        CASE WHEN jsonb_typeof(c.responses) = 'object' THEN c.responses ELSE '{}'::jsonb END) answer
      WHERE c.client_id = m.owner_id AND c.coach_id = auth.uid()
        AND jsonb_typeof(answer.value) = 'object' AND answer.value->>'key' = m.object_key))
  ));
$$;
