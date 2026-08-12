# TRACE (coach dashboard) handoff — TODO for next session

Builds on `docs/handoff-todo-and-cross-repo-qa.md` (2026-08-11). This session
ran a code-level cross-repo QA pass against the live Supabase schema
(`lfaxkrorjljdeefnafjb`) — findings below are either new items or resolved
items from that doc, not repeats.

## Resolved this session (no action needed)

- **Form Checks exercise-name join** (was QA item 3.1 / "unverified item") —
  confirmed live via direct query: `form_checks.exercise_id` has exactly one
  FK (`form_checks_exercise_id_fkey` → `exercises(id)`). The
  `exercise:exercises(name)` embed in `src/hooks/useFormChecks.ts` is safe
  as-is, no explicit FK hint needed.
- **Messaging (`direct_messages`)** — confirmed both repos use matching
  `useDirectChat.ts` with real Supabase Realtime `postgres_changes`
  subscriptions (not polling). No regression, no action needed.

## New TODO from this session

1. **Handle `exercise_id: null` gracefully on the Form Checks page.**
   Confirmed in TRACE-client's `useFormChecks.ts`: a trainee can legitimately
   submit a form check with no exercise selected (`exercise_id: null` — there's
   a "No exercise" option in the picker). Check `FormChecksPage.tsx` /
   `useFormChecks.ts` on this side render something sane for that case (e.g.
   "General form check" or similar), not a blank/broken row. This was
   probably already handled defensively but wasn't explicitly verified this
   session — worth a quick check.

2. **`platform_settings.default_coach_id` is empty on the live DB right now**
   (confirmed via direct query — zero rows). Every trainee signing up through
   TRACE-client today gets `profiles.coach_id = NULL`, i.e. they are not
   actually landing under the coach. This isn't a code fix in this repo — it
   needs a one-time `INSERT` against the live DB once the coach's own
   `profiles.id` is known. Flagging here since it silently breaks the
   Clients page / roster until done. (A separate prompt for whoever handles
   Supabase/migrations directly covers the exact fix.)

## Still open from the prior handoff (unchanged, not re-verified this session)

Full detail in `docs/handoff-todo-and-cross-repo-qa.md` Part 1 — summarized:

3. Client invite emails — needs Edge Function + email provider secret
   (Resend/SendGrid/Postmark), needs user's API key.
4. Onboarding wizard → real trainee account — needs a decision on where
   sign-in happens in the flow and what table the answers land in. Scoped in
   `docs/migrations/TODO-onboarding-account-linking.md`.
5. Dashboard analytics (signups/workouts/churn/nutrition/cardio/steps) —
   needs business definitions for "churn"/"compliance" before building the
   rollup RPCs.
6. Training Groups — member management UI still missing (table/RLS/hook
   exist; no add/remove-client UI after group creation).
7. Meal Plan builder — per-meal food rows still local-only, needs a
   `meal_plan_items` join table + UI.

## Known but out-of-scope-for-this-repo gap (found this session)

- TRACE-client has **zero check-in feature client-side** — no screen, no
  question-type renderer, nothing consumes `check_in_templates`/
  `CheckInQuestion` on the trainee side, despite this repo having a full
  check-in system (templates, review, `coach_notes`). Nothing to fix here —
  noted so it's not mistaken for a regression on this side if a check-in
  loop test comes back empty. Fix lives in TRACE-client.
- TRACE-client also doesn't read this repo's real `exercise_muscles`/
  `muscle_groups` join data (primary/secondary role) — it only reads the
  legacy flat `target_muscle_group` column, so secondary muscles tagged here
  are invisible to trainees. Also a TRACE-client fix, not this repo's.

## Regression check before/after any of the above

Per existing policy: `npm run test`, `npm run lint`, `npm run build` — all
green as of last commit. Re-run all three after any change here, commit
locally only (never push — hard rule in `CLAUDE.md`).
