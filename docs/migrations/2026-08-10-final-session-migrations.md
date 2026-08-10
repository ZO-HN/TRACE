# Migration task: apply 3 pending migrations from this session

Three local migrations are still unapplied to the live Supabase project. This is the single doc to hand to agy — it supersedes the earlier `2026-08-09-add-check-in-template-schedule.md` (already deleted) and covers everything, including the big "make every remaining mock page real" pass at the end of this session.

- `supabase/migrations/20260809000000_check_in_template_schedule.sql` — adds `description TEXT` and `schedule JSONB NOT NULL DEFAULT '{}'::jsonb` to `public.check_in_templates`. The Check-ins → Templates "Create Recurring Check-in" builder (`src/components/pages/CheckInsPage.tsx`, `src/hooks/useCheckInTemplates.ts`) already reads/writes these columns — creating or editing a template fails until this runs.
- `supabase/migrations/20260810000000_feedback_and_notifications.sql` — adds `public.notifications`, backing the header bell dropdown. Read/written by `src/hooks/useNotifications.ts`. Nothing inserts into it automatically (no triggers) — shows "No notifications yet" until rows exist. (This migration originally also added a `feedback` table for an in-app feedback form; that form was replaced with a link to the GitHub repo instead, so there's no feedback table anymore — kept the filename as-is rather than renumbering.)
- `supabase/migrations/20260810000001_coach_workspace_features.sql` — the big one. Adds tables for every page that was previously a UI-shell mock:
  - `public.programs` — Programs page (`usePrograms.ts`)
  - `public.roadmaps` — Roadmaps page, per-client (`useRoadmaps.ts`)
  - `public.vault_folders` — Vault page (`useVaultFolders.ts`)
  - `public.training_groups` + `public.training_group_members` — Training Groups page (`useTrainingGroups.ts`)
  - `public.equipment` — Equipment page (`useEquipment.ts`)
  - `public.foods` — Foods page (`useFoods.ts`)
  - `public.meals` — Meals page (`useMeals.ts`)
  - `public.meal_plans` — Meal Plans page, builder state kept as JSON (`useMealPlans.ts`)
  - `public.form_checks` — Form Checks page (`useFormChecks.ts`). Trainee-submitted, same pattern as `check_ins`: client app INSERTs as the trainee, a trigger stamps `coach_id` server-side, coach reviews.

  All coach-owned tables (everything except `form_checks`) get the same RLS shape as `check_in_templates`/`notifications`: `coach_id = auth.uid()`, full CRUD on own rows. `form_checks` follows the `check_ins` RLS pattern (trainee inserts/reads own, coach reads/reviews own). `form_checks` is added to the realtime publication.

All three are additive (`ADD COLUMN`, `CREATE TABLE`) — no destructive changes, safe to run together in order.

## Prompt to give the agent

```
Push 3 pending migrations to the already-linked Supabase project in this repo.

Repo: C:\Users\imint\TRACE
The CLI should already be linked from prior sessions (project ref lfaxkrorjljdeefnafjb).
If not linked, run: npx supabase link --project-ref lfaxkrorjljdeefnafjb

Files to push (do not modify their contents):
  - supabase/migrations/20260809000000_check_in_template_schedule.sql
  - supabase/migrations/20260810000000_feedback_and_notifications.sql
  - supabase/migrations/20260810000001_coach_workspace_features.sql

Steps:
1. npx supabase migration list
   - Confirm every migration up through 20260805000003 already shows applied
     remotely. If not, STOP and report back instead of pushing.
2. npx supabase db push
   - Should apply only these 3 new files, in order.
3. Report back exactly which migrations ran, and paste any error output
   verbatim rather than summarizing it.

Do not run `supabase db reset`. Do not edit the migration files. This is a
live project — treat every step as real and hard-to-reverse.
```

## After it runs — how we'll verify

- `npx supabase migration list` shows `20260809000000`, `20260810000000`, and `20260810000001` applied.
- Check-ins → Templates → "Create Recurring Check-in" → Create succeeds; reopening a saved template shows the same data.
- Header → bell icon opens without erroring.
- Programs / Roadmaps / Vault / Training Groups / Equipment / Foods / Meals / Meal Plans: each page's "New ___" dialog creates a real row that shows up in that page's list after refresh, and each list item's delete/trash icon actually removes it.
- Clients page shows the real roster (reads `profiles` where `coach_id` = you) instead of "No clients yet" once at least one trainee has signed up under you.
- Messages page: selecting a client with `client_id`/`coach_id` set opens a working chat (already backed by the existing `direct_messages` table — no new migration needed for this one).
- Form Checks page shows "You're all caught up" until a trainee submits one from `TRACE-client` (see the client-app handoff doc for the insert shape) — nothing to fake-test here without that side built.

## Known follow-ups not in scope for this push (see the TODO doc)

- `docs/migrations/TODO-onboarding-account-linking.md` — `/onboarding` wizard is still fully client-side, no real write path.
- Sending real client-invite emails needs a Supabase Edge Function + an email provider secret (Resend/SendGrid/etc.) — not decided yet. The header Feedback button no longer needs this; it links to the GitHub repo instead.
- Dashboard's "New signups / Workouts / Churned" stat cards and the nutrition/cardio/steps panels are explicitly labeled "not tracked yet" — they need 7/30-day rollup queries over `set_logs`/`workout_sessions`/`nutrition_logs`/`wearable_biometrics`, a separate analytics effort from a plain read hook.
- `training_groups`/`training_group_members`: the group members management UI (adding/removing specific clients to a group) wasn't built — the table exists and RLS is ready, but the page only creates the group shell for now.
- Meal Plans builder: the top-level TDEE calculator (goal, method, calorie target) now saves for real; the granular per-meal food-search row grid inside the builder is still local-only UI, not persisted per-row.
