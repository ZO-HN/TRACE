-- ==========================================
-- TRACE PATCH: 20260810000000_feedback_and_notifications.sql
-- notifications: real backing for the header bell. Nothing populates
-- it automatically yet (no triggers wired) — coaches can still see and
-- manage rows inserted directly, and future features can insert here.
--
-- (This migration originally also added a `feedback` table for an
-- in-app feedback form; that form was replaced with a link to the
-- GitHub repo instead, so there's no feedback table here.)
-- ==========================================

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    body TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_coach ON public.notifications(coach_id, read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own notifications"
    ON public.notifications FOR ALL
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
