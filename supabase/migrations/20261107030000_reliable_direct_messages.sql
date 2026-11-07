CREATE INDEX direct_messages_page_idx ON public.direct_messages(sender_id,recipient_id,(coalesce(created_at,'-infinity'::timestamptz)) DESC,id DESC);

CREATE FUNCTION public.get_direct_messages_page(p_owner_id uuid,p_peer_id uuid,p_before timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL,p_limit integer DEFAULT 50)
RETURNS TABLE(id uuid,sender_id uuid,recipient_id uuid,content text,created_at timestamptz,read_at timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_owner_id THEN RAISE EXCEPTION 'Conversation owner required' USING ERRCODE='42501'; END IF;
  IF p_before IS NOT NULL AND p_before_id IS NULL THEN RAISE EXCEPTION 'Both cursor values required'; END IF;
  RETURN QUERY SELECT m.* FROM public.direct_messages m
    WHERE ((m.sender_id=p_owner_id AND m.recipient_id=p_peer_id) OR (m.sender_id=p_peer_id AND m.recipient_id=p_owner_id))
      AND (p_before_id IS NULL OR (coalesce(m.created_at,'-infinity'::timestamptz),m.id)<(coalesce(p_before,'-infinity'::timestamptz),p_before_id))
    ORDER BY coalesce(m.created_at,'-infinity'::timestamptz) DESC,m.id DESC LIMIT least(greatest(coalesce(p_limit,50),1),100);
END $$;

CREATE FUNCTION public.send_direct_message(p_message_id uuid,p_sender_id uuid,p_recipient_id uuid,p_content text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user uuid:=auth.uid(); v_message public.direct_messages%ROWTYPE; v_content text:=btrim(p_content);
BEGIN
  IF v_user IS NULL OR v_user IS DISTINCT FROM p_sender_id THEN RAISE EXCEPTION 'Authenticated sender required' USING ERRCODE='42501'; END IF;
  IF p_message_id IS NULL OR p_recipient_id IS NULL OR v_content IS NULL OR v_content !~ '[^[:space:]]' OR char_length(v_content) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Message must contain 1 to 4000 characters'; END IF;
  PERFORM 1 FROM public.profiles WHERE id=v_user FOR UPDATE;
  SELECT * INTO v_message FROM public.direct_messages WHERE id=p_message_id;
  IF FOUND THEN
    IF v_message.sender_id<>v_user OR v_message.recipient_id<>p_recipient_id OR v_message.content<>v_content THEN RAISE EXCEPTION 'Message identity already used with different content or ownership'; END IF;
    RETURN to_jsonb(v_message);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles trainee JOIN public.profiles coach ON coach.id=trainee.coach_id AND coach.role='coach'
    WHERE trainee.role='trainee' AND ((trainee.id=v_user AND coach.id=p_recipient_id) OR (trainee.id=p_recipient_id AND coach.id=v_user))
  ) THEN RAISE EXCEPTION 'No active coaching relationship for this message' USING ERRCODE='42501'; END IF;
  INSERT INTO public.direct_messages(id,sender_id,recipient_id,content) VALUES(p_message_id,v_user,p_recipient_id,v_content) RETURNING * INTO v_message;
  RETURN to_jsonb(v_message);
END $$;
REVOKE ALL ON FUNCTION public.get_direct_messages_page(uuid,uuid,timestamptz,uuid,integer),public.send_direct_message(uuid,uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_direct_messages_page(uuid,uuid,timestamptz,uuid,integer),public.send_direct_message(uuid,uuid,uuid,text) TO authenticated;
