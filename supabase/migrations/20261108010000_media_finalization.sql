-- Issuance is not upload proof. Existing registered V1 keys are verified/sealed
-- on first read; unregistered legacy references are never grandfathered.
ALTER TABLE public.media_objects DROP CONSTRAINT media_objects_kind_check;
ALTER TABLE public.media_objects ADD CONSTRAINT media_objects_kind_check
  CHECK(kind IN('form-video','meal-photo','coach-image','progress-photo','file'));
ALTER TABLE public.media_objects
  ADD COLUMN protocol_version integer NOT NULL DEFAULT 1 CHECK(protocol_version IN(1,2)),
  ADD COLUMN upload_operation_id uuid,
  ADD COLUMN state text NOT NULL DEFAULT 'pending' CHECK(state IN('pending','ready')),
  ADD COLUMN verified_key text,
  ADD COLUMN actual_size_bytes bigint,
  ADD COLUMN actual_content_type text,
  ADD COLUMN verified_etag text,
  ADD COLUMN verified_at timestamptz,
  ADD CONSTRAINT ready_media_complete CHECK(state<>'ready' OR (verified_key IS NOT NULL AND actual_size_bytes IS NOT NULL AND actual_size_bytes>0
    AND actual_content_type IS NOT NULL AND verified_etag IS NOT NULL AND verified_at IS NOT NULL));
CREATE UNIQUE INDEX media_upload_operation ON public.media_objects(owner_id,upload_operation_id) WHERE upload_operation_id IS NOT NULL;
CREATE UNIQUE INDEX media_verified_key ON public.media_objects(verified_key) WHERE verified_key IS NOT NULL;

CREATE FUNCTION public.media_size_limit(p_kind text) RETURNS bigint LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT CASE p_kind WHEN 'form-video' THEN 50*1024*1024 WHEN 'file' THEN 25*1024*1024
    WHEN 'meal-photo' THEN 10*1024*1024 WHEN 'coach-image' THEN 10*1024*1024 WHEN 'progress-photo' THEN 10*1024*1024 END::bigint;
$$;
REVOKE ALL ON FUNCTION public.media_size_limit(text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.register_media_upload(p_owner_id uuid,p_operation_id uuid,p_kind text,p_content_type text,p_size_bytes bigint)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_saved public.media_objects%ROWTYPE; v_key text;
BEGIN
  IF p_owner_id IS NULL OR p_operation_id IS NULL OR p_kind IS NULL OR public.media_size_limit(p_kind) IS NULL
    OR p_size_bytes IS NULL OR p_size_bytes<=0 OR p_size_bytes>public.media_size_limit(p_kind)
    OR p_content_type IS NULL OR NOT (
      (p_kind='form-video' AND p_content_type IN('video/mp4','video/webm','video/quicktime'))
      OR (p_kind IN('meal-photo','progress-photo') AND p_content_type IN('image/jpeg','image/png','image/webp','image/heic'))
      OR (p_kind='coach-image' AND p_content_type IN('image/jpeg','image/png','image/webp'))
      OR (p_kind='file' AND p_content_type IN('application/pdf','image/jpeg','image/png','image/webp'))
    ) THEN RAISE EXCEPTION 'Invalid media upload manifest' USING ERRCODE='22023'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('media-upload:'||p_owner_id::text||':'||p_operation_id::text,0));
  SELECT * INTO v_saved FROM public.media_objects WHERE owner_id=p_owner_id AND upload_operation_id=p_operation_id;
  IF FOUND THEN
    IF v_saved.protocol_version<>2 OR v_saved.kind IS DISTINCT FROM p_kind OR v_saved.content_type IS DISTINCT FROM p_content_type
      OR v_saved.declared_size_bytes IS DISTINCT FROM p_size_bytes::numeric THEN
      RAISE EXCEPTION 'Media operation was used for different content' USING ERRCODE='23505'; END IF;
    RETURN v_saved.object_key;
  END IF;
  v_key:=p_kind||'/'||p_owner_id::text||'/'||p_operation_id::text;
  INSERT INTO public.media_objects(object_key,owner_id,kind,content_type,declared_size_bytes,protocol_version,upload_operation_id)
    VALUES(v_key,p_owner_id,p_kind,p_content_type,p_size_bytes,2,p_operation_id);
  RETURN v_key;
END;
$$;
REVOKE ALL ON FUNCTION public.register_media_upload(uuid,uuid,text,text,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_media_upload(uuid,uuid,text,text,bigint) TO service_role;

CREATE FUNCTION public.mark_media_ready(p_key text,p_verified_key text,p_size_bytes bigint,p_content_type text,p_etag text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_media public.media_objects%ROWTYPE; v_expected text;
BEGIN
  SELECT * INTO v_media FROM public.media_objects WHERE object_key=p_key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unregistered media' USING ERRCODE='42501'; END IF;
  v_expected:=CASE WHEN v_media.protocol_version=2 THEN p_key
    ELSE 'sealed/'||encode(sha256(convert_to(p_key,'UTF8')),'hex') END;
  IF p_verified_key IS DISTINCT FROM v_expected OR p_size_bytes IS NULL OR p_size_bytes<=0
    OR p_size_bytes::numeric IS DISTINCT FROM v_media.declared_size_bytes OR p_size_bytes>public.media_size_limit(v_media.kind)
    OR p_content_type IS DISTINCT FROM v_media.content_type OR p_etag IS NULL OR length(p_etag) NOT BETWEEN 1 AND 200
    OR p_etag~'[[:cntrl:]]' THEN RAISE EXCEPTION 'Verified media metadata does not match issuance' USING ERRCODE='22023'; END IF;
  IF v_media.state='ready' THEN
    IF v_media.verified_key IS DISTINCT FROM p_verified_key OR v_media.actual_size_bytes IS DISTINCT FROM p_size_bytes
      OR v_media.actual_content_type IS DISTINCT FROM p_content_type OR v_media.verified_etag IS DISTINCT FROM p_etag THEN
      RAISE EXCEPTION 'Ready media cannot be rebound to different bytes' USING ERRCODE='23505'; END IF;
    RETURN v_media.verified_key;
  END IF;
  UPDATE public.media_objects SET state='ready',verified_key=p_verified_key,actual_size_bytes=p_size_bytes,
    actual_content_type=p_content_type,verified_etag=p_etag,verified_at=now() WHERE object_key=p_key;
  RETURN p_verified_key;
END;
$$;
REVOKE ALL ON FUNCTION public.mark_media_ready(text,text,bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mark_media_ready(text,text,bigint,text,text) TO service_role;

ALTER FUNCTION public.can_view_media(text) RENAME TO can_access_media_identity;
CREATE FUNCTION public.can_view_media(p_key text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT public.can_access_media_identity(p_key) AND EXISTS(SELECT 1 FROM public.media_objects WHERE object_key=p_key AND state='ready');
$$;
REVOKE ALL ON FUNCTION public.can_view_media(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_view_media(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.require_media_owner(p_key text,p_owner_id uuid,p_kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF p_key IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.media_objects m WHERE m.object_key=p_key
    AND m.owner_id=p_owner_id AND m.kind=p_kind AND (m.protocol_version=1 OR m.state='ready')) THEN
    RAISE EXCEPTION 'Media is unregistered or unavailable for this attachment. Verify or reupload it.' USING ERRCODE='42501'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.require_media_owner(text,uuid,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.check_progress_media_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id AND NEW.photo_s3_key IS NOT DISTINCT FROM OLD.photo_s3_key THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM public.progress_photos WHERE id=NEW.id AND user_id=NEW.user_id AND photo_s3_key=NEW.photo_s3_key) THEN RETURN NEW; END IF;
  PERFORM public.require_media_owner(NEW.photo_s3_key,NEW.user_id,'progress-photo');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.check_progress_media_owner() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER check_progress_media_owner BEFORE INSERT OR UPDATE OF user_id,photo_s3_key ON public.progress_photos
  FOR EACH ROW EXECUTE FUNCTION public.check_progress_media_owner();

CREATE TABLE public.media_submission_operations (
  operation_id uuid PRIMARY KEY,owner_id uuid NOT NULL,kind text NOT NULL,request jsonb NOT NULL
);
ALTER TABLE public.media_submission_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.media_submission_operations FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.save_progress_photo(p_operation_id uuid,p_owner_id uuid,p_key text,p_date date,p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid();v_request jsonb;v_saved public.media_submission_operations%ROWTYPE;
BEGIN
  IF v_user IS NULL OR v_user IS DISTINCT FROM p_owner_id OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_user AND role='trainee') THEN
    RAISE EXCEPTION 'Only the owning trainee can save this photo' USING ERRCODE='42501';END IF;
  IF p_operation_id IS NULL OR p_key IS NULL OR p_date IS NULL OR NOT isfinite(p_date)
    OR p_date NOT BETWEEN DATE '2000-01-01' AND DATE '2100-12-31' OR length(coalesce(p_note,''))>2000 THEN
    RAISE EXCEPTION 'Stable photo identity and valid local date are required' USING ERRCODE='22023';END IF;
  v_request:=jsonb_build_object('key',p_key,'date',p_date,'note',p_note);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('media-submission:'||p_operation_id::text,0));
  SELECT * INTO v_saved FROM public.media_submission_operations WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF v_saved.owner_id IS DISTINCT FROM v_user OR v_saved.kind<>'progress-photo' OR v_saved.request IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Media submission operation was used for different content or ownership' USING ERRCODE='23505';END IF;
    IF NOT EXISTS(SELECT 1 FROM public.progress_photos WHERE id=p_operation_id AND user_id=v_user AND photo_s3_key=p_key) THEN
      RAISE EXCEPTION 'Original photo is unavailable; it will not be recreated' USING ERRCODE='42501';END IF;
    RETURN p_operation_id;
  END IF;
  PERFORM public.require_media_owner(p_key,v_user,'progress-photo');
  IF NOT public.can_view_media(p_key) THEN RAISE EXCEPTION 'Verify this photo upload before saving' USING ERRCODE='42501';END IF;
  INSERT INTO public.progress_photos(id,user_id,taken_date,photo_s3_key,note) VALUES(p_operation_id,v_user,p_date,p_key,p_note);
  INSERT INTO public.media_submission_operations VALUES(p_operation_id,v_user,'progress-photo',v_request);
  RETURN p_operation_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_progress_photo(uuid,uuid,text,date,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_progress_photo(uuid,uuid,text,date,text) TO authenticated;

CREATE FUNCTION public.submit_form_check(p_operation_id uuid,p_owner_id uuid,p_key text,p_exercise_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid();v_request jsonb;v_saved public.media_submission_operations%ROWTYPE;
BEGIN
  IF v_user IS NULL OR v_user IS DISTINCT FROM p_owner_id OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_user AND role='trainee') THEN
    RAISE EXCEPTION 'Only the owning trainee can submit this form check' USING ERRCODE='42501';END IF;
  IF p_operation_id IS NULL OR p_key IS NULL THEN RAISE EXCEPTION 'Stable submission identity and verified video are required' USING ERRCODE='22023';END IF;
  v_request:=jsonb_build_object('key',p_key,'exercise',p_exercise_id);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('media-submission:'||p_operation_id::text,0));
  SELECT * INTO v_saved FROM public.media_submission_operations WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF v_saved.owner_id IS DISTINCT FROM v_user OR v_saved.kind<>'form-video' OR v_saved.request IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Media submission operation was used for different content or ownership' USING ERRCODE='23505';END IF;
    IF NOT EXISTS(SELECT 1 FROM public.form_checks WHERE id=p_operation_id AND client_id=v_user AND video_key=p_key) THEN
      RAISE EXCEPTION 'Original form check is unavailable; it will not be recreated' USING ERRCODE='42501';END IF;
    RETURN p_operation_id;
  END IF;
  PERFORM 1 FROM public.profiles WHERE id=v_user FOR SHARE;
  PERFORM public.require_media_owner(p_key,v_user,'form-video');
  IF NOT public.can_view_media(p_key) THEN RAISE EXCEPTION 'Verify this video upload before submitting' USING ERRCODE='42501';END IF;
  INSERT INTO public.form_checks(id,client_id,exercise_id,video_key) VALUES(p_operation_id,v_user,p_exercise_id,p_key);
  INSERT INTO public.media_submission_operations VALUES(p_operation_id,v_user,'form-video',v_request);
  RETURN p_operation_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_form_check(uuid,uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_form_check(uuid,uuid,text,uuid) TO authenticated;

CREATE FUNCTION public.check_checkin_media_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_entry record;v_key text;
BEGIN
  IF TG_OP='UPDATE' AND auth.uid() IS NOT NULL AND NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    RAISE EXCEPTION 'The check-in owner cannot be changed' USING ERRCODE='42501';END IF;
  IF TG_OP='UPDATE' AND NEW.client_id IS NOT DISTINCT FROM OLD.client_id AND NEW.responses IS NOT DISTINCT FROM OLD.responses THEN RETURN NEW;END IF;
  IF TG_OP='INSERT' AND EXISTS(SELECT 1 FROM public.check_ins WHERE id=NEW.id AND client_id=NEW.client_id AND responses IS NOT DISTINCT FROM NEW.responses) THEN RETURN NEW;END IF;
  IF jsonb_typeof(NEW.responses) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Check-in responses must be an object' USING ERRCODE='22023';END IF;
  FOR v_entry IN SELECT key,value FROM jsonb_each(NEW.responses) LOOP
    IF jsonb_typeof(v_entry.value)='object' AND v_entry.value?'key' THEN
      IF TG_OP='UPDATE' AND NEW.client_id IS NOT DISTINCT FROM OLD.client_id AND OLD.responses->v_entry.key IS NOT DISTINCT FROM v_entry.value THEN CONTINUE;END IF;
      IF jsonb_typeof(v_entry.value->'key') NOT IN('string','null') THEN RAISE EXCEPTION 'Invalid photo attachment identity' USING ERRCODE='22023';END IF;
      v_key:=v_entry.value->>'key';
      IF v_key IS NOT NULL AND auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM NEW.client_id THEN
        RAISE EXCEPTION 'Only the owning trainee can attach check-in media' USING ERRCODE='42501';END IF;
      PERFORM public.require_media_owner(v_key,NEW.client_id,'file');
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.check_checkin_media_owner() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER check_checkin_media_owner BEFORE INSERT OR UPDATE OF client_id,responses ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.check_checkin_media_owner();
CREATE OR REPLACE FUNCTION public.can_access_media_identity(p_key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.media_objects m WHERE m.object_key=p_key AND auth.uid() IS NOT NULL AND (
    m.owner_id=auth.uid()
    OR (m.kind='form-video' AND public.is_current_coach_of(m.owner_id) AND (
      EXISTS(SELECT 1 FROM public.set_logs s JOIN public.workout_sessions w ON w.id=s.session_id WHERE s.form_video_s3_key=m.object_key AND w.user_id=m.owner_id)
      OR EXISTS(SELECT 1 FROM public.form_checks f WHERE f.video_key=m.object_key AND f.client_id=m.owner_id)))
    OR (m.kind='file' AND public.is_current_coach_of(m.owner_id) AND EXISTS(
      SELECT 1 FROM public.check_ins c CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(c.responses)='object' THEN c.responses ELSE '{}'::jsonb END) answer
      WHERE c.client_id=m.owner_id AND c.coach_id=auth.uid() AND jsonb_typeof(answer.value)='object' AND answer.value->>'key'=m.object_key))
  ));
$$;
REVOKE ALL ON FUNCTION public.can_access_media_identity(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_access_media_identity(text) TO authenticated;

CREATE FUNCTION public.set_verified_avatar(p_operation_id uuid,p_owner_id uuid,p_key text,p_expected_key text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid();v_request jsonb;v_saved public.media_submission_operations%ROWTYPE;v_current text;
BEGIN
  IF v_user IS NULL OR v_user IS DISTINCT FROM p_owner_id THEN RAISE EXCEPTION 'Avatar belongs to another account' USING ERRCODE='42501';END IF;
  IF p_operation_id IS NULL OR p_key IS NULL THEN RAISE EXCEPTION 'Stable avatar operation and verified image are required' USING ERRCODE='22023';END IF;
  v_request:=jsonb_build_object('key',p_key,'expected_key',p_expected_key);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('media-submission:'||p_operation_id::text,0));
  SELECT * INTO v_saved FROM public.media_submission_operations WHERE operation_id=p_operation_id;
  IF FOUND THEN
    IF v_saved.owner_id IS DISTINCT FROM v_user OR v_saved.kind<>'coach-image' OR v_saved.request IS DISTINCT FROM v_request THEN
      RAISE EXCEPTION 'Media submission operation was used for different content or ownership' USING ERRCODE='23505';END IF;
    IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=v_user) THEN RAISE EXCEPTION 'Profile is unavailable' USING ERRCODE='42501';END IF;
    RETURN v_user;
  END IF;
  SELECT avatar_key INTO v_current FROM public.profiles WHERE id=v_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile is unavailable' USING ERRCODE='42501';END IF;
  IF v_current IS DISTINCT FROM p_expected_key AND v_current IS DISTINCT FROM p_key THEN
    RAISE EXCEPTION 'Avatar changed. Reload the profile before choosing a new upload.' USING ERRCODE='40001';END IF;
  PERFORM public.require_media_owner(p_key,v_user,'coach-image');
  IF NOT public.can_view_media(p_key) THEN RAISE EXCEPTION 'Verify this avatar upload first' USING ERRCODE='42501';END IF;
  IF v_current IS DISTINCT FROM p_key THEN UPDATE public.profiles SET avatar_key=p_key WHERE id=v_user;END IF;
  INSERT INTO public.media_submission_operations VALUES(p_operation_id,v_user,'coach-image',v_request);
  RETURN v_user;
END;
$$;
REVOKE ALL ON FUNCTION public.set_verified_avatar(uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_verified_avatar(uuid,uuid,text,text) TO authenticated;

CREATE FUNCTION public.guard_form_submission_identity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND (NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.video_key IS DISTINCT FROM OLD.video_key
    OR (NEW.exercise_id IS DISTINCT FROM OLD.exercise_id AND NOT(NEW.exercise_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.exercises WHERE id=OLD.exercise_id)))
    OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at) THEN
    RAISE EXCEPTION 'Submitted form identity and video are immutable; review fields are separate' USING ERRCODE='42501';END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_form_submission_identity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_form_submission_identity BEFORE UPDATE ON public.form_checks FOR EACH ROW EXECUTE FUNCTION public.guard_form_submission_identity();
