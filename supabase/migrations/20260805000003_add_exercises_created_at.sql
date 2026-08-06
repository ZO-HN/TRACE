-- ==========================================
-- TRACE PATCH: 20260805000003_add_exercises_created_at.sql
-- public.exercises was never given a created_at column (missed in both the
-- original 20260717000000_init_trace.sql and 20260805000001_exercise_details.sql),
-- but src/hooks/useExercises.ts selects and orders by it. Add it now.
-- ==========================================

ALTER TABLE public.exercises
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
