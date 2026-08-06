# Migration task: apply 2 bug-fix migrations (follow-up to the check-ins/exercises push)

Two new local migrations fix bugs found after the last push:

- `supabase/migrations/20260805000002_fix_profiles_rls_recursion.sql` — the "Coaches can read connected clients profiles" policy on `public.profiles` subqueries `profiles` from within its own policy, causing Postgres error 42P17 (`infinite recursion detected in policy for relation "profiles"`) on any query that embeds a profile join (e.g. check-ins listing a client's name). Fix moves the check into a `SECURITY DEFINER` function.
- `supabase/migrations/20260805000003_add_exercises_created_at.sql` — `public.exercises` was missing a `created_at` column that the app queries and orders by. Adds it with `DEFAULT NOW()`.

Both already syntax-validated locally (via `libpg-query`) — not yet executed anywhere.

## Prompt to give the agent

```
Push 2 pending bug-fix migrations to the already-linked Supabase project in this repo.

Repo: C:\Users\imint\TRACE
The CLI should already be linked from the last session (project ref lfaxkrorjljdeefnafjb).
If not linked, run: npx supabase link --project-ref lfaxkrorjljdeefnafjb

Files to push (do not modify their contents):
  - supabase/migrations/20260805000002_fix_profiles_rls_recursion.sql
  - supabase/migrations/20260805000003_add_exercises_created_at.sql

Steps:
1. npx supabase migration list
   - Confirm every migration up through 20260805000001 already shows applied
     remotely. If not, STOP and report back instead of pushing.
2. npx supabase db push
   - Should apply only these 2 new files.
3. Report back exactly which migrations ran, and paste any error output
   verbatim rather than summarizing it.

Do not run `supabase db reset`. Do not edit the migration files. This is a
live project — treat every step as real and hard-to-reverse.
```

## After it runs — how we'll verify

- `npx supabase migration list` shows `20260805000002` and `20260805000003` applied.
- `/check-ins` in the app no longer shows "infinite recursion detected in policy for relation profiles".
- `/exercises` in the app no longer shows "column exercises.created_at does not exist".
