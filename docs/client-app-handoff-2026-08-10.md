# Handoff for TRACE-client: what changed on the coach dashboard this session

This is a status/contract update for whoever's working in the `TRACE-client` repo (the trainee-facing Expo app). It supplements `docs/client-app-contract-check-ins-exercises.md` (still the primary contract doc — read that first) with what changed since it was written, and flags what's *not* ready yet so client-side work doesn't get built against something that doesn't exist server-side.

Schema source of truth for everything below: the migrations in `supabase/migrations/`, specifically `20260809000000_check_in_template_schedule.sql`, `20260810000000_feedback_and_notifications.sql`, and `20260810000001_coach_workspace_features.sql` — **none of the three are applied to the live database yet** (see `docs/migrations/2026-08-10-final-session-migrations.md`). Don't build against these columns/tables until that push has actually run; check `npx supabase migration list` on the shared project first.

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

## 3. `notifications` table — coach-dashboard only, not client-relevant

A new table (`public.notifications`) backs the coach dashboard's header notification bell. It's scoped `coach_id = auth.uid()` with coach-only RLS — there's no trainee-side read/write path, and nothing here should be touched from `TRACE-client`. Mentioned only for completeness in case the table name shows up in a shared schema dump.

## 4. `form_checks` — new client-authored table (this is the one you need to build against)

The coach dashboard's Form Checks page (previously a static mock) now really reads and reviews `public.form_checks`. Same write-direction contract as `check_ins`: **the client app INSERTs as the trainee; the coach never writes this table.**

```ts
await supabase.from('form_checks').insert({
  client_id: session.user.id,     // must be the trainee's own auth uid
  exercise_id: someExerciseId,    // optional, references public.exercises
  video_key: 'r2/object/key.mp4', // the R2 key from your existing upload flow — same
                                   // presigned-upload pattern used for other media, see
                                   // docs/adr/0001-media-storage.md
  // status defaults to 'unreviewed', submitted_at defaults to now() — don't set them
});
```

- **Do not set `coach_id`** — a `BEFORE INSERT` trigger (`set_form_check_coach_id`) stamps it from the trainee's own `profiles.coach_id`, same pattern as `check_ins`. If the trainee has no coach assigned, the insert is rejected.
- RLS only allows `client_id = auth.uid()` on insert — a trainee can only submit their own form checks.
- A trainee can read back their own submissions (`client_id = auth.uid()`) including `status` and `coach_notes` once the coach reviews it, but cannot update them — review is coach-only, mirroring `useFormChecks.markReviewed` in this repo.
- The coach dashboard renders the video via the same signed-URL `MediaViewer`/`useMediaUrl` pattern already documented in `client-app-contract-check-ins-exercises.md` for other media — no new upload mechanism, just point `video_key` at wherever your existing R2 upload flow puts the file.

## 5. Other new coach-owned tables — not client-relevant

`programs`, `roadmaps`, `vault_folders`, `training_groups`/`training_group_members`, `equipment`, `foods`, `meals`, `meal_plans` are all coach-authored and coach-scoped (`coach_id = auth.uid()` RLS, no trainee access). Mentioned for completeness only — nothing for `TRACE-client` to build against here, at least not yet. If a future feature needs the client app to *read* any of these (e.g. a trainee viewing their assigned roadmap or meal plan), that would need an RLS policy change first — don't assume read access exists just because the table does.

## Unchanged — still the contract

Everything in `docs/client-app-contract-check-ins-exercises.md` (check-in submission INSERT shape, exercise-library read-only access, the shared-Supabase-project/independent-sessions auth note) is still accurate and still the primary reference. This doc only layers on what changed since it was written.
