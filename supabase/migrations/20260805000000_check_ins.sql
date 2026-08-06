-- ==========================================
-- TRACE PATCH: 20260805000000_check_ins.sql
-- Coach dashboard "Check-ins" feature: trainees submit structured
-- check-ins (from the client app) against a coach-authored template;
-- the coach reviews them here.
--
-- Write direction, same contract as the rest of this repo's schema:
--   - client app INSERTs check_ins (trainee submitting) and reads its
--     own check_ins + its coach's templates
--   - this dashboard reads + reviews (UPDATE reviewed_at/coach_notes/status)
--     check_ins for its own clients, and owns check_in_templates (coach
--     authors the questions the trainee answers)
-- ==========================================

CREATE TYPE public.check_in_status AS ENUM ('scheduled', 'submitted', 'reviewed');

CREATE TABLE public.check_in_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    -- Array of {id, label, type} question definitions the client app renders as a form.
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    -- Denormalized from client_id's profiles.coach_id at insert time (see trigger below) —
    -- keeps the coach-scoped RLS policies a single equality check instead of a join.
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.check_in_templates(id) ON DELETE SET NULL,
    status public.check_in_status NOT NULL DEFAULT 'scheduled',
    scheduled_for DATE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    -- Answers keyed by the template's question ids.
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    coach_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_check_ins_coach_status ON public.check_ins(coach_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_check_ins_client ON public.check_ins(client_id);
CREATE INDEX IF NOT EXISTS idx_check_in_templates_coach ON public.check_in_templates(coach_id);

-- ==========================================
-- TRIGGER: stamp coach_id from the client's own profile so a trainee can
-- never submit a check-in "to" a coach that isn't actually theirs.
-- ==========================================
CREATE OR REPLACE FUNCTION public.set_check_in_coach_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT coach_id INTO NEW.coach_id FROM public.profiles WHERE id = NEW.client_id;
  IF NEW.coach_id IS NULL THEN
    RAISE EXCEPTION 'check_ins.client_id must belong to a trainee with an assigned coach';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_check_in_coach_id ON public.check_ins;
CREATE TRIGGER trg_set_check_in_coach_id
  BEFORE INSERT ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.set_check_in_coach_id();

-- ==========================================
-- ROW-LEVEL SECURITY
-- ==========================================
ALTER TABLE public.check_in_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage their own check-in templates"
    ON public.check_in_templates FOR ALL
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Trainees can read their coach's check-in templates"
    ON public.check_in_templates FOR SELECT
    USING (coach_id = (SELECT coach_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Coaches can read their clients' check-ins"
    ON public.check_ins FOR SELECT
    USING (coach_id = auth.uid());

CREATE POLICY "Coaches can review their clients' check-ins"
    ON public.check_ins FOR UPDATE
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Trainees can submit their own check-ins"
    ON public.check_ins FOR INSERT
    WITH CHECK (client_id = auth.uid());

CREATE POLICY "Trainees can read their own check-ins"
    ON public.check_ins FOR SELECT
    USING (client_id = auth.uid());

-- ==========================================
-- REALTIME: live "needs review" updates on the coach dashboard, same
-- RLS-aware pattern as 20260803000001_roster_realtime_publication.sql.
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.check_ins;
