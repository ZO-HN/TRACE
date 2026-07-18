-- ==========================================
-- TRACE: 20260719000001_template_items.sql
-- DRAFT — needs owner assessment before applying.
--
-- Gap: workout_templates has name/week/day but NO structure for which
-- exercises (and set/rep targets) a template contains, so the trainee
-- logger cannot load real workout content. This adds the join table.
-- Additive only — no existing tables are modified.
-- ==========================================

CREATE TABLE public.template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id),
    position INT NOT NULL CHECK (position > 0),
    target_sets INT NOT NULL DEFAULT 3 CHECK (target_sets BETWEEN 1 AND 20),
    target_reps INT NOT NULL DEFAULT 8 CHECK (target_reps BETWEEN 1 AND 100),
    target_rpe INT CHECK (target_rpe BETWEEN 1 AND 10),
    rest_seconds INT NOT NULL DEFAULT 90 CHECK (rest_seconds BETWEEN 0 AND 600),
    UNIQUE (template_id, position)
);

CREATE INDEX IF NOT EXISTS idx_template_items_template
    ON public.template_items (template_id, position);

ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;

-- Items are visible exactly when the parent template is visible,
-- mirroring the workout_templates policies from the schema-gaps patch.
CREATE POLICY "Creators can manage their template items"
    ON public.template_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_templates t
            WHERE t.id = template_items.template_id AND t.creator_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workout_templates t
            WHERE t.id = template_items.template_id AND t.creator_id = auth.uid()
        )
    );

CREATE POLICY "Template items readable when the template is readable"
    ON public.template_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.workout_templates t
            WHERE t.id = template_items.template_id
              AND (
                  (t.scope = 'PUBLIC' AND auth.uid() IS NOT NULL)
                  OR (t.scope = 'ASSIGNED' AND t.assigned_trainee_id = auth.uid())
              )
        )
    );
