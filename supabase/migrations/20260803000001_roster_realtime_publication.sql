-- ==========================================
-- TRACE PATCH: 20260803000001_roster_realtime_publication.sql
-- Phase 2: give the coach dashboard's roster live updates.
--
-- Realtime's postgres_changes is RLS-aware: adding a table to this
-- publication does NOT bypass access control. A coach subscribing still
-- only receives change events for rows their existing SELECT policies
-- already let them read (their own connected trainees) — the same
-- "Coaches can view connected clients ..." policies from the init/patch
-- migrations, unchanged.
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.set_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wearable_biometrics;
