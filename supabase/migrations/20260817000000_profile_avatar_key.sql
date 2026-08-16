-- ==========================================
-- TRACE PATCH: 20260817000000_profile_avatar_key.sql
-- Profile Avatar upload in Settings was a local-preview-only URL.createObjectURL
-- with nothing persisted anywhere. Adds the R2 object key column so an
-- uploaded avatar (via the existing r2-presign 'coach-image' kind) can be
-- saved on the profile and resolved back to a signed URL for display.
-- ==========================================

ALTER TABLE public.profiles
    ADD COLUMN avatar_key TEXT;
