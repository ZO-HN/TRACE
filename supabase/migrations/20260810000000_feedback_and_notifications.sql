-- ==========================================
-- TRACE PATCH: 20260810000000_feedback_and_notifications.sql
-- Two small, unrelated coach-facing features sharing one migration:
--
--   - feedback: submissions from the header "Feedback" page (text + an
--     optional pasted/uploaded screenshot, stored as a base64 data URL —
--     small internal-tool volume, so no R2/presigned-upload infra needed).
--     Actually emailing these to the app creator is a separate follow-up
--     (needs an Edge Function + email provider secret); this table is
--     where the dashboard writes them in the meantime.
--   - notifications: real backing for the header bell. Nothing populates
--     it automatically yet (no triggers wired) — coaches can still see and
--     manage rows inserted directly, and future features can insert here.
-- ==========================================

CREATE TABLE public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    image_data TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    body TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_coach ON public.feedback(coach_id);
CREATE INDEX IF NOT EXISTS idx_notifications_coach ON public.notifications(coach_id, read);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own feedback"
    ON public.feedback FOR ALL
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches manage own notifications"
    ON public.notifications FOR ALL
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
