-- ==========================================
-- TRACE PATCH: 20260805000001_exercise_details.sql
-- Exercise library detail fields + a proper primary/secondary muscle
-- taxonomy, for the coach-facing "New Exercise" creation flow.
--
-- target_muscle_group (VARCHAR) stays on public.exercises for backward
-- compatibility with get_personal_records / get_muscle_volume (see
-- 20260803000003_solo_analytics_rpcs.sql) — new inserts populate it from
-- the exercise's first primary muscle, but the real source of truth for
-- muscle involvement going forward is exercise_muscles below.
-- ==========================================

CREATE TYPE public.exercise_type AS ENUM ('regular', 'isometric_yielding', 'isometric_overcoming');
CREATE TYPE public.muscle_role AS ENUM ('primary', 'secondary');

ALTER TABLE public.exercises ALTER COLUMN target_muscle_group DROP NOT NULL;

ALTER TABLE public.exercises
    ADD COLUMN IF NOT EXISTS category VARCHAR(50)
        CHECK (category IN ('Chest', 'Arms', 'Back', 'Legs', 'Shoulders', 'Core')),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS exercise_type public.exercise_type NOT NULL DEFAULT 'regular',
    ADD COLUMN IF NOT EXISTS movement_profile VARCHAR(50)
        CHECK (movement_profile IN (
            'Descending', 'Eccentric Overload', 'Flat', 'Lengthened', 'Matches Strength Curve',
            'Mid-Lengthened', 'Mid-Short', 'Middle', 'Short', 'Variable By Cable Angle',
            'Variable By Setup', 'Variable By Resistance', 'Variable By Torque'
        )),
    ADD COLUMN IF NOT EXISTS exercise_position VARCHAR(30)
        CHECK (exercise_position IN (
            'Shortened', 'Mid-Shortened', 'Mid-Range', 'Mid-Lengthened', 'Lengthened', 'Full-Range'
        )),
    ADD COLUMN IF NOT EXISTS is_bodyweight BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_unilateral BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS coaching_cues TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS equipment_tags TEXT[] NOT NULL DEFAULT '{}';

-- ==========================================
-- Muscle taxonomy: each entry is a standalone, selectable muscle group as
-- shown in the "New Exercise" picker (parenthetical text, where present,
-- is part of the display name — not a separate hierarchy level; several
-- parent groups like "Adductors (Hip)" are themselves selectable too).
-- ==========================================
CREATE TABLE public.muscle_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE public.exercise_muscles (
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    muscle_group_id UUID NOT NULL REFERENCES public.muscle_groups(id) ON DELETE CASCADE,
    role public.muscle_role NOT NULL,
    PRIMARY KEY (exercise_id, muscle_group_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_muscles_exercise ON public.exercise_muscles(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_muscles_muscle ON public.exercise_muscles(muscle_group_id);

INSERT INTO public.muscle_groups (name) VALUES
    ('Abdominals'), ('Abductors (Hip)'), ('Adductor Longus (Adductors (Hip))'),
    ('Adductor Magnus (Adductors (Hip))'), ('Adductors (Hip)'), ('Anterior Delts (Delts)'),
    ('Biceps'), ('Biceps Brachii Long Head (Biceps)'), ('Biceps Brachii Short Head (Biceps)'),
    ('Biceps Femoris Long Head (Hamstrings)'), ('Biceps Femoris Short Head (Hamstrings)'),
    ('Brachialis (Elbow Flexors)'), ('Brachioradialis (Elbow Flexors)'), ('Calves'),
    ('Calves (Gastrocnemius) (Lower Leg)'), ('Calves (Soleus) (Lower Leg)'), ('Chest'),
    ('Clavicular Pec (Chest)'), ('Coracobrachialis'), ('Costal Pec (Chest)'), ('Delts'),
    ('Elbow Flexors'), ('Erector Spinae (Trunk & Core)'), ('External Oblique (Trunk & Core)'),
    ('External Rotators'), ('Forearms'), ('Forearms (extensors)'), ('Forearms (flexors)'),
    ('Glutes'), ('Gluteus Maximus (Glutes)'), ('Gluteus Medius (Glutes)'),
    ('Gluteus Minimus (Glutes)'), ('Gracilis (Adductors (Hip))'), ('Hamstrings'), ('Iliacus'),
    ('Infraspinatous (Upper Back)'), ('Internal Oblique (Trunk & Core)'), ('Lat Iliac (Lats)'),
    ('Lat Lumbar (Lats)'), ('Lat Thoracic (Lats)'), ('Lats'), ('Lower Leg'),
    ('Medial Delts (Delts)'), ('Pec Minor (Chest (Pectoral))'), ('Posterior Delts (Delts)'),
    ('Psoas'), ('Quadriceps'), ('Rectus Abdominus (Abs)'), ('Rectus Femoris (Quadriceps)'),
    ('Rhomboid (Upper Back)'), ('Sartorius (Quadriceps)'), ('Semimembrinosus (Hamstrings)'),
    ('Semitendinosus (Hamstrings)'), ('Serratus Anterior (Trunk & Core)'),
    ('Sternal Pec (Chest (Pectoral))'), ('Subscapularis (Upper Back)'),
    ('Supraspinatous (Upper Back)'), ('TFL Tensor Fascia Latae (Abductors (Hip))'),
    ('Teres Major (Upper Back)'), ('Teres Minor (Upper Back)'), ('Tibialis Anterior (Lower Leg)'),
    ('Total Body'), ('Transverse Abdominus (Abs)'), ('Trap 1 Upper Trapezius (Upper Back)'),
    ('Trap 2 Mid Trapezius (Upper Back)'), ('Trap 3 Lower Trapezius (Upper Back)'), ('Triceps'),
    ('Triceps Brachii Lateral Head (Triceps)'), ('Triceps Brachii Long Head (Triceps)'),
    ('Triceps Brachii Medial Head (Triceps)'), ('Upper Back'),
    ('VMO Vastus Medialis Oblique (Quadriceps)'), ('Vastus Intermedius (Quadriceps)'),
    ('Vastus Lateralis (Quadriceps)')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- ROW-LEVEL SECURITY
-- ==========================================
ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_muscles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read the muscle taxonomy"
    ON public.muscle_groups FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can read exercise-muscle links"
    ON public.exercise_muscles FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Coaches manage muscle links for exercises they created"
    ON public.exercise_muscles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.exercises
            WHERE id = exercise_muscles.exercise_id AND created_by_coach_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.exercises
            WHERE id = exercise_muscles.exercise_id AND created_by_coach_id = auth.uid()
        )
    );
