# TRACE handoff: open TODOs + cross-repo QA guide

Single upload for the chat space where `TRACE` (coach dashboard) and `TRACE-client` (trainee app) are both open together. Combines the outstanding TODO list from the coach-dashboard side with the cross-repo QA testing guide.

Both apps hit the same Supabase project (`lfaxkrorjljdeefnafjb`) with independent sessions per device/app — RLS is what scopes visibility, not which app is open. Migrations through `20260810000001_coach_workspace_features.sql` are applied and verified live (confirmed via `npx supabase migration list` on 2026-08-11).

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

The Form Checks page is real (reads/reviews `public.form_checks`, plays back video via the existing R2 media viewer) but nothing populates it until a trainee submits one from the client app. See Part 2 below for the insert shape.

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

---

## Part 2 — Cross-repo QA testing guide

### Known unverified item — check this first

`src/hooks/useFormChecks.ts` (coach dashboard) queries `form_checks` with an embedded join:
```ts
.select('id, client_id, exercise_id, video_key, status, coach_notes, submitted_at, reviewed_at, client:profiles!form_checks_client_id_fkey(first_name,last_name), exercise:exercises(name)')
```
The `exercise:exercises(name)` embed relies on PostgREST auto-detecting the single FK from `form_checks.exercise_id` to `public.exercises(id)` (defined inline, no explicit constraint name, in `20260810000001_coach_workspace_features.sql`). This *should* resolve fine since there's only one FK path between those two tables — but it wasn't smoke-tested against the live schema (no login access during the session that wrote it). If the join silently resolves to `null` instead of erroring, form checks will show "General form check" for every row instead of the actual exercise name.

**Test:** submit a form check from TRACE-client with a real `exercise_id` set, then check the coach dashboard's Form Checks page shows that exercise's name (not "General form check"). If it's blank, the fix is adding an explicit hint: `exercise:exercises!form_checks_exercise_id_fkey(name)`.

### Full write-direction contract reference

| Table | Client app (TRACE-client) | Coach dashboard (this repo) |
|---|---|---|
| `check_ins` | INSERT as trainee (`client_id = auth.uid()`) | SELECT + UPDATE (review/notes) |
| `check_in_templates` | SELECT own coach's templates | Full CRUD (author) |
| `form_checks` | INSERT as trainee (`client_id = auth.uid()`) | SELECT + UPDATE (review/notes) |
| `exercises` / `muscle_groups` / `exercise_muscles` | SELECT (any authenticated user) | Full CRUD (author) |
| `direct_messages` | INSERT/SELECT own conversations | INSERT/SELECT own conversations (symmetric 1:1) |
| `programs`, `roadmaps`, `vault_folders`, `training_groups`, `equipment`, `foods`, `meals`, `meal_plans` | **No access** — coach-only RLS | Full CRUD (author) |
| `notifications` | **No access** — coach-only RLS | Full CRUD (own) |

If a cross-repo test expects a trainee to read `roadmaps` or `meal_plans` (e.g. "client views their assigned meal plan in the app"), that's a **missing feature**, not a bug — RLS currently blocks it entirely. Flag it rather than assuming it should already work.

### End-to-end flows to test together

For each, one side does the write, the other confirms the read — that's the actual integration point, not just "does each app work standalone."

1. **Check-in loop**
   - Coach dashboard: create a check-in template (Check-ins → Templates → Create Recurring Check-in), any starter or blank.
   - TRACE-client: sign in as a trainee under that coach, confirm the template's questions render correctly (all `CheckInQuestion.type` values — `text`, `number`, `scale-5`, `scale-10`, `single-choice`, `multiple-choice`, `photo`, `time`, `bodyweight`, `progress-photo`, `measurement` — the client may not handle all of these yet, worth confirming which are actually implemented client-side vs. which fall back ungracefully).
   - TRACE-client: submit a check-in.
   - Coach dashboard: confirm it appears under Check-ins → Needs review with the right responses, mark it reviewed, confirm `coach_notes` persists.

2. **Form check loop**
   - TRACE-client: submit a form check with a video and an `exercise_id`.
   - Coach dashboard: confirm it appears in Form Checks, video plays via the R2 signed URL, exercise name resolves (see the unverified item above), mark reviewed with notes.
   - TRACE-client: confirm the trainee can read back `status` and `coach_notes` on their own submission (RLS allows SELECT, not UPDATE, on their own rows).

3. **Messaging loop**
   - Coach dashboard: Messages page, select a client, send a message.
   - TRACE-client: confirm the trainee receives it in real time (this is `direct_messages` + realtime, already-existing infra, not new this pass — good baseline to confirm nothing regressed).
   - Reverse direction: trainee sends, coach dashboard updates live.

4. **Exercise library consistency**
   - Coach dashboard: create an exercise with muscle groups tagged.
   - TRACE-client: confirm it shows up in the client's exercise browser with the same primary/secondary muscle data (read-only on that side).

5. **Roster / invite loop**
   - Coach dashboard: Settings → Client onboarding screens → Copy invite link (or Clients → Invite Client → Share Link).
   - Open that link fresh (unauthenticated) — confirm the onboarding wizard renders only the screens enabled in Settings, in the right order.
   - **Note:** finishing the wizard does not currently create a real account or trainee profile (see TODO item 2 above) — this flow currently dead-ends at "Thanks for reaching out" without actually connecting to `TRACE-client`. Confirm that's still the expected state, not a regression, until that follow-up is scoped and built.
   - Separately: sign up a trainee directly in TRACE-client using the coach's account (however that flow currently works there), and confirm `handle_new_user()` correctly sets `profiles.coach_id`, and that the new client shows up in the coach dashboard's Clients page and Messages sidebar.

### General regression checklist (coach dashboard side)

Run `npm run test`, `npm run lint`, `npm run build` in this repo before and after any cross-repo QA session — all three were green as of the last commit on this side. If a cross-repo test reveals a bug, fix it here, then re-run all three before considering it resolved.
