# Shared data and access contract

Status: current contract with diagnosed integration gaps. Owner: TRACE maintainers. Updated: 2026-11-01. Sources: all [canonical migrations](../../supabase/migrations), generated database types, SQL tests, and diagnosis. Exact columns/policies/functions are defined by code; inspect all migrations rather than relying on an early migration alone.

## Ownership and writes

| Data | Writer / authorized readers | Semantics |
| --- | --- | --- |
| Profiles/coach relationship | Scoped profile edits; controlled allowlist/claim operations | Trainees cannot forge role/admin/coach linkage; coach-role mobile gate is an open UX finding |
| Exercises/muscles/templates | Authorized coach authors; reads according to RLS | Current catalog has authenticated shared reads; do not assume every catalog row is coach-private |
| Workout sessions/sets | Owning trainee; authorized connected coach review/read | Session snapshots use `sync_workout_session`; retry stable UUIDs; protect coach feedback |
| Nutrition logs | Owning trainee; authorized connected coach summaries | Historical macro snapshots; local pending overlay must deduplicate server echoes |
| Steps/cardio | Trainee; authorized coach summaries | Steps: `wearable_biometrics.step_count`; cardio: `cardio_entries`, not strength-session dual writes |
| Check-ins/form checks | Trainee submission; assigned coach review | Server derives coach; trainee cannot forge review state |
| Coach programs/plans/groups | Coach workspace ownership | Metadata does not establish trainee delivery; assignment bridges remain open |
| Personal programs/shares | Owning trainee; token-scoped join operation | `join_program_by_token` clones authorized private source content into recipient ownership |
| Messages/notifications | Authorized participants / scoped server operations | Preserve relationship restrictions; push is a separate delivery integration |

## Check-in payload

Submit as the signed-in trainee with `client_id`, permitted `template_id`, `status: 'submitted'`, `scheduled_for`, `submitted_at`, and validated `responses`. Omit `coach_id`: the server derives it and rejects an unlinked trainee. Read only allowed templates for the current coach. Coach review/status fields are not trainee-writable.

Standalone `form_checks.video_key` is distinct from `set_logs.form_video_s3_key`. Their current read handler does not support both correctly; follow [media contract](../../supabase/functions/r2-presign/README.md) and diagnosis before claiming playback works.

## Compatibility and consistency

### Private coach workout creation

`save_workout_template(p_operation_id uuid, p_template_id uuid, p_creator_id uuid, p_name text, p_description text, p_items jsonb)` creates one active `PRIVATE` template with no assignee. The authenticated identity must match `p_creator_id` and have coach role. Each item supplies a real `exercise_id`, contiguous 1-based `position` in array order, `target_sets` (1-20), `target_reps` (1-100), nullable integer `target_rpe` (1-10), and `rest_seconds` (0-600). Repeated exercise IDs remain valid at separate positions. Parent, items and retry receipt commit in one transaction or all roll back.

Keep operation/template UUIDs stable across retries. `workout_template_save_operations` binds them to the creator and normalized request; clients cannot directly read or mutate receipts. A matching replay returns the existing template UUID. Reusing either identity to replace different content/ownership fails; the RPC never updates an existing template. Receipts survive template deletion so a retry cannot silently recreate a deleted workout; such a retry reports unavailable. The UI retains these IDs only within its mounted editor session, not across browser reloads.

This additive migration leaves existing template/item policies, personal-program/sharing writes and performed session/set records unchanged. It does not add assignment/versioning policies, target load, or universal transactional enforcement for older writers. Deploy the migration before shipping the coach route that requires the RPC. Generate both clients' types through the existing generator. Full assignment/trainee delivery remains open; see [private-authoring evidence](../qa/private-workout-authoring-2026-11-01.md).

### Shared compatibility rules

Both clients use public Supabase configuration and independent sessions. Authorization is enforced on the backend, not by which UI calls it. Generated types do not prove all manually cast query/payload shapes. Canonical schema changes live only in TRACE; generated type files in both repositories must match.

Add fields/functions compatibly before shipping clients that require them. Released phones can remain on old versions; remove old behavior only after an explicit support/deprecation decision. Aggregate writes require transactional RPCs or a documented failure-recovery strategy. Idempotent IDs prevent duplicate retries but do not resolve every cross-device edit conflict: define revisions/conflict policy for mutable records.

Define canonical units, display conversion/rounding, event timestamps versus local calendar dates, and ownership of derived summaries in the relevant feature specification. Preserve historical values and explicit errors for unauthorized/missing/failed data.

## Verification

From TRACE run `npm run test:db`, `npm run db:types:check`, and `npm run test:contracts` against the intended companion revision. Generate updated types with `npm run db:types` after schema edits. Contract-name checks cover literal table/RPC references; add payload/permission tests for changed semantics. Then run [shared acceptance](../qa/cross-app-acceptance.md) through real Auth/data API/media transports.
