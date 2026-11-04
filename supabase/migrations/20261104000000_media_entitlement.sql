-- Server-issued ownership, independent of client-writable attachment references.
-- Existing records/keys are retained. Unregistered keys never authorize a new URL.
CREATE TABLE public.media_objects (
  object_key text PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('form-video', 'meal-photo', 'coach-image', 'file')),
  content_type text NOT NULL,
  declared_size_bytes numeric NOT NULL CHECK (declared_size_bytes > 0),
  issued_at timestamptz NOT NULL DEFAULT now(),
  CHECK (object_key LIKE kind || '/' || owner_id::text || '/%')
);
ALTER TABLE public.media_objects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.media_objects FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.media_objects TO service_role;

-- No caller-supplied viewer identity; resolve the current relationship on every call.
CREATE FUNCTION public.is_current_coach_of(p_owner_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles trainee
    JOIN public.profiles coach ON coach.id = trainee.coach_id
    WHERE trainee.id = p_owner_id AND trainee.role = 'trainee'
      AND coach.id = auth.uid() AND coach.role = 'coach'
  );
$$;
REVOKE ALL ON FUNCTION public.is_current_coach_of(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_coach_of(uuid) TO authenticated;

CREATE FUNCTION public.require_media_owner(p_key text, p_owner_id uuid, p_kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_key IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.media_objects m
    WHERE m.object_key = p_key AND m.owner_id = p_owner_id AND m.kind = p_kind
  ) THEN
    RAISE EXCEPTION 'Media is unregistered or unavailable for this attachment. Reupload it.'
      USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.require_media_owner(text, uuid, text) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.check_set_media_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_owner uuid;
BEGIN
  -- Preserve unchanged historical references, including old-client upsert replays.
  -- They are not registered, repaired or authorized by this exception.
  IF TG_OP = 'UPDATE' THEN
    IF NEW.session_id IS NOT DISTINCT FROM OLD.session_id
      AND NEW.form_video_s3_key IS NOT DISTINCT FROM OLD.form_video_s3_key THEN RETURN NEW; END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.set_logs s WHERE s.id = NEW.id
      AND s.session_id = NEW.session_id AND s.form_video_s3_key IS NOT DISTINCT FROM NEW.form_video_s3_key)
      THEN RETURN NEW; END IF;
  END IF;
  SELECT user_id INTO v_owner FROM public.workout_sessions WHERE id = NEW.session_id;
  PERFORM public.require_media_owner(NEW.form_video_s3_key, v_owner, 'form-video');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.check_set_media_owner() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER check_set_media_owner BEFORE INSERT OR UPDATE OF session_id, form_video_s3_key
  ON public.set_logs FOR EACH ROW EXECUTE FUNCTION public.check_set_media_owner();

CREATE FUNCTION public.check_form_media_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.client_id IS NOT DISTINCT FROM OLD.client_id
      AND NEW.video_key IS NOT DISTINCT FROM OLD.video_key THEN RETURN NEW; END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM public.form_checks f WHERE f.id = NEW.id
      AND f.client_id = NEW.client_id AND f.video_key IS NOT DISTINCT FROM NEW.video_key)
      THEN RETURN NEW; END IF;
  END IF;
  PERFORM public.require_media_owner(NEW.video_key, NEW.client_id, 'form-video');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.check_form_media_owner() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER check_form_media_owner BEFORE INSERT OR UPDATE OF client_id, video_key
  ON public.form_checks FOR EACH ROW EXECUTE FUNCTION public.check_form_media_owner();

CREATE FUNCTION public.check_avatar_media_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS NOT DISTINCT FROM OLD.id
      AND NEW.avatar_key IS NOT DISTINCT FROM OLD.avatar_key THEN RETURN NEW; END IF;
  END IF;
  PERFORM public.require_media_owner(NEW.avatar_key, NEW.id, 'coach-image');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.check_avatar_media_owner() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER check_avatar_media_owner BEFORE INSERT OR UPDATE OF id, avatar_key
  ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.check_avatar_media_owner();

-- coach_id remains the submission-time audit value; current relationship controls access.
DROP POLICY "Coaches can read their clients' form checks" ON public.form_checks;
CREATE POLICY "Coaches can read their clients' form checks" ON public.form_checks FOR SELECT
  USING (public.is_current_coach_of(client_id));
DROP POLICY "Coaches can review their clients' form checks" ON public.form_checks;
CREATE POLICY "Coaches can review their clients' form checks" ON public.form_checks FOR UPDATE
  USING (public.is_current_coach_of(client_id)) WITH CHECK (public.is_current_coach_of(client_id));

CREATE FUNCTION public.can_view_media(p_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.media_objects m WHERE m.object_key = p_key AND auth.uid() IS NOT NULL
      AND (
        -- Owners can preview an issued upload before its delayed/offline attachment arrives.
        m.owner_id = auth.uid()
        OR (m.kind = 'form-video' AND public.is_current_coach_of(m.owner_id) AND (
          EXISTS (SELECT 1 FROM public.set_logs s
            JOIN public.workout_sessions w ON w.id = s.session_id
            WHERE s.form_video_s3_key = m.object_key AND w.user_id = m.owner_id)
          OR EXISTS (SELECT 1 FROM public.form_checks f
            WHERE f.video_key = m.object_key AND f.client_id = m.owner_id)
        ))
      )
  );
$$;
REVOKE ALL ON FUNCTION public.can_view_media(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_media(text) TO authenticated;
