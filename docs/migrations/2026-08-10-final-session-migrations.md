# Migration task: apply 2 pending migrations from this session

Two local migrations from this session are still unapplied to the live Supabase project. This doc supersedes `2026-08-09-add-check-in-template-schedule.md` — apply both from here instead of running that one separately.

- `supabase/migrations/20260809000000_check_in_template_schedule.sql` — adds `description TEXT` and `schedule JSONB NOT NULL DEFAULT '{}'::jsonb` to `public.check_in_templates`. The Check-ins → Templates "Create Recurring Check-in" builder (`src/components/pages/CheckInsPage.tsx`, `src/hooks/useCheckInTemplates.ts`) already reads/writes these columns — creating or editing a template fails until this runs.
- `supabase/migrations/20260810000000_feedback_and_notifications.sql` — adds two new tables:
  - `public.feedback` — header "Feedback" submissions (topic + message, composed client-side into one `message` string). Written by `src/hooks/useFeedback.ts`.
  - `public.notifications` — backing for the header bell dropdown. Written/read by `src/hooks/useNotifications.ts`. Nothing inserts into it automatically yet (no triggers wired) — it'll just show "No notifications yet" until rows exist, either inserted manually or by a future feature.
  - Both tables get coach-scoped RLS (`coach_id = auth.uid()`, full CRUD on own rows) and `notifications` is added to the realtime publication so the bell updates live.

Neither has been executed anywhere. Both are additive (`ADD COLUMN`, `CREATE TABLE`) — no destructive changes, safe to run together.

## Prompt to give the agent

```
Push 2 pending migrations to the already-linked Supabase project in this repo.

Repo: C:\Users\imint\TRACE
The CLI should already be linked from prior sessions (project ref lfaxkrorjljdeefnafjb).
If not linked, run: npx supabase link --project-ref lfaxkrorjljdeefnafjb

Files to push (do not modify their contents):
  - supabase/migrations/20260809000000_check_in_template_schedule.sql
  - supabase/migrations/20260810000000_feedback_and_notifications.sql

Steps:
1. npx supabase migration list
   - Confirm every migration up through 20260805000003 already shows applied
     remotely. If not, STOP and report back instead of pushing.
2. npx supabase db push
   - Should apply only these 2 new files, in order.
3. Report back exactly which migrations ran, and paste any error output
   verbatim rather than summarizing it.

Do not run `supabase db reset`. Do not edit the migration files. This is a
live project — treat every step as real and hard-to-reverse.
```

## After it runs — how we'll verify

- `npx supabase migration list` shows `20260809000000` and `20260810000000` applied.
- Check-ins → Templates → "Create Recurring Check-in" → pick a starter template or "Start blank" → Create succeeds, and the new template appears with its question count and frequency. Reopening a saved template shows the same schedule/questions you saved.
- Header → Feedback → type a topic + message → Send succeeds (no "Could not send feedback" toast) and a row appears in `public.feedback`.
- Header → bell icon opens without erroring (shows "No notifications yet" until a row exists — insert a test row into `public.notifications` with a real `coach_id` to confirm it shows up and "Mark all read" works).

## Known follow-ups not in scope for this push

These are documented elsewhere and don't need action right now:
- `docs/migrations/TODO-onboarding-account-linking.md` — the `/onboarding` wizard is still fully client-side (no real write path); wiring it to a real trainee account needs a separate, explicitly-scoped migration + auth decision.
- Actually emailing `feedback` rows to the app creator needs a Supabase Edge Function + an email provider secret (Resend/SendGrid/etc.) — not decided yet, so `feedback` rows just sit in the table for now.
