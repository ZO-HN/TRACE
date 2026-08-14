-- ==========================================
-- TRACE PATCH: 20260815010000_client_tags.sql
-- "Manage tags" dialog on the Clients page had a Create button with no
-- onClick and a hardcoded "No tags yet" message -- no backend existed at
-- all. Adds a real coach-owned tag table + a client assignment join
-- table (assignment UI is a follow-up, not built in this pass -- this
-- migration only makes tag create/list/delete real).
-- ==========================================

CREATE TABLE public.client_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (coach_id, name)
);

ALTER TABLE public.client_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage their own client tags"
    ON public.client_tags FOR ALL
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

-- Many-to-many client<->tag assignment. Not yet surfaced in any UI (no
-- per-client "add tag" control exists) -- table exists so assignment can
-- be added later without another migration.
CREATE TABLE public.client_tag_assignments (
    tag_id UUID NOT NULL REFERENCES public.client_tags(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (tag_id, client_id)
);

ALTER TABLE public.client_tag_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage assignments for their own tags"
    ON public.client_tag_assignments FOR ALL
    USING (EXISTS (SELECT 1 FROM public.client_tags WHERE id = tag_id AND coach_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.client_tags WHERE id = tag_id AND coach_id = auth.uid()));
