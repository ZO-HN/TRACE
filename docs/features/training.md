# Training, exercise, and progress tracking

Status: private coach authoring implemented locally; assignment/scheduling integration remains incomplete. Owner: TRACE maintainers. Updated: 2026-11-01. Sources: workout/outbox modules, coach routes/template helpers, canonical SQL, diagnosis D03/D04/D11/D12/D15/D16/D18, and [private-authoring evidence](../qa/private-workout-authoring-2026-11-01.md).

## Outcome and boundaries

Coaches author usable prescriptions; trainees open the exact assigned workout, log performed sets, and retain progress. The routed `/workouts` page now creates and reloads private coach templates with ordered exercise IDs, sets, reps, optional integer RPE and rest seconds. It uses the transactional `save_workout_template` RPC and reads persisted parent/items; repeated exercises and zero rest are supported. Target load is not available in the current template schema or this authoring slice.

Failed saves retain the editor input and operation/template UUIDs while the page remains mounted, including close/reopen of the builder. Matching retries recover the original save; a used ID with changed ownership/content is rejected rather than overwritten. After a lost response, retry unchanged first. Drafts and retry IDs are not persisted across navigation or a browser reload; inspect the reloaded library before recreating an uncertain save. Loading, empty, failed and saved states are distinct.

The route assigns an immutable fixed copy to one currently linked trainee using `assign_workout_template`. Matching operation/copy IDs make retries idempotent; source changes require another explicit assignment. See [assignment evidence](../qa/private-workout-assignment-2026-11-05.md) for local checks and outstanding hosted acceptance. The full coach-to-trainee journey in D03 remains open until real browser/device delivery is accepted. The calendar now persists dated one-off fixed copies, revision-checked moves and planned cancellation, with exact mobile schedule launch; [calendar evidence](../qa/coach-calendar-2026-11-08.md) states its verification and offline/access boundaries. D11/D12 automatic program/group delivery remains unfinished. Coach catalog `programs` and trainee personal programs remain distinct. Group metadata alone does not assign training.

The mobile Training screen discovers persisted active drafts for the signed-in account and offers `Resume <workout name>` links to the exact saved template ID, independently of the online workout library. Existing account/selection-scoped caches supply previously downloaded prescriptions offline; first use still requires a connection. Storage read failures show retry. Finish removes the draft after the session is durably queued and prevents the mounted logger from recreating it; opening again starts a new session. Invalid or foreign-owner drafts are retained but not offered. This source repair does not prove native restart or live sync acceptance.

## Behavior required for acceptance

Current local coach-program bridge (8 November): Programs now publishes ordered workout/rest-day revisions and explicit direct/group delivery with a shared start date. Calendar/Training read current metadata; an actual open atomically captures a reusable immutable prescription, preserving performed/offline history when program/source/membership changes. Ordinary program/group edits update future fresh opens automatically; standalone and one-off copies stay fixed. Personal programs remain separate. [Program evidence](../qa/live-coach-programs-2026-11-08.md) defines dates/catch-up, source deduplication, on-demand storage, receipts, offline limits, older-client behavior and remaining acceptance. Earlier D11/D12 absence statements describe the prior baseline, not this dirty implementation; hosted/device findings remain open.

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
