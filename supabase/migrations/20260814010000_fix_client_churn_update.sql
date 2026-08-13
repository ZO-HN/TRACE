-- ==========================================
-- TRACE PATCH: 20260814010000_fix_client_churn_update.sql
-- Bug fix found during a CRUD QA sweep: useClients.ts's setChurned() does
-- `UPDATE profiles SET manually_marked_churned = ... WHERE id = clientId`
-- as the coach, but profiles only has an RLS policy for a user to write
-- their OWN row ("Users can always read and write their own data",
-- USING (auth.uid() = id)) -- there is no policy letting a coach update a
-- client's row. Under RLS this UPDATE matches zero rows and returns
-- error: null, so the hook silently no-ops: the Status column toggle in
-- ClientsPage.tsx appears to do nothing.
--
-- Fix: a narrow SECURITY DEFINER RPC, same pattern as claim_coach_by_id
-- etc., instead of loosening profiles' UPDATE policy broadly (which would
-- let a coach write ANY column on a client's profile, not just this one).
-- ==========================================

CREATE OR REPLACE FUNCTION public.set_client_churned(p_client_id UUID, p_churned BOOLEAN)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET manually_marked_churned = p_churned
  WHERE id = p_client_id AND coach_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not your client, or client not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_client_churned(UUID, BOOLEAN) TO authenticated;
