# Handoff for TRACE-client: what changed on the coach dashboard this session

This is a status/contract update for whoever's working in the `TRACE-client` repo (the trainee-facing Expo app). It supplements `docs/client-app-contract-check-ins-exercises.md` (still the primary contract doc — read that first) with what changed since it was written, and flags what's *not* ready yet so client-side work doesn't get built against something that doesn't exist server-side.

Schema source of truth for everything below: the migrations in `supabase/migrations/`, specifically `20260809000000_check_in_template_schedule.sql` and `20260810000000_feedback_and_notifications.sql` — **neither is applied to the live database yet** (see `docs/migrations/2026-08-10-final-session-migrations.md`). Don't build against these columns/tables until that push has actually run; check `npx supabase migration list` on the shared project first.

## 1. `check_in_templates` — new columns

Two columns were added: `description TEXT` (nullable) and `schedule JSONB NOT NULL DEFAULT '{}'::jsonb`. The existing contract in `client-app-contract-check-ins-exercises.md` (reading `check_in_templates` to render the trainee's check-in form) still holds — just be aware the row now also carries these two fields if you want to surface them (e.g. showing the template's description above the form, or respecting its recurrence `schedule` client-side instead of only relying on `check_ins.scheduled_for`).

`schedule` shape (written by the coach dashboard's template builder):
```ts
interface CheckInSchedule {
  frequency: 'Daily' | 'Weekly' | 'Every two weeks' | 'Custom schedule' | 'Monthly' | 'On-demand only';
  days: string[];        // e.g. ['Mon', 'Wed'] — three-letter day abbreviations
  notificationTime: string; // 'HH:MM', 24h
  endDate: string;       // ISO date or '' for indefinite
  active: boolean;
}
```

`check_in_templates.questions` (already in the contract, unchanged shape) gained two optional fields per question:
```ts
interface CheckInQuestion {
  id: string;
  label: string;
  type: 'text' | 'number' | 'scale-5' | 'scale-10' | 'single-choice' | 'multiple-choice' | 'photo' | 'time' | 'bodyweight' | 'progress-photo' | 'measurement';
  required?: boolean;
  placeholder?: string;
}
```
Note `type` grew from `'text' | 'number' | 'scale'` to the full list above — if the client app renders question types with a switch statement, it needs the new cases (`scale` no longer exists as a bare value; older rows written before this session used `'scale'` and should still be treated as `'scale-10'` if any exist).

## 2. Client onboarding wizard — **not yet connected to real accounts**

The coach dashboard now has a public, unauthenticated `/onboarding` page (`src/components/pages/OnboardingWizardPage.tsx`) that a coach can generate an invite link to (Settings → Client onboarding screens → "Copy invite link"). It's a multi-step form (name, DOB, height/weight, goals, training background, nutrition habits, etc.) that a prospective trainee fills out.

**This does not write to Supabase at all right now.** The collected answers exist only in the browser tab's memory; the invite link's screen configuration travels in the URL as a base64 query param, not from a live fetch. There is currently no way for `TRACE-client` to receive this data.

Full scoping for the real version — where sign-in happens in the flow, what table the answers land in, whether partial progress saves before auth — is written up in `docs/migrations/TODO-onboarding-account-linking.md`. **Nothing to build here yet** — flagging so client-side work doesn't assume this pipeline exists.

## 3. `feedback` / `notifications` tables — coach-dashboard only, not client-relevant

Two new tables (`public.feedback`, `public.notifications`) back the coach dashboard's header Feedback form and notification bell. Both are scoped `coach_id = auth.uid()` with coach-only RLS — there's no trainee-side read/write path, and nothing here should be touched from `TRACE-client`. Mentioned only for completeness in case the table names show up in a shared schema dump.

## Unchanged — still the contract

Everything in `docs/client-app-contract-check-ins-exercises.md` (check-in submission INSERT shape, exercise-library read-only access, the shared-Supabase-project/independent-sessions auth note) is still accurate and still the primary reference. This doc only layers on what changed since it was written.
