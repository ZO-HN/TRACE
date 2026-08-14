# QA testing guide: TRACE coach dashboard + TRACE-client together

For when both repos are open in the same chat/session so the full trainee ↔ coach loop can be exercised end-to-end.

Both apps hit the same Supabase project (`lfaxkrorjljdeefnafjb`) with independent sessions per device/app — RLS is what scopes visibility, not which app is open.

## Form check exercise-name join — verified fine, no longer a risk

`src/hooks/useFormChecks.ts` (coach dashboard) queries `form_checks` with an embedded join:
```ts
.select('id, client_id, exercise_id, video_key, status, coach_notes, submitted_at, reviewed_at, client:profiles!form_checks_client_id_fkey(first_name,last_name), exercise:exercises(name)')
```
The `exercise:exercises(name)` embed relies on PostgREST auto-detecting the single FK from `form_checks.exercise_id` to `public.exercises(id)`. Confirmed correct — there's exactly one FK path between those two tables (checked directly against the live schema), so this resolves fine. Still worth a quick visual check the first time a real form check with a real `exercise_id` comes through, just to be sure.

## Full write-direction contract reference

| Table | Client app (TRACE-client) | Coach dashboard (this repo) |
|---|---|---|
| `check_ins` | INSERT as trainee (`client_id = auth.uid()`) | SELECT + UPDATE (review/notes) |
| `check_in_templates` | SELECT own coach's templates | Full CRUD (author) |
| `form_checks` | INSERT as trainee (`client_id = auth.uid()`) | SELECT + UPDATE (review/notes) |
| `exercises` / `muscle_groups` / `exercise_muscles` | SELECT (any authenticated user) | Full CRUD (author) |
| `direct_messages` | INSERT/SELECT own conversations | INSERT/SELECT own conversations (symmetric 1:1) |
| `programs`, `roadmaps`, `vault_folders`, `training_groups`, `equipment`, `foods`, `meals`, `meal_plans` | **No access** — coach-only RLS | Full CRUD (author) |
| `notifications` | **No access** — coach-only RLS | Full CRUD (own) |
| `onboarding_responses` | — (trainee reads/inserts own rows once signed in via the onboarding wizard) | SELECT own trainees' rows |
| `client_invites` | — | SELECT own; writes only via `rotate_invite_link`/`revoke_invite_link` RPCs |

If a cross-repo test expects a trainee to read `roadmaps` or `meal_plans` (e.g. "client views their assigned meal plan in the app"), that's a **missing feature**, not a bug — RLS currently blocks it entirely. Flag it rather than assuming it should already work.

## End-to-end flows to test together

For each, one side does the write, the other confirms the read — that's the actual integration point, not just "does each app work standalone."

1. **Check-in loop**
   - Coach dashboard: create a check-in template (Check-ins → Templates → Create Recurring Check-in), any starter or blank.
   - TRACE-client: sign in as a trainee under that coach, confirm the template's questions render correctly (all `CheckInQuestion.type` values — `text`, `number`, `scale-5`, `scale-10`, `single-choice`, `multiple-choice`, `photo`, `time`, `bodyweight`, `progress-photo`, `measurement` — the client may not handle all of these yet, worth confirming which are actually implemented client-side vs. which fall back ungracefully).
   - TRACE-client: submit a check-in.
   - Coach dashboard: confirm it appears under Check-ins → Needs review with the right responses, mark it reviewed, confirm `coach_notes` persists.

2. **Form check loop**
   - TRACE-client: submit a form check with a video and an `exercise_id`.
   - Coach dashboard: confirm it appears in Form Checks, video plays via the R2 signed URL, exercise name resolves, mark reviewed with notes.
   - TRACE-client: confirm the trainee can read back `status` and `coach_notes` on their own submission (RLS allows SELECT, not UPDATE, on their own rows).

3. **Messaging loop**
   - Coach dashboard: Messages page, select a client, send a message.
   - TRACE-client: confirm the trainee receives it in real time (`direct_messages` + realtime).
   - Reverse direction: trainee sends, coach dashboard updates live.

4. **Exercise library consistency**
   - Coach dashboard: create an exercise with muscle groups tagged.
   - TRACE-client: confirm it shows up in the client's exercise browser with the same primary/secondary muscle data (read-only on that side).

5. **Roster / invite / onboarding loop**
   - Coach dashboard: Settings → Client onboarding screens → Generate Invite Link (or Clients → Invite Client → Share Link, which reads the same active link).
   - Open that link fresh (unauthenticated) — confirm the intro screen renders, sign in (email or Google), then confirm the wizard shows only the screens enabled in Settings, in the right order.
   - Complete the wizard. Confirm it writes a real `onboarding_responses` row and, if the trainee had no coach yet, actually attaches them to the inviting coach (`profiles.coach_id`) via `claim_coach_by_id` — this now creates a real account/link, it no longer dead-ends at a fake "thanks for reaching out" screen.
   - In Settings, click **Generate New Link** — confirm the previously-copied link now shows "this invite link is no longer valid" when opened. Click **Revoke** on a link with no replacement — confirm the same.
   - Separately: sign up a trainee directly in TRACE-client (however that flow currently works there — likely the "choose your coach" screen backed by `list_available_coaches`/`claim_coach_by_code`), and confirm the new client shows up in the coach dashboard's Clients page and Messages sidebar.

## General regression checklist (coach dashboard side)

Run `npm run test`, `npm run lint`, `npm run build` in the coach dashboard repo before and after any cross-repo QA session. If a cross-repo test reveals a bug, fix it there, then re-run all three before considering it resolved.
