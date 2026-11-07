# Shared data and access contract

Status: current contract with diagnosed integration gaps. Owner: TRACE maintainers. Updated: 2026-11-01. Sources: all [canonical migrations](../../supabase/migrations), generated database types, SQL tests, and diagnosis. Exact columns/policies/functions are defined by code; inspect all migrations rather than relying on an early migration alone.

## Ownership and writes

| Data | Writer / authorized readers | Semantics |
| --- | --- | --- |
| Profiles/coach relationship | Scoped profile edits; controlled allowlist/claim operations | Trainees cannot forge role/admin/coach linkage; mobile redirects coach-role accounts to the coach website/sign-out handoff |
| Exercises/muscles/templates | Authorized coach authors; reads according to RLS | Current catalog has authenticated shared reads; do not assume every catalog row is coach-private |
| Workout sessions/sets | Owning trainee; authorized connected coach review/read | Session snapshots use `sync_workout_session`; retry stable UUIDs; protect coach feedback |
| Nutrition logs | Owning trainee; authorized connected coach summaries | Historical macro snapshots; local pending overlay must deduplicate server echoes |
| Steps/cardio | Trainee; authorized coach summaries | Steps: `wearable_biometrics.step_count`; cardio: `cardio_entries`, not strength-session dual writes |
| Check-ins/form checks | Trainee submission; assigned coach review | Server derives coach; trainee cannot forge review state |
| Coach programs/plans/groups | Coach workspace ownership | Metadata does not establish trainee delivery; fixed private-workout copies are defined below |
| Personal programs/shares | Owning trainee; token-scoped join operation | `join_program_by_token` clones authorized private source content into recipient ownership |
| Messages/notifications | Authorized participants / scoped server operations | Preserve relationship restrictions; push is a separate delivery integration |

## Invited client onboarding

The `20261107000000_reliable_client_onboarding.sql` migration adds RPC-only, account-owned `client_onboarding_drafts` and additive submission/review metadata. `get_client_onboarding(p_invite_id)` resolves the active server invite, verifies trainee role and compatible coach relationship, and returns the frozen form/draft or the owner's completed receipt. Required name/email cannot be disabled. Existing submitted receipts can be read by their owner after revocation.

`save_client_onboarding(p_draft_id,p_expected_revision,p_answers)` accepts bounded partial answers, checks ownership/current invitation and uses optimistic revision checks. An unchanged replay of the immediately preceding save returns that revision. A stale conflicting save fails; reload explicitly before replacing edits.

`complete_client_onboarding(p_draft_id,p_operation_id,p_expected_revision)` validates all enabled answers and atomically saves profile name, invite-derived coach linkage, submitted snapshot and receipt. Keep the operation UUID and revision unchanged after an uncertain response. Exact replay returns the same response UUID; a different request cannot resubmit that draft. Client-supplied coach IDs are not inputs. The compatible legacy insert policy permits only the trainee's current linked coach and no forged review/operation fields.

`review_client_onboarding(p_response_id)` allows only the submission's coach to stamp review once. Existing owner/submitted-coach SELECT policies remain unchanged; reassignment/history and retention policy are not expanded. Drafts have no direct authenticated/anonymous table access. See [local implementation and remaining acceptance](../qa/onboarding-workflow-2026-11-07.md).

## Saved meals and published nutrition plans

`save_personal_meal(p_operation_id,p_template_id,p_user_id,p_name,p_items)` requires the authenticated trainee to match the captured user, validates existing meal-template storage bounds, and creates the parent, ordered item snapshots and private retry receipt atomically. Items supply stable UUIDs. Exact replay returns the original template; changed content/ownership fails and deletion is not undone by replay. The mobile pending request is persisted per account before sending, including IDs and original content, to support recovery after response loss/restart.

`publish_meal_plan(p_operation_id,p_assignment_id,p_coach_id,p_plan_id,p_trainee_id,p_start_date,p_expected_data)` checks the actual coach, linked recipient and unchanged draft, locks and snapshots authorized foods, and creates an immutable dated publication. Each food's explicit serving label and numerical quantities are retained; later draft/catalog edits do not recalculate publications or intake. Normal clients have read-only publication access, excluding raw source-builder data. Existing standalone workout copy policy and the newly selected automatic program/group update policy are separate from this explicit nutrition publication.

`get_current_meal_plan(p_trainee_id,p_date)` requires the owning trainee and returns only the safe snapshot from their current coach. The newest start date not later than the selected local date wins, with publication time/ID ties deterministic. Listed days run once from the start; ended plans do not silently repeat or revert to an older one. Future publications start on their selected date. Trainees retain their own publication history; former coaches cannot read it after the relationship ends. New publication never marks food eaten. [Nutrition delivery record](../qa/nutrition-delivery-2026-11-07.md) owns precise bounds, rounding, checks and acceptance gaps.

## Check-in payload

Submit as the signed-in trainee with `client_id`, permitted `template_id`, `status: 'submitted'`, `scheduled_for`, `submitted_at`, and validated `responses`. Omit `coach_id`: the server derives it and rejects an unlinked trainee. Read only allowed templates for the current coach. Coach review/status fields are not trainee-writable.

Standalone `form_checks.video_key` is distinct from `set_logs.form_video_s3_key`. Both use registered ownership, readiness and current relationship checks in the local read handler. Follow the [media contract](../../supabase/functions/r2-presign/README.md) for immutable verification, attachment RPC receipts and staging acceptance; local checks do not certify hosted playback.

## Compatibility and consistency

### Private coach workout creation

`save_workout_template(p_operation_id uuid, p_template_id uuid, p_creator_id uuid, p_name text, p_description text, p_items jsonb)` creates one active `PRIVATE` template with no assignee. The authenticated identity must match `p_creator_id` and have coach role. Each item supplies a real `exercise_id`, contiguous 1-based `position` in array order, `target_sets` (1-20), `target_reps` (1-100), nullable integer `target_rpe` (1-10), and `rest_seconds` (0-600). Repeated exercise IDs remain valid at separate positions. Parent, items and retry receipt commit in one transaction or all roll back.

Keep operation/template UUIDs stable across retries. `workout_template_save_operations` binds them to the creator and normalized request; clients cannot directly read or mutate receipts. A matching replay returns the existing template UUID. Reusing either identity to replace different content/ownership fails; the RPC never updates an existing template. Receipts survive template deletion so a retry cannot silently recreate a deleted workout; such a retry reports unavailable. The UI retains these IDs only within its mounted editor session, not across browser reloads.

This additive migration leaves personal-program/sharing writes and performed session/set records unchanged. It does not add target load or universal transactional enforcement for older writers. Deploy each required migration before shipping its route; generate both clients' types through the existing generator. See [private-authoring evidence](../qa/private-workout-authoring-2026-11-01.md).

### Fixed private-workout assignment

`assign_workout_template(p_operation_id uuid, p_assigned_template_id uuid, p_source_template_id uuid, p_coach_id uuid, p_trainee_id uuid, p_expected_snapshot jsonb)` creates a separate `ASSIGNED` template and ordered item snapshot from one active `PRIVATE` template owned by the authenticated coach. The trainee must currently be linked to that coach. Snapshot fields are name, description, exercise ID, position, target sets/reps/RPE and rest seconds. The operation receipt and copy commit atomically; the receipt table is inaccessible to clients, and parent/item triggers reject direct forged creation and mutation/deletion of assigned copies. A matching operation retry returns the same assigned template ID; changed request/content fails. Later source edits require a new explicit assignment, preserving earlier assigned versions and performed session references.

TRACE-client selects the exact assigned template ID and carries each item position into logger set IDs, so repeated exercises remain distinct during queued-draft recovery. Assignment currently creates no notification; trainees find the assigned workout in their existing workout library. These are local implementation and automated-test boundaries only. Hosted Auth/PostgREST role grants, current-link concurrency, web browser flow, authenticated mobile transport/device behavior, and deployment remain unverified; apply the migration and verify both roles before release.

### Shared compatibility rules

Coach program delivery: `save_coach_program` publishes bounded stable day slots under an expected head revision. `set_coach_program_delivery` configures one linked trainee or owned group/start date, with revision/receipt checks; nullable recipient parameters have SQL defaults and clients omit the unused one. `get_coach_program_schedule` returns bounded current date-only metadata without making workout copies. `open_coach_program_workout` is trainee-owned, checks current source/delivery/revision, and issues or reuses an immutable assigned copy only on explicit open. Stable mobile open operations are persisted before the RPC. Existing session/draft/outbox contracts remain the performed-data boundary; old copies/receipts survive removal and deletion. `delivery_kind` distinguishes program copies from standalone list/default selection. [Program contract/evidence](../qa/live-coach-programs-2026-11-08.md) owns source deduplication, exact retry, history, offline and rollout limits.

One-off calendar: `schedule_coach_workout` wraps the immutable assignment and calendar event in one transaction. `change_coach_calendar` binds a stable operation to event/revision/date/cancellation. Direct client writes are denied; trainee-owned reads and current original-coach reads are scoped by RLS. Cancellation retains copies and performed/offline work, and dates are planning labels rather than access restrictions. Client selects omit the private `request` field. See [calendar contract/evidence](../qa/coach-calendar-2026-11-08.md) for exact offline, cache and pending-ID boundaries. This does not implement live program/group revisions.

Both clients use public Supabase configuration and independent sessions. Authorization is enforced on the backend, not by which UI calls it. Generated types do not prove all manually cast query/payload shapes. Canonical schema changes live only in TRACE; generated type files in both repositories must match.

Add fields/functions compatibly before shipping clients that require them. Released phones can remain on old versions; remove old behavior only after an explicit support/deprecation decision. Aggregate writes require transactional RPCs or a documented failure-recovery strategy. Idempotent IDs prevent duplicate retries but do not resolve every cross-device edit conflict: define revisions/conflict policy for mutable records.

Define canonical units, display conversion/rounding, event timestamps versus local calendar dates, and ownership of derived summaries in the relevant feature specification. Preserve historical values and explicit errors for unauthorized/missing/failed data.

## Verification

From TRACE run `npm run test:db`, `npm run db:types:check`, and `npm run test:contracts` against the intended companion revision. Generate updated types with `npm run db:types` after schema edits. Contract-name checks cover literal table/RPC references; add payload/permission tests for changed semantics. Then run [shared acceptance](../qa/cross-app-acceptance.md) through real Auth/data API/media transports.
