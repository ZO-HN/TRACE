-- ==========================================
-- TRACE: 20260719000000_direct_messages.sql
-- 1-on-1 coach <-> trainee chat (the AI chat tables cover only the
-- assistant; no human-to-human message table existed).
-- NOTE: additive only — no existing tables are modified.
-- ==========================================

CREATE TABLE public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_dm_conversation
    ON public.direct_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_recipient
    ON public.direct_messages (recipient_id, created_at DESC);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Sender must be the authenticated user AND the pair must be an active
-- coach<->trainee link (profiles.coach_id in either direction).
CREATE POLICY "Participants can send messages within their coaching link"
    ON public.direct_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE (p.id = recipient_id AND p.coach_id = sender_id)
               OR (p.id = sender_id AND p.coach_id = recipient_id)
        )
    );

CREATE POLICY "Participants can read their own conversations"
    ON public.direct_messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Only the recipient may mark a message read (read_at).
CREATE POLICY "Recipients can mark messages read"
    ON public.direct_messages FOR UPDATE
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- Stream INSERTs to clients via Supabase Realtime.
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
