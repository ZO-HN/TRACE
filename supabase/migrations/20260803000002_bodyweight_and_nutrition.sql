-- ==========================================
-- TRACE PATCH: 20260803000002_bodyweight_and_nutrition.sql
-- Phase 3: bodyweight and nutrition logging for the client app.
-- Same owner-manages-own / coach-reads-connected-clients shape as
-- wearable_biometrics, added to the realtime publication from day one
-- (see 20260803000001) so Phase 2's coach roster wiring can pick these up
-- later without another schema round-trip.
-- ==========================================

CREATE TABLE public.bodyweight_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recorded_date DATE NOT NULL,
    weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 700),
    note VARCHAR(280),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, recorded_date)
);

ALTER TABLE public.bodyweight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own bodyweight logs"
    ON public.bodyweight_logs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view connected clients bodyweight logs"
    ON public.bodyweight_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles client
            WHERE client.id = bodyweight_logs.user_id
            AND client.coach_id = auth.uid()
        )
    );

CREATE INDEX idx_bodyweight_logs_user_date ON public.bodyweight_logs(user_id, recorded_date DESC);


-- ==========================================
-- Nutrition: typed quick-entry now (see docs/trace_features.md's
-- "Macro Quick-Logger"); barcode/photo capture methods are recorded in the
-- schema so the UI has somewhere to write to, but resolving a barcode to
-- macros or a photo to an estimate is not wired up yet — same "documented
-- placeholder until a real backend is chosen" status as trace-brain's RAG
-- pipeline. photo_s3_key follows the same R2 pattern as set_logs'
-- form_video_s3_key once photo capture is actually built.
-- ==========================================
CREATE TYPE public.nutrition_entry_method AS ENUM ('TYPED', 'BARCODE', 'PHOTO');

CREATE TABLE public.nutrition_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    method public.nutrition_entry_method NOT NULL DEFAULT 'TYPED',
    description VARCHAR(280),
    protein_g NUMERIC(6,1) CHECK (protein_g >= 0),
    carbs_g NUMERIC(6,1) CHECK (carbs_g >= 0),
    fat_g NUMERIC(6,1) CHECK (fat_g >= 0),
    calories INT CHECK (calories >= 0),
    photo_s3_key VARCHAR(500),
    CHECK (
        protein_g IS NOT NULL OR carbs_g IS NOT NULL
        OR fat_g IS NOT NULL OR calories IS NOT NULL
    )
);

ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own nutrition logs"
    ON public.nutrition_logs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can view connected clients nutrition logs"
    ON public.nutrition_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles client
            WHERE client.id = nutrition_logs.user_id
            AND client.coach_id = auth.uid()
        )
    );

CREATE INDEX idx_nutrition_logs_user_time ON public.nutrition_logs(user_id, logged_at DESC);


ALTER PUBLICATION supabase_realtime ADD TABLE public.bodyweight_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nutrition_logs;
