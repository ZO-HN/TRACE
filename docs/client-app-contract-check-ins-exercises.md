# Client-app contract: check-ins & exercise library

This repo (the coach dashboard) only *reads* and *reviews* check-ins, and only
*authors* exercises/templates. The trainee-facing writes below belong in
`TRACE-client` (the mobile app) — this doc is the contract that repo needs to
follow so both sides agree on the same schema. Nothing here requires a code
change in this repo; it's the handoff for whoever builds the client-side
pieces. Schema source of truth: `supabase/migrations/20260805000000_check_ins.sql`
and `20260805000001_exercise_details.sql`.

## Check-in submission (trainee → coach)

The client app should INSERT into `public.check_ins` as the signed-in trainee:

```ts
await supabase.from('check_ins').insert({
  client_id: session.user.id,       // must be the trainee's own auth uid
  template_id: someTemplateId,      // optional, from check_in_templates
  status: 'submitted',
  scheduled_for: '2026-08-10',      // date this check-in was due
  submitted_at: new Date().toISOString(),
  responses: { 'question-id-1': 'answer text', 'question-id-2': 7 },
});
```

- **Do not set `coach_id`** — a `BEFORE INSERT` trigger (`set_check_in_coach_id`)
  stamps it from the trainee's own `profiles.coach_id` server-side. If the
  trainee has no coach assigned, the insert is rejected outright (raises an
  exception) rather than silently orphaning the row.
- RLS (`"Trainees can submit their own check-ins"`) only allows `client_id = auth.uid()` —
  a trainee can only ever submit on their own behalf.
- To read the coach's available templates first (so the app knows what
  questions to render): `select * from check_in_templates where coach_id =
  (select coach_id from profiles where id = auth.uid())` — allowed by
  `"Trainees can read their coach's check-in templates"`.
- A trainee can read back their own submissions (`"Trainees can read their own
  check-ins"`, `client_id = auth.uid()`), but cannot update or delete them —
  review/status changes are coach-only, on purpose (this repo's `useCheckIns.markReviewed`).

## Exercise library (read-only for the client app)

`exercises`, `muscle_groups`, and `exercise_muscles` are all readable by any
authenticated user (`auth.uid() IS NOT NULL`) — the client app can browse the
full catalog a coach built (name, category, exercise_type, movement_profile,
exercise_position, is_bodyweight, is_unilateral, coaching_cues, equipment_tags,
plus primary/secondary muscles via `exercise_muscles`) to render workout
detail screens. Writes to these three tables are coach-only
(`created_by_coach_id = auth.uid()` / a matching `exercises` row owned by that
coach) — the client app should never attempt to create or edit exercises.

Example read, mirroring `src/hooks/useExercises.ts`'s query shape:

```ts
await supabase
  .from('exercises')
  .select(
    'id, name, category, description, exercise_type, movement_profile, exercise_position, is_bodyweight, is_unilateral, coaching_cues, equipment_tags, exercise_muscles(role, muscle_group:muscle_groups(id, name))'
  )
  .eq('id', exerciseId)
  .single();
```

## Auth note

Both repos hit the same Supabase project with the same anon key pattern —
`createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken:
true } })`. Sessions are independent per device/app; a trainee logging into
the mobile app does not affect a coach's session in this web dashboard, and
vice versa — RLS is what actually scopes what each session can see, not which
app they're using.
