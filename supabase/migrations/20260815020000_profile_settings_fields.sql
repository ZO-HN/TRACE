-- ==========================================
-- TRACE PATCH: 20260815020000_profile_settings_fields.sql
-- Settings -> Profile tab had a fully fake form: every field was local
-- useState with no backing column (except first/last name), and every
-- "Save" button just fired a toast with no write. Adds the missing
-- columns so the page can actually persist what it collects. Avatar
-- upload is out of scope here (needs R2 presign wiring, not a schema gap)
-- and stays a local-only preview until that's built.
-- ==========================================

ALTER TABLE public.profiles
    ADD COLUMN bio TEXT,
    ADD COLUMN height_cm SMALLINT,
    ADD COLUMN biological_sex TEXT,
    ADD COLUMN phone TEXT,
    ADD COLUMN username TEXT UNIQUE;
