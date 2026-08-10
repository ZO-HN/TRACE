-- ==========================================
-- TRACE PATCH: 20260810000001_coach_workspace_features.sql
-- Backs the remaining coach-dashboard pages that were UI-shell mocks:
-- Programs, Roadmaps, Vault, Training Groups, Equipment, Foods, Meals,
-- Meal Plans, and Form Checks. All coach-owned tables follow the same
-- shape as check_in_templates/feedback/notifications: coach_id scoped,
-- full CRUD on own rows. form_checks follows the check_ins pattern
-- instead (trainee-submitted, coach reviews) since it's client-authored.
-- ==========================================

-- ---------- Programs ----------
CREATE TABLE public.programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------- Roadmaps (per-client, coach-authored) ----------
CREATE TABLE public.roadmaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active')),
    start_date DATE,
    target_end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------- Vault (education-resource folders) ----------
CREATE TABLE public.vault_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    visibility VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'specific')),
    client_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------- Training Groups ----------
CREATE TABLE public.training_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.training_group_members (
    group_id UUID NOT NULL REFERENCES public.training_groups(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (group_id, client_id)
);

-- ---------- Equipment ----------
CREATE TABLE public.equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------- Foods (optionally a recipe) ----------
CREATE TABLE public.foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    serving_size VARCHAR(50),
    calories NUMERIC,
    protein_g NUMERIC,
    carbs_g NUMERIC,
    fat_g NUMERIC,
    recipe TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------- Meals (assigned to a client, built from foods) ----------
CREATE TABLE public.meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    category VARCHAR(20),
    label VARCHAR(150),
    consumed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    food_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------- Meal Plans (builder state kept as JSON — shape can evolve) ----------
CREATE TABLE public.meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL DEFAULT 'Untitled plan',
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------- Form Checks (trainee-submitted video, coach reviews) ----------
-- Same write-direction contract as check_ins: client app INSERTs as the
-- trainee; coach_id is stamped server-side, never trusted from the client.
CREATE TABLE public.form_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES public.exercises(id) ON DELETE SET NULL,
    video_key TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'unreviewed' CHECK (status IN ('unreviewed', 'reviewed')),
    coach_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);

CREATE OR REPLACE FUNCTION public.set_form_check_coach_id()
RETURNS TRIGGER AS $$
BEGIN
    SELECT coach_id INTO NEW.coach_id FROM public.profiles WHERE id = NEW.client_id;
    IF NEW.coach_id IS NULL THEN
        RAISE EXCEPTION 'form_checks.client_id % has no coach assigned', NEW.client_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_form_check_coach_id
    BEFORE INSERT ON public.form_checks
    FOR EACH ROW EXECUTE FUNCTION public.set_form_check_coach_id();

-- ---------- Indexes ----------
CREATE INDEX IF NOT EXISTS idx_programs_coach ON public.programs(coach_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_coach ON public.roadmaps(coach_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_client ON public.roadmaps(client_id);
CREATE INDEX IF NOT EXISTS idx_vault_folders_coach ON public.vault_folders(coach_id);
CREATE INDEX IF NOT EXISTS idx_training_groups_coach ON public.training_groups(coach_id);
CREATE INDEX IF NOT EXISTS idx_equipment_coach ON public.equipment(coach_id);
CREATE INDEX IF NOT EXISTS idx_foods_coach ON public.foods(coach_id);
CREATE INDEX IF NOT EXISTS idx_meals_coach ON public.meals(coach_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_coach ON public.meal_plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_form_checks_coach ON public.form_checks(coach_id, status);
CREATE INDEX IF NOT EXISTS idx_form_checks_client ON public.form_checks(client_id);

-- ---------- RLS ----------
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own programs" ON public.programs FOR ALL
    USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches manage own roadmaps" ON public.roadmaps FOR ALL
    USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches manage own vault folders" ON public.vault_folders FOR ALL
    USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches manage own training groups" ON public.training_groups FOR ALL
    USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches manage own group members" ON public.training_group_members FOR ALL
    USING (EXISTS (SELECT 1 FROM public.training_groups g WHERE g.id = group_id AND g.coach_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.training_groups g WHERE g.id = group_id AND g.coach_id = auth.uid()));

CREATE POLICY "Coaches manage own equipment" ON public.equipment FOR ALL
    USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches manage own foods" ON public.foods FOR ALL
    USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches manage own meals" ON public.meals FOR ALL
    USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Coaches manage own meal plans" ON public.meal_plans FOR ALL
    USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

CREATE POLICY "Trainees can submit their own form checks"
    ON public.form_checks FOR INSERT
    WITH CHECK (client_id = auth.uid());

CREATE POLICY "Trainees can read their own form checks"
    ON public.form_checks FOR SELECT
    USING (client_id = auth.uid());

CREATE POLICY "Coaches can read their clients' form checks"
    ON public.form_checks FOR SELECT
    USING (coach_id = auth.uid());

CREATE POLICY "Coaches can review their clients' form checks"
    ON public.form_checks FOR UPDATE
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

-- ---------- Realtime ----------
ALTER PUBLICATION supabase_realtime ADD TABLE public.form_checks;
