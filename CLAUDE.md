# TRACE — Agent Instructions

## What this repo is

**This is the Coach Web Dashboard only** — one repo of two. There is no trainee-facing UI, offline outbox, or unit-conversion logic in this repo anymore — that all lives in the client app's repo at `C:\Users\imint\TRACE-client` (Expo/React Native/NativeWind, same Supabase backend). This repo only ever *reads* trainee-logged data (sets, sessions, biometrics) to display it; it never writes `set_logs`/`workout_sessions`.

TRACE is a **multi-coach, invite-only platform** (as of the `coach_allowlist` migration, 2026-08-12): any number of coaches can use this deployment, each with an isolated set of clients (every coach-owned table is scoped by `coach_id`/`created_by_coach_id`), but only emails on `public.coach_allowlist` (managed by a platform admin — `profiles.is_platform_admin`) can ever become a coach account. `handle_new_user()` decides `role` server-side from that allowlist on every signup (email OTP or Google OAuth) — never trust client-supplied role metadata for this. Trainees who sign up through the client app with no coach selection still auto-enroll under `platform_settings.default_coach_id` (see below) — that fallback is unrelated to the coach allowlist and still needs its own bootstrap step. `AppShell` gates the whole dashboard on `profile.role === 'coach'` — a trainee account (including one created by an uninvited email logging into this dashboard) gets a "not authorized" screen, not the app.

## Git policy (hard rule)

**All commits stay local. Never push to GitHub, never create PRs, never run remote git actions** — even if a command or workflow suggests it. Commit locally on `master` after each verified unit of work. Only an explicit, in-the-moment user request overrides this.

## Commands

- Dev: `npm run dev`
- Test: `npm run test` (Vitest)
- Lint: `npm run lint` (oxlint)
- Build: `npm run build` (tsc -b + vite)

Run test + tsc + lint + build before every commit.

## Key constraints

- `set_logs.estimated_1rm` is a GENERATED column — this repo never writes `set_logs` at all, but if that changes, never include it in write payloads.
- `set_logs.weight_kg` is stored in kilograms. Unit conversion (`lbsToKg`) lives in the client app's repo, not here.
- `workout_sessions` RLS allows owner INSERT + SELECT only (no owner UPDATE) — this repo doesn't write sessions; a coach-scoped `UPDATE` policy for `coach_feedback_notes` is planned but not yet added.
- Media (video/photos) goes to Cloudflare R2 via presigned URLs, never into Postgres or Supabase Storage — see `docs/adr/0001-media-storage.md`. This repo only *views* media (`MediaViewer`/`useMediaUrl`/`r2-get-url`); uploading happens client-side in the other repo.
- `platform_settings.default_coach_id` must be set manually after the coach account is created (see comment in `supabase/migrations/20260803000000_platform_settings_and_rls_fix.sql`) — until then, new trainee signups get `coach_id = NULL`.
- Docs live in `/docs` (index: `docs/README.md`) — note the architecture/feature/audit docs there predate the coach/client repo split and are now stale; treat this file as authoritative until they're rewritten. Workflow skills live in `.agents/skills/`.
