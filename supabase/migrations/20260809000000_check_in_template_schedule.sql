-- ==========================================
-- TRACE PATCH: 20260809000000_check_in_template_schedule.sql
-- Extends check_in_templates with the fields the "Create Recurring
-- Check-in" builder collects (description + recurrence schedule).
-- Kept as a single JSONB column so the shape can evolve without another
-- migration; the dashboard reads/writes it as a typed object.
-- ==========================================

ALTER TABLE public.check_in_templates
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS schedule JSONB NOT NULL DEFAULT '{}'::jsonb;
