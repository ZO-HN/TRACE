-- ==========================================
-- TRACE: 20260719000002_ai_biometrics_rls.sql
-- SECURITY FIX — these tables shipped with NO row-level security, so any
-- authenticated user could read/write everyone's AI chats and biometrics.
-- Additive only (enables RLS + adds policies; no data or column changes).
-- ==========================================

-- ---- AI chat sessions: owned by the user ----
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own AI chat sessions"
    ON public.ai_chat_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ---- AI messages: readable within an owned session; clients may only
--      INSERT their own USER turns. ASSISTANT turns are written server-side
--      (service role) by the trace-brain edge function. ----
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read messages in their own sessions"
    ON public.ai_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.ai_chat_sessions s
            WHERE s.id = ai_messages.session_id AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users send USER messages in their own sessions"
    ON public.ai_messages FOR INSERT
    WITH CHECK (
        sender = 'USER'
        AND EXISTS (
            SELECT 1 FROM public.ai_chat_sessions s
            WHERE s.id = ai_messages.session_id AND s.user_id = auth.uid()
        )
    );

-- ---- AI citations: readable when the parent message is readable ----
ALTER TABLE public.ai_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read citations for their own messages"
    ON public.ai_citations FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.ai_messages m
            JOIN public.ai_chat_sessions s ON s.id = m.session_id
            WHERE m.id = ai_citations.message_id AND s.user_id = auth.uid()
        )
    );

-- ---- Wearable biometrics: owner read/write, coach read (mirrors set_logs) ----
ALTER TABLE public.wearable_biometrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own biometrics"
    ON public.wearable_biometrics FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches read connected clients biometrics"
    ON public.wearable_biometrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles client
            WHERE client.id = wearable_biometrics.user_id
              AND client.coach_id = auth.uid()
        )
    );
