-- ==========================================
-- TRACE PATCH: 20260805000002_fix_profiles_rls_recursion.sql
-- Fixes a pre-existing bug in 20260717000000_init_trace.sql, surfaced by the
-- new check-ins queries (the first code path in this repo to embed a
-- `profiles` join for someone else's row via PostgREST, e.g.
-- `.select('*, client:profiles!check_ins_client_id_fkey(...)')`).
--
-- "Coaches can read connected clients profiles" evaluates a subquery against
-- public.profiles from WITHIN a policy ON public.profiles. Postgres has to
-- re-apply profiles' own RLS to resolve that subquery, which re-enters the
-- same policy — infinite recursion ("infinite recursion detected in policy
-- for relation \"profiles\"", Postgres error 42P17). Any other table's
-- policy that subqueries profiles for the coach/role check (exercises
-- INSERT, workout_sessions coach-view, check_ins/check_in_templates SELECT)
-- inherits the same failure, since they all trigger this policy downstream.
--
-- Fix: move the self-check into a SECURITY DEFINER function. Functions
-- marked SECURITY DEFINER run as their owner and do not re-trigger RLS on
-- the tables they touch, breaking the recursive re-entry.
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_coach(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = uid AND role = 'coach'
  );
$$;

DROP POLICY IF EXISTS "Coaches can read connected clients profiles" ON public.profiles;
CREATE POLICY "Coaches can read connected clients profiles"
    ON public.profiles FOR SELECT
    USING (public.is_coach(auth.uid()) AND coach_id = auth.uid());
