# Handoff: TRACE App items to check/build

For whoever picks up `TRACE-client` (the trainee mobile app) next — either a dedicated session on that repo, or future work here. Everything below was found or built from the coach-dashboard side during a recent session; each item is either a schema/RPC already sitting ready for the app to use, or a cross-repo contract the app needs to hold up its end of.

Backend for all of this lives in the coach-dashboard repo's `supabase/migrations/` (shared Supabase project `lfaxkrorjljdeefnafjb`) — nothing below needs new coach-dashboard work, just confirms what TRACE App should do with what already exists.

---

## 1. Periodized training programs — schema exists, no UI anywhere yet

`supabase/migrations/20260814000000_periodized_training_programs.sql` added three tables, RLS already correct:

- `workout_programs` (id, `owner_id`, name, description, category, split_type, total_weeks)
- `program_days` (per-week, per-day: either a `workout_template_id` reference or a rest day)
- `program_enrollments`

RLS is owner-scoped (`auth.uid() = owner_id`) — the migration's own comment says this is explicitly a **trainee-owned personal plan, not a coach-assigned template** (distinct from `programs`/`workout_templates`, which are coach-authored and already used by the dashboard). That framing means this is TRACE App's feature to build, not the coach dashboard's. Nothing reads or writes these tables anywhere right now, in either repo — confirmed via a full grep of the coach-dashboard codebase.

**To check:** does TRACE App already have a periodization/program-builder screen planned or in progress? If not, this is a real, currently-invisible gap — the data model is ready and waiting.

## 2. "Choose your coach" screen — RPCs exist, confirm the UI is real

A parallel session added a referral/discovery system for trainees picking a coach at signup (`supabase/migrations/20260813000001_coach_referral_and_signup_gate.sql`):

- `list_available_coaches()` — browsable list of coaches (id, name, referral code).
- `claim_coach_by_id(p_coach_id)` — attach the calling trainee to a coach by id, only if they don't already have one.
- `claim_coach_by_code(p_code)` — same, via the coach's short referral code (shown in the coach dashboard's Clients → Invite Client → Referral Code tab).

The trigger `handle_new_user()` was also changed: **new trainees now sign up with `coach_id = NULL`** — there's no more auto-enrollment fallback (`platform_settings.default_coach_id` is dead code now, left in place but unused). This means **a trainee who signs up in TRACE App with no coach-selection step will be permanently unassigned** unless the app calls one of the two claim RPCs somewhere in its onboarding flow.

**To check:** confirm TRACE App actually has this screen wired up post-signup, and that it calls `claim_coach_by_id`/`claim_coach_by_code`. If it doesn't yet, this is a hard blocker for every new trainee signup working at all.

## 3. Coach-dashboard invite links now create real linked accounts — confirm the handoff to the app

The coach dashboard's `/onboarding` link flow (public, server-issued via `client_invites`) now does a real sign-in + write (previously it was a fake "thanks for reaching out" screen with no backend). After a trainee completes it:

- They have a real Supabase auth account (email OTP or Google).
- They're claimed by the inviting coach (`profiles.coach_id` set via the same `claim_coach_by_id` RPC from item 2).
- Their answers are saved to `onboarding_responses` (coach can read via RLS).

The wizard's "done" screen tells them to download TRACE App and **sign in with the same email** — at that point they should land already linked to their coach, no further "choose a coach" step needed for them specifically.

**To check:** does TRACE App handle "trainee already has `coach_id` set" gracefully on first login (skip the choose-a-coach screen), or would it currently force them through it again / conflict with the existing claim?

## 4. Steps / cardio — schema gap, not a TRACE App bug, but relevant if adding either

The coach dashboard's dashboard analytics deliberately left "Client steps" and "Client cardio" panels as placeholders because:

- `wearable_biometrics` has no step-count column at all (only `hrv_ms`, `resting_heart_rate`, `sleep_score`, `active_calories_burned`, `readiness_score`).
- No table distinguishes cardio vs. strength `workout_sessions`.

If TRACE App is planning to track either, the coach dashboard will need matching schema (new column(s)/migration) before it can display anything real — currently there's nowhere for that data to even land. Flag before building either side so the schema gets designed once, not twice.

## 5. Solo-trainee analytics RPCs — already built, confirm TRACE App actually calls them

`get_personal_records`, `get_exercise_stats`, `get_muscle_analytics` (all in `supabase/migrations/20260803000003_solo_analytics_rpcs.sql`) exist and are correctly RLS-checked (caller must be the trainee themselves or their coach). Not used anywhere in the coach dashboard — these are for the trainee's own progress views in TRACE App.

**To check:** confirm these are actually wired into TRACE App's UI, not just sitting unused like the periodized-programs tables in item 1.

## 6. Two fully orphaned tables — unclear if TRACE App needs them

`coach_extensions` and `coach_trainee_relations` exist with RLS but are referenced by **nothing** in the coach-dashboard repo (grepped both `src/` and `supabase/functions/`). Possibly dead schema from an earlier design, possibly meant for TRACE App and just never got read/write code anywhere yet.

**To check:** if TRACE App doesn't use these either, they're candidates for a future cleanup migration (`DROP TABLE`) — don't drop them without confirming first, in case something depends on them that wasn't visible from this repo.

---

## Reference

- Full write-direction contract table (which repo can read/write which table): `docs/qa-testing-cross-repo.md`.
- What TRACE App must implement for check-ins/exercises specifically: `docs/client-app-contract-check-ins-exercises.md`.
- Current coach-dashboard feature status: `docs/audit.md`.
