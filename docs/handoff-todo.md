# TRACE handoff: open TODOs (coach dashboard)

Outstanding TODOs for this repo (`TRACE`, the coach dashboard). Cross-repo QA testing with `TRACE-client` lives separately in `docs/cross-repo-qa.md`.

---

## Part 1 — Open TODOs (need a decision/credential from the user)

### 1. Client invite emails — removed (2026-08-13)

Was built and wired to Resend (`supabase/functions/send-client-invite`, `ClientsPage.tsx` Email tab), then explicitly removed at user request before deploy — not wanted for now. The Email tab is gone entirely from Invite Clients (not just disabled); only Share Link and Find User remain. If wanted again later, `git log` around 2026-08-12/13 has the original implementation to resurrect rather than rebuilding from scratch.

The header "Feedback" button doesn't need an email provider either — it links straight to the GitHub repo (`https://github.com/ZO-HN/TRACE`) instead of an in-app form.

### 2. Onboarding wizard → real trainee account

Fully scoped in `docs/migrations/TODO-onboarding-account-linking.md`. Short version: the `/onboarding` wizard is real UI but writes nothing to Supabase — needs a decision on where sign-in happens in the flow and what table the answers land in before that part gets built.

### 3. Dashboard analytics (signups, workouts, churn, nutrition) ✅ mostly done (2026-08-13)

Built with business definitions confirmed by the user first:
- **Churned** = no `workout_sessions` in 21 days (and had at least one before that, so brand-new clients aren't miscounted), OR the coach manually marks them churned via the new Status column on the Clients page.
- **Wins this week** = a set logged in the last 7 days beating that client's prior best `estimated_1rm` for that exercise.
- **New signups / Workouts** = simple 7-day counts, no definitional ambiguity.
- **Client nutrition** = per-client `nutrition_logs` count + avg calories, last 7 days.

`supabase/migrations/20260813000000_coach_dashboard_analytics.sql` adds `profiles.manually_marked_churned` and three RPCs (`get_coach_dashboard_stats`, `get_coach_weekly_wins`, `get_coach_nutrition_summary`), same SECURITY DEFINER + `auth.uid()` ownership check pattern as the existing solo-analytics RPCs. Applied and confirmed synced live.

**Explicitly NOT built — Client steps / Client cardio panels**, left as "not tracked yet": `wearable_biometrics` has no step-count column at all, and no table distinguishes cardio vs strength sessions. This isn't a missing query, it's a missing schema — would need new columns (and TRACE-client would need to start writing them) before these panels can show anything real.

### 4. Training Groups — member management ✅ done (2026-08-12)

Added `fetchMemberIds`/`addMember`/`removeMember` to `useTrainingGroups` and a "Manage Members" dialog per group card in `TrainingGroupsPage.tsx`, backed by the existing `training_group_members` table/RLS. UX chosen: a dedicated per-group dialog rather than a roster picker baked into the create step, since groups are usually created empty and staffed after.

### 5. Meal Plan builder — per-meal food rows ✅ done, manual-entry only (2026-08-13)

User confirmed: no nutrition dataset import needed right now, and can be added later without rework (bulk `INSERT` into `public.foods` — same table the manual picker reads from, so imported rows show up automatically once added).

Built without a new `meal_plan_items` table — `meal_plans.data` is already the established JSONB persistence pattern for this table (holds the TDEE inputs too), so per-meal food rows are saved there as `data.meals[].items[]` (`{foodId, servings}`) instead of a new relational table. Simpler, no migration needed, same effective result.

- Each row in the builder is now a real food search (typeahead over the coach's own `public.foods`, via `useFoods`) + a servings quantity, with live-computed macros (calories/protein/carbs/fat) per row and a real meal total in the header — replaces the old placeholder `—` grid and non-functional "Add food" button.
- Still single-meal ("Meal 1") — multi-meal (breakfast/lunch/dinner as separate sections) wasn't asked for and the UI already had that as a static header, not wired to add more meals; flag if that's wanted next.

### 6. Form Checks — nothing to test until TRACE-client writes to it

The Form Checks page is real (reads/reviews `public.form_checks`, plays back video via the existing R2 media viewer) but nothing populates it until a trainee submits one from the client app. See `docs/cross-repo-qa.md` for the insert shape and the known-unverified exercise-name join.

### 7. Coach dashboard signup page removed, then superseded by item 10 (2026-08-12)

Originally removed `/signup` since TRACE was single-coach. Superseded same day by item 10 below — TRACE is now multi-coach, and the login page itself handles both login and first-time coach account creation (no separate signup page needed, since the allowlist decides server-side who actually gets coach powers).

### 8. Exercise Muscle Model tab — bigger, smoother, hover feedback (2026-08-12)

`MuscleModel.tsx` model canvas is bigger (`min-h-[600px]`, was capped at `max-h-96`) and each SVG muscle region now scales/brightens on hover via pure CSS (`.muscle-model-canvas polygon:hover` in `index.css`) instead of only reacting on click. Note: `react-body-highlighter` doesn't expose which muscle a given `<polygon>` represents outside its internal `onClick` closure, so a hover tooltip naming the muscle (e.g. "Rectus Femoris (Quadriceps)") isn't possible without forking the library — flagging rather than faking it. Click-to-cycle (primary → secondary → none) still works as before.

### 9. Bottom dock nav — auto-hide, then superseded (2026-08-12)

Originally made the bottom dock hide until hovered near the screen edge. Superseded same day by a left-sidebar rework (picked up from a parallel session's uncommitted work, not built here) — `Dock.tsx` is now a pinned left-edge sidebar instead of a bottom dock, so the auto-hide behavior no longer applies. Left for history; no action needed.

### 10. Coach allowlist (multi-coach, invite-only signup) ✅ done, migration applied (2026-08-12)

TRACE moved from "single default coach" to multi-coach: any number of coaches can use this deployment, each with their own isolated clients (already true structurally — every coach-owned table is scoped by `coach_id`/`created_by_coach_id`), but only emails on a platform-admin-curated allowlist can ever become a coach — via email login link *or* Google sign-in. Non-invited emails still get an account (harmless trainee profile), they just can't get into the coach dashboard (`AppShell` now gates on `profile.role === 'coach'`, which it didn't before — this was a real gap: previously any authenticated user, including a trainee via Google OAuth, could load the full coach dashboard).

**What shipped in code (`supabase/migrations/20260812010000_coach_allowlist.sql`):**
- `profiles.is_platform_admin` boolean column.
- `coach_allowlist` table (email, note, invited_by, created_at), RLS-gated to platform admins only.
- `handle_new_user()` trigger rewritten to decide `role` from allowlist membership server-side, instead of trusting client-supplied signup metadata (closes a real trust gap — previously any client could pass `role: 'coach'` in the signup payload).
- Settings → "Coach access" tab (visible only to platform admins) to add/remove allowlisted emails — `src/hooks/useCoachAllowlist.ts` + `CoachAccessTab` in `SettingsPage.tsx`.
- `LoginPage.tsx` now uses `shouldCreateUser: true` (safe now that role is decided server-side, not client-side).

Migration confirmed applied via `npx supabase migration list` (2026-08-12) — `20260812010000` now shows a synced remote timestamp. `is_platform_admin` bootstrap for `iminthemoodlol@gmail.com` was handled per `docs/handoff-supabase-migration-coach-allowlist.md`.

`platform_settings.default_coach_id` (separate table/concern — controls which coach new TRACE-client trainee signups fall under when they don't pick one) is now also set, to `iminthemoodlol@gmail.com`'s profile id (`dc41fbd3-afba-4dcd-ad7d-ef85e6bf1735`), confirmed live (2026-08-12). New trainee signups from TRACE-client with no coach selected will now correctly land under this coach instead of `coach_id = NULL`.

---

## Which open items need a dataset or schema (not just a decision/credential) to be fully functional

- **Item 5 (Meal Plan food rows)** — resolved as manual-entry-only (see above), no dataset import needed. `public.foods` still has zero seed rows until the coach adds some via the Foods page, or a nutrition dataset (USDA FoodData Central etc.) gets imported later — either way the picker UI already reads whatever's in that table, so this is no longer a blocker on the UI, just an empty-state the coach fills in over time.
- **Item 3's Client steps / Client cardio panels** — not a missing dataset so much as missing *schema*: `wearable_biometrics` has no step-count column, and nothing distinguishes cardio vs strength sessions. Needs new columns added (and TRACE-client would need to start writing them) before either panel can show real data — decided to skip for now rather than add schema speculatively.

No other open item needs a dataset — Exercises, Training Groups, Form Checks, and the rest of Dashboard analytics all operate on data the coach/trainees already generate themselves.
