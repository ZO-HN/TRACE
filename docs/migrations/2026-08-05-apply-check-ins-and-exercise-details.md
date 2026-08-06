# Migration task: apply `check_ins` + `exercise_details` to the live Supabase project

Two new local migrations exist in `supabase/migrations/` that have **not** been applied to the live project (`lfaxkrorjljdeefnafjb`) yet:

- `20260805000000_check_ins.sql` — adds `check_ins` + `check_in_templates` tables, RLS, and a realtime publication entry.
- `20260805000001_exercise_details.sql` — extends `exercises` with new columns (category, exercise_type, movement_profile, exercise_position, is_bodyweight, is_unilateral, coaching_cues, equipment_tags), adds `muscle_groups` (seeded with 65 rows) and `exercise_muscles`, plus RLS.

Both were syntax-validated locally against the real Postgres grammar (via `libpg-query`) but **never executed** — no local Docker/Postgres was available in that session, and applying to the live project wasn't authorized there. This doc is the handoff so a different agent (or you) can actually run it.

## Prompt to give the agent

```
Apply the two pending Supabase migrations in this repo to the live project.

Repo: C:\Users\imint\TRACE
Project ref: lfaxkrorjljdeefnafjb (from VITE_SUPABASE_URL in .env.local)
Pending files (do not modify their contents):
  - supabase/migrations/20260805000000_check_ins.sql
  - supabase/migrations/20260805000001_exercise_details.sql

Follow the repo's own documented provisioning flow (see docs/provisioning.md) rather
than inventing a new one:

1. npx supabase login
2. npx supabase link --project-ref lfaxkrorjljdeefnafjb
3. Before pushing, sanity-check history: npx supabase migration list
   - Confirm every migration OLDER than 20260805000000 already shows as applied
     on the remote side. If any earlier ones are missing remotely, STOP and report
     back rather than pushing — don't let db push try to re-run already-applied
     migrations blind.
4. npx supabase db push
   - This should apply ONLY the two new 20260805 files if history checks out.
5. Report back: which migrations actually ran, and paste any error output verbatim
   rather than summarizing it.

Do not run `supabase db reset` (wipes the remote database). Do not edit the
migration SQL files to "fix" something without flagging it first — if a statement
fails, report the exact error and stop.

This is a live production-adjacent database (real coach/trainee data may already
exist). Treat every step here as a real, hard-to-reverse action, not a dry run.
```

## After it runs — how we'll verify

Don't just trust "it said success." Re-run these checks (I'll do this myself in the next session, but the agent can pre-check too):

1. `npx supabase migration list` — both new files should show as applied remotely.
2. In the app (`npm run dev`), visit `/check-ins` and `/exercises` as the coach — the
   "Could not load..." errors referencing `public.check_ins` / `exercise_muscles`
   relationship-not-found should be gone (empty-state UI instead, since there's no
   seed data yet).
3. Spot-check in the Supabase dashboard (Table Editor):
   - `muscle_groups` has 65 rows.
   - `exercises` has the new columns (category, exercise_type, etc.) with correct
     defaults on any pre-existing rows.
4. Try creating one real exercise end-to-end via the "New Exercise" modal and
   confirm it persists (`exercises` + `exercise_muscles` rows appear).

## Known risk to flag to the agent

`supabase db push` determines what's "new" from the remote's own migration-history
table, not by re-parsing file contents. If the ~10 earlier migrations in this repo
were ever applied outside the CLI (dashboard SQL editor, a different machine without
`supabase link`, etc.), the remote history won't know about them, and `db push` will
try to replay them — which will fail loudly (e.g. `type "user_role" already exists`)
but should NOT corrupt anything, since it fails before altering data. If that
happens, the fix is `supabase migration repair --status applied <version>` for each
already-applied-but-unrecorded migration, not force-pushing through the error.
