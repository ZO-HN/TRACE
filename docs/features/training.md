# Training, exercise, and progress tracking

Status: private coach authoring implemented locally; assignment/scheduling integration remains incomplete. Owner: TRACE maintainers. Updated: 2026-11-01. Sources: workout/outbox modules, coach routes/template helpers, canonical SQL, diagnosis D03/D04/D11/D12/D15/D16/D18, and [private-authoring evidence](../qa/private-workout-authoring-2026-11-01.md).

## Outcome and boundaries

Coaches author usable prescriptions; trainees open the exact assigned workout, log performed sets, and retain progress. The routed `/workouts` page now creates and reloads private coach templates with ordered exercise IDs, sets, reps, optional integer RPE and rest seconds. It uses the transactional `save_workout_template` RPC and reads persisted parent/items; repeated exercises and zero rest are supported. Target load is not available in the current template schema or this authoring slice.

Failed saves retain the editor input and operation/template UUIDs while the page remains mounted, including close/reopen of the builder. Matching retries recover the original save; a used ID with changed ownership/content is rejected rather than overwritten. After a lost response, retry unchanged first. Drafts and retry IDs are not persisted across navigation or a browser reload; inspect the reloaded library before recreating an uncertain save. Loading, empty, failed and saved states are distinct.

Assignment is explicitly unavailable on this route pending its versioning/delivery decision. The full coach-to-trainee journey in D03 remains open. The calendar still uses its separate memory library; D11/D12 program/group/calendar delivery is not implemented by private authoring. Coach catalog `programs` and trainee personal programs remain distinct. Group metadata alone does not assign training.

## Behavior required for acceptance

- Persist template plus items atomically with ownership-checked operations. Capture ordering, target reps/sets/load/rest and relevant exercise IDs; failure must not leave a falsely successful partial workout.
- Keep planned targets separate from performed values. Later template edits preserve performed history and explicit assignment/version semantics.
- Mobile awaits durable session/set saves; stable IDs, parent ordering, retries, draft recovery, account isolation, and timer behavior follow the [offline contract](../architecture/offline-sync.md).
- Use canonical load/duration representations from schema; convert kg/lb and duration units at explicit boundaries. Validate finite values and preserve intended fractional precision.
- Download actual exercises before offline use. A missing explicit assignment stays unavailable; no substitute/demo workout is selected.
- Paginate history and load recent records honestly. Define whether warm-ups/failed sets contribute to each metric before changing analytics; deterministic suggestions are labeled as such rather than AI inference.
- Cardio writes only `cardio_entries`; steps use daily `wearable_biometrics.step_count`. Manual steps are not automatic wearable ingestion.

## Acceptance

- [x] Routed private authoring has focused component/hook tests and canonical SQL tests for ordered prescriptions, retry IDs, ownership and rollback; see the evidence record for boundaries and remaining browser/staging checks.
- [ ] From the routed coach builder, save ordered items, reload, assign to a trainee, and open exactly those exercises/targets on mobile.
- [ ] Fail item persistence and verify an atomic failure or explicit recoverable state without an unusable saved parent.
- [ ] Complete a downloaded workout in airplane mode, kill/reopen the app, resume the timer/draft, then sync once and review as coach.
- [ ] Change templates after completion and verify performed values/history remain stable.
- [ ] Create a personal program with repeated/rest days, share by token, join, delete its source, and verify the private copy remains usable.
- [ ] Coach/group program delivery and calendar assignment survive reload and reach the intended trainee; these cases remain open until their bridge exists.
- [ ] Verify units, invalid inputs, account changes, StrictMode setup/cleanup, and history beyond 200 sessions.

## Scope decisions

Automatic Health/Health Connect ingestion, richer set types/grouping, gym equipment overrides, and readiness summaries need separate scoped specifications. Product candidate notes are in [product scope](../planning/product-vision.md); no competitor parity claim establishes acceptance. A scheduling formula such as start date plus week/day offsets is a proposal until timezone, rescheduling, and recipient semantics are accepted.
