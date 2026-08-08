# Migration task: add check-in template schedule columns

One new local migration, needed by the new "Create Recurring Check-in" template builder (Check-ins → Templates):

- `supabase/migrations/20260809000000_check_in_template_schedule.sql` — adds `description TEXT` and `schedule JSONB NOT NULL DEFAULT '{}'::jsonb` to `public.check_in_templates`. The builder UI already writes/reads these columns (name, description, questions, schedule); until this runs, saving or loading a template will fail.

Not yet executed anywhere.

## Prompt to give the agent

```
Push 1 pending migration to the already-linked Supabase project in this repo.

Repo: C:\Users\imint\TRACE
The CLI should already be linked from prior sessions (project ref lfaxkrorjljdeefnafjb).
If not linked, run: npx supabase link --project-ref lfaxkrorjljdeefnafjb

File to push (do not modify its contents):
  - supabase/migrations/20260809000000_check_in_template_schedule.sql

Steps:
1. npx supabase migration list
   - Confirm every migration up through 20260805000003 already shows applied
     remotely. If not, STOP and report back instead of pushing.
2. npx supabase db push
   - Should apply only this 1 new file.
3. Report back exactly which migration ran, and paste any error output
   verbatim rather than summarizing it.

Do not run `supabase db reset`. Do not edit the migration file. This is a
live project — treat every step as real and hard-to-reverse.
```

## After it runs — how we'll verify

- `npx supabase migration list` shows `20260809000000` applied.
- In the app, Check-ins → Templates → "Create Recurring Check-in" → pick a starter template or "Start blank" → Create succeeds and the new template appears in the list with its question count and frequency.
- Reopening a saved template (clicking its row) shows the same name, description, schedule, and questions you saved.
