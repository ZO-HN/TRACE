# TRACE handoff: open TODOs (coach dashboard)

Outstanding TODOs for this repo (`TRACE`, the coach dashboard). Cross-repo QA testing with `TRACE-client` lives separately in `docs/cross-repo-qa.md`.

---

## Part 1 — Open TODOs (need a decision/credential from the user)

### 1. Client invite emails

Clients → Invite Client → Email tab is disabled with an explanatory note (Share Link tab works today and needs no email). Sending a real email invitation needs a Supabase Edge Function + an email provider secret (Resend, SendGrid, Postmark, etc.) — needs the user's account/API key to wire up.

The header "Feedback" button no longer needs this — it links straight to the GitHub repo (`https://github.com/ZO-HN/TRACE`) instead of an in-app form.

### 2. Onboarding wizard → real trainee account

Fully scoped in `docs/migrations/TODO-onboarding-account-linking.md`. Short version: the `/onboarding` wizard is real UI but writes nothing to Supabase — needs a decision on where sign-in happens in the flow and what table the answers land in before that part gets built.

### 3. Dashboard analytics (signups, workouts, churn, nutrition/cardio/steps)

The dashboard's four top stat cards and the nutrition/cardio/steps panels honestly say "not tracked yet" instead of showing fake numbers. Building these for real means 7/30-day rollup queries over `set_logs`, `workout_sessions`, `nutrition_logs`, and `wearable_biometrics` — a distinct analytics effort (likely Postgres RPCs, similar to the existing `solo_analytics_rpcs.sql` migration), not a simple read hook. Flagged rather than guessed at, since "churn" or "workout compliance" need a business definition first.

### 4. Training Groups — member management ✅ done (2026-08-12)

Added `fetchMemberIds`/`addMember`/`removeMember` to `useTrainingGroups` and a "Manage Members" dialog per group card in `TrainingGroupsPage.tsx`, backed by the existing `training_group_members` table/RLS. UX chosen: a dedicated per-group dialog rather than a roster picker baked into the create step, since groups are usually created empty and staffed after.

### 5. Meal Plan builder — per-meal food rows

The TDEE calculator and top-level plan (goal, method, calorie target, assigned client) save for real. The granular per-meal, per-row food search grid inside the builder is still local-only — wiring each row to a real food reference with quantity would need a `meal_plan_items` join table and more UI.

### 6. Form Checks — nothing to test until TRACE-client writes to it

The Form Checks page is real (reads/reviews `public.form_checks`, plays back video via the existing R2 media viewer) but nothing populates it until a trainee submits one from the client app. See `docs/cross-repo-qa.md` for the insert shape and the known-unverified exercise-name join.

### 7. Coach dashboard signup page removed, then superseded by item 10 (2026-08-12)

Originally removed `/signup` since TRACE was single-coach. Superseded same day by item 10 below — TRACE is now multi-coach, and the login page itself handles both login and first-time coach account creation (no separate signup page needed, since the allowlist decides server-side who actually gets coach powers).

### 8. Exercise Muscle Model tab — bigger, smoother, hover feedback (2026-08-12)

`MuscleModel.tsx` model canvas is bigger (`min-h-[600px]`, was capped at `max-h-96`) and each SVG muscle region now scales/brightens on hover via pure CSS (`.muscle-model-canvas polygon:hover` in `index.css`) instead of only reacting on click. Note: `react-body-highlighter` doesn't expose which muscle a given `<polygon>` represents outside its internal `onClick` closure, so a hover tooltip naming the muscle (e.g. "Rectus Femoris (Quadriceps)") isn't possible without forking the library — flagging rather than faking it. Click-to-cycle (primary → secondary → none) still works as before.

### 9. Bottom dock nav — auto-hide (2026-08-12)

The floating bottom dock (`Dock.tsx`) was always on-screen. It now stays hidden (`opacity: 0`, slid down) and reveals with a smooth transition when the mouse is near the bottom edge of the screen, or via `:focus-within` for keyboard navigation so it's never unreachable without a mouse.

### 10. Coach allowlist (multi-coach, invite-only signup) — migration written, NOT YET APPLIED (2026-08-12)

TRACE moved from "single default coach" to multi-coach: any number of coaches can use this deployment, each with their own isolated clients (already true structurally — every coach-owned table is scoped by `coach_id`/`created_by_coach_id`), but only emails on a platform-admin-curated allowlist can ever become a coach — via email login link *or* Google sign-in. Non-invited emails still get an account (harmless trainee profile), they just can't get into the coach dashboard (`AppShell` now gates on `profile.role === 'coach'`, which it didn't before — this was a real gap: previously any authenticated user, including a trainee via Google OAuth, could load the full coach dashboard).

**What shipped in code (`supabase/migrations/20260812010000_coach_allowlist.sql`):**
- `profiles.is_platform_admin` boolean column.
- `coach_allowlist` table (email, note, invited_by, created_at), RLS-gated to platform admins only.
- `handle_new_user()` trigger rewritten to decide `role` from allowlist membership server-side, instead of trusting client-supplied signup metadata (closes a real trust gap — previously any client could pass `role: 'coach'` in the signup payload).
- Settings → "Coach access" tab (visible only to platform admins) to add/remove allowlisted emails — `src/hooks/useCoachAllowlist.ts` + `CoachAccessTab` in `SettingsPage.tsx`.
- `LoginPage.tsx` now uses `shouldCreateUser: true` (safe now that role is decided server-side, not client-side).

**Still needs from the user, in order:**
1. Apply the migration to the live DB (`npx supabase db push` from this repo, or via the Supabase dashboard) — declined during this session, not yet run.
2. After it's applied: `UPDATE public.profiles SET is_platform_admin = TRUE WHERE id = '<your-profile-id>';` (one-time, run directly against the DB) so you can see/use the new Settings tab. This is the same `profiles.id` needed for the still-open `platform_settings.default_coach_id` bootstrap from the 2026-08-12 QA session doc — worth doing both in the same sitting.
3. Optionally seed your own email into `coach_allowlist` for the audit trail (not required for your own access, since your profile row already exists).

---

## Which open items need a dataset (not just a decision/credential) to be fully functional

Most items above are blocked on a decision or an API key, not on data. One is different:

- **Item 5 (Meal Plan food rows)** — `public.foods` has zero seed rows (checked: no `INSERT INTO foods` anywhere in `supabase/migrations/`). Even once the `meal_plan_items` join table and search UI exist, the per-meal food picker has nothing to search until either the coach manually enters every food via the Foods page, or a nutrition dataset (e.g. USDA FoodData Central, an off-the-shelf food/nutrition API) is imported. Worth deciding which before building the picker UI, since the UI shape differs (autocomplete over local `foods` rows vs. a live external API call).

No other open item needs a dataset — Exercises, Training Groups, Form Checks, and Dashboard analytics all operate on data the coach/trainees generate themselves, not a pre-seeded reference dataset.
