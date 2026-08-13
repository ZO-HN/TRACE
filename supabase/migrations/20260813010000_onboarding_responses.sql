-- ==========================================
-- TRACE PATCH: 20260813010000_onboarding_responses.sql
-- Wires the /onboarding wizard (docs/migrations/TODO-onboarding-account-linking.md)
-- into a real write path. Decisions confirmed with the user first:
--   - Sign-in happens at the START of the wizard (before any questions).
--   - Answers land in a new onboarding_responses table, not on profiles
--     directly (keeps the raw answers separate/versioned, profiles stays
--     narrow).
--
-- Coach-claiming itself is NOT duplicated here: the wizard calls the
-- existing public.claim_coach_by_id() RPC from
-- 20260813000001_coach_referral_and_signup_gate.sql (same mechanism
-- TRACE-client's "choose your coach" screen uses) rather than a second,
-- parallel claim function. This migration only adds the response table.
-- ==========================================

CREATE TABLE public.onboarding_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_onboarding_responses_coach ON public.onboarding_responses(coach_id);
CREATE INDEX idx_onboarding_responses_trainee ON public.onboarding_responses(trainee_id);

ALTER TABLE public.onboarding_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainees can read their own onboarding responses"
    ON public.onboarding_responses FOR SELECT
    USING (auth.uid() = trainee_id);

CREATE POLICY "Trainees can submit their own onboarding responses"
    ON public.onboarding_responses FOR INSERT
    WITH CHECK (auth.uid() = trainee_id);

CREATE POLICY "Coaches can read their invited trainees' onboarding responses"
    ON public.onboarding_responses FOR SELECT
    USING (public.is_coach(auth.uid()) AND coach_id = auth.uid());
