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

### 7. Coach dashboard signup page removed (2026-08-12)

TRACE is single-coach — the coach account already exists and trainee signup happens in TRACE-client. Removed `/signup`, `SignupPage.tsx`, and the "Sign up" link on the login page; login now reads login-only (`shouldCreateUser: false`, already the case before this change).

### 8. Exercise Muscle Model tab — bigger, smoother, hover feedback (2026-08-12)

`MuscleModel.tsx` model canvas is bigger (`min-h-[600px]`, was capped at `max-h-96`) and each SVG muscle region now scales/brightens on hover via pure CSS (`.muscle-model-canvas polygon:hover` in `index.css`) instead of only reacting on click. Note: `react-body-highlighter` doesn't expose which muscle a given `<polygon>` represents outside its internal `onClick` closure, so a hover tooltip naming the muscle (e.g. "Rectus Femoris (Quadriceps)") isn't possible without forking the library — flagging rather than faking it. Click-to-cycle (primary → secondary → none) still works as before.

### 9. Bottom dock nav — auto-hide (2026-08-12)

The floating bottom dock (`Dock.tsx`) was always on-screen. It now stays hidden (`opacity: 0`, slid down) and reveals with a smooth transition when the mouse is near the bottom edge of the screen, or via `:focus-within` for keyboard navigation so it's never unreachable without a mouse.

---

## Which open items need a dataset (not just a decision/credential) to be fully functional

Most items above are blocked on a decision or an API key, not on data. One is different:

- **Item 5 (Meal Plan food rows)** — `public.foods` has zero seed rows (checked: no `INSERT INTO foods` anywhere in `supabase/migrations/`). Even once the `meal_plan_items` join table and search UI exist, the per-meal food picker has nothing to search until either the coach manually enters every food via the Foods page, or a nutrition dataset (e.g. USDA FoodData Central, an off-the-shelf food/nutrition API) is imported. Worth deciding which before building the picker UI, since the UI shape differs (autocomplete over local `foods` rows vs. a live external API call).

No other open item needs a dataset — Exercises, Training Groups, Form Checks, and Dashboard analytics all operate on data the coach/trainees generate themselves, not a pre-seeded reference dataset.
