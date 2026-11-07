# TRACE current implementation board

Status: **private-pilot application completion in progress; release NOT READY**. Owner: TRACE maintainers / coordinator. Updated: 2026-11-08 SGT (UTC+08:00). Sources: the [completion plan](client-workflow-completion-plan-2026-11-06.md), [4 November V1 readiness](../qa/v1-readiness-2026-11-04.md), [5 November media entitlement](../qa/media-entitlement-2026-11-05.md), [5 November workout assignment](../qa/private-workout-assignment-2026-11-05.md), and [mobile recovery](../../../TRACE-client/docs/releases/workout-recovery-2026-11-05.md). This board separates local implementation, verification and deployed acceptance.

Current 7 November slice: reliable onboarding drafts/completion, coach questionnaire viewer/review and mobile same-email-code/role/waiting handoff are implemented locally. New schema is not deployed. [Owning evidence, checks and remaining plan phases](../qa/onboarding-workflow-2026-11-07.md). Do not inherit older candidate/APK acceptance for these bytes.

## Current completion work (7 November)

The coordinator owns integration and the aggregate check slot; canonical schema/type ownership is serialized as recorded below. Following the owner request to utilize existing chats, Writers are stopped for the owner-requested GitHub checkpoint. UI recovery tests were collected and coordinator repaired the GymLogger fixture and stale-target guards (13 focused renderer tests passed). Query caching completed bounded exercise browse/search (231 focused tests/scoped lint reported). Vault design and a migration exist, but the resource UI/end-to-end flow is incomplete and unverified; bodyweight settings error recovery is partial and lacks its planned focused cases. Media review stopped on a usage-limit error, so it is not an independent security signoff. Coordinator regenerated both type files after the checkpoint migration. No other SQL writer is active. No other reservation is implied. No commit/push/deployment was made. Preserve the dirty paired master trees and unrelated thesis/UI files.

| Plan part | Current boundary |
| --- | --- |
| Onboarding/identity/review | Implemented and locally checked; actual email/browser/native acceptance open |
| Saved meals/full nutrition publication | [Local delivery implemented](../qa/nutrition-delivery-2026-11-07.md); captured-day/precision/complete-week reads aggregate-verified; saved-meal recovery controls checked |
| Human messages | [Cursor history and exact send retry implemented](../qa/messages-and-ai-scope-2026-11-07.md); combined checks pass, hosted/realtime acceptance open |
| AI | Owner selected unavailable for V1; UI/provider/credential/Brain gates implemented and focused checks pass |
| Calendar | [Dated one-off assignments/moves/cancellation/exact mobile launch](../qa/coach-calendar-2026-11-08.md) locally implemented; 624 web / 40 SQL / 466 mobile and associated checks passed |
| Programs/groups | [Live revisions/direct/group delivery and on-demand immutable opens implemented locally](../qa/live-coach-programs-2026-11-08.md); 632 web / 47 SQL / 472 mobile and associated checks passed; hosted/device acceptance open |
| Media | [Actual-object verification/write-once V2, V1 sealing and recoverable attachments implemented locally](../qa/media-finalization-2026-11-08.md); 690 web / 54 SQL / 495 mobile and associated local checks passed; hosted/native acceptance open |
| Vault/resources | Resource/recipient delivery implementation assigned after media schema verification; folder audiences remain metadata |
| Notifications/push | Durable event/inbox and preference-aware dispatch completion pending; provider/device acceptance separate |
| Social | Owner selected private by default and explicit sharing to approved followers; real permitted feed pending |
| Exercise catalog | [OpenGym review](../research/opengym-integration-2026-11-07.md) complete; media not licensed for TRACE, no import performed |
| Operations/distribution | Hosted restore/migration/service acceptance open; owner deferred signing/device work until app completion |

Standalone workout copies retain their original fixed-copy policy. Automatic program/group updates are a distinct newly approved delivery model. Full meal plans use explicit dated publications; intake is never automatically marked eaten. AI unavailability is a V1 scope decision, not completed inference. No unrelated feature is closed by this table.

## Latest local checkpoint (8 November)

Owner-requested [GitHub synchronization checkpoint](../qa/github-checkpoint-2026-11-08.md): 690 web / 54 SQL / 495 mobile, lint/build/types/contracts/mobile typecheck/docs/whitespace passed. Source and documentation are work in progress, not a completed application or release. Vault delivery and bodyweight read/save safeguards remain partial; notifications/private social and external acceptance remain open. The old aggregates below remain historical.

## Historical local aggregate (5 November)

Current 6 November follow-up: nutrition queue-bound limits and account-scoped offline resume links are implemented, with a fix preventing finished drafts being recreated while allowing fresh edits on a retained screen. Final mobile checks: **443 tests/typecheck passed**; ARM64 testing APK rebuilt, development signature and ZIP alignment verified, dated copy preserved. [Current preflight](../qa/pilot-preflight-2026-11-06.md) owns exact hashes, checks and verified hosted configuration. Supabase CLI read access now works; six migrations are pending, deployed functions are older, no physical backups were returned, and no Android device is connected. Docker's Linux engine remained unavailable after one local launch attempt, so no backup/restore drill occurred. Vercel domain and public environment-key names are verified; no deployment occurred. The [exercise-source shortlist](../research/exercise-datasets-2026-11-06.md) is research only. The 5 November aggregate below does not certify later bytes.

Coordinator-reported paired worktrees: TRACE `master` at `b11fcab2d9282595c073b67ef5ce5bee5d87e668`; TRACE-client `master` at `9b123120bb8564e2522c1c15bc4acf4d78987449`. Scoped implementation changes remain dirty; unrelated thesis/revision files remain preserved. Do not treat HEAD alone as identifying the dirty source bytes.

Locally implemented and aggregate-verified, **not deployed**:

- **D01 media entitlement:** ownership/attachment checks, URL issuance entitlement, and current-coach policy for historical form checks; see [media evidence](../qa/media-entitlement-2026-11-05.md).
- **Fixed-copy private-workout assignment:** assignment and exact-ID mobile prescription loading, prescribed rest, and repeated-occurrence recovery; see [assignment evidence](../qa/private-workout-assignment-2026-11-05.md) and [mobile recovery evidence](../../../TRACE-client/docs/releases/workout-recovery-2026-11-05.md).
- **Original UI repeated-exercise recovery:** local implementation and assigned mobile evidence are complete; see the mobile recovery record.

Latest coordinated local results: **603 web tests, 23 SQL scenarios, 438 mobile tests**, lint/build, generated types, contracts, both application typechecks, documentation check (**56 Markdown files / 425 links**) and diff checks passed. Five existing lint warnings and the existing bundle-size warning remain. The initial SQL run passed 22/23 because an old fixture directly inserted `ASSIGNED`; after changing that fixture to call `assign_workout_template`, the full SQL rerun passed 23/23. No application source changed after the other aggregate suites. Release acceptance ran this aggregate slot but created no new immutable release artifact. These results do not establish live service or device acceptance.

## Current local baseline

Verification ID **`trace-20261104-160348-sgt`** completed at **2026-11-04 16:07:20 SGT** with **PASS / source_stable**: 597 web tests, 412 mobile tests, 16 SQL scenarios, web lint/build, both generated types, contracts, mobile typecheck and documentation passed. Five existing lint warnings and the bundle-size warning remain. Logs, results and selected-source manifests are external at `C:\Users\imint\.codex\local-verification\trace-20261104-160348-sgt`. These are Release acceptance's executed results, inspected through the readiness record; this board-only update reruns no application checks.

| Checkout | HEAD ancestry / branch | Evidence boundary |
| --- | --- | --- |
| TRACE | `b11fcab2d9282595c073b67ef5ce5bee5d87e668` / `master` | Current paired checkout; scoped dirty implementation/docs and unrelated thesis files preserved |
| TRACE-client | `9b123120bb8564e2522c1c15bc4acf4d78987449` / `master` | Current paired checkout; scoped dirty mobile implementation/evidence preserved |

The **4 November stable baseline** below is retained as a historical record for its selected bytes. The 5 November aggregate uses local fixture settings and is not a newly frozen candidate. Passing local checks do not establish authenticated hosted behavior or an accepted pilot artifact. HEADs alone do not identify dirty source bytes. The [1 November archived candidate](../qa/local-candidate-2026-11-01.md) remains historical and unchanged; neither archive nor its evidence certifies later bytes.

## Approved scope and policies

- **Private pilot:** selected coaches and trainees. Feature exclusions require explicit agreement; security and the core assign/log/reopen/review journey remain acceptance requirements.
- **Fixed-copy workout assignments:** assignment preserves the copied prescription. Future changes require an explicit update; editing the source must not silently change the assigned copy or performed history.
- **Legacy media:** block newly issued viewing links for unregistered objects until ownership is verified or the user reuploads. Preserve historical records and pending data; do not invent ownership or equate hidden UI with endpoint security.
- **Historical standalone form checks:** the current coach may receive new viewing links; after reassignment the former coach loses newly issued link access. Already issued bearer links expire normally.

These decisions are approved policies; the scoped media and assignment work is now locally implemented and aggregate-verified under the records above. This does not close hosted acceptance. Shared AI funding/provider/data-routing decisions remain separate; no broad infrastructure redesign or competitor parity is implied. See [open items](open-items.md) and [target architecture](architecture-evolution.md).

## Historical delivery ownership (5 November)

| Existing local chat | Task ID | Current reservation |
| --- | --- | --- |
| TRACE — Media authorization | `01a191e0-b911-70a3-9e8d-5521d28bf59f` | D01 ownership/attachment/URL entitlement and current-coach historical form-check policy are locally implemented and aggregate-verified; hosted acceptance remains open |
| TRACE — UI | `01a191d9-59fb-7570-8ce9-2a9347c94d04` | Repeated-exercise recovery is locally implemented and mobile evidence recorded; native device acceptance remains open |
| TRACE — Durable workout authoring | `01a191e0-c7a3-7e11-b4f0-a2ce51984666` | Fixed-copy private-workout assignment locally implemented and aggregate-verified; live compatibility/assignment acceptance remains open |
| TRACE — Release acceptance | `01a191e1-0b2d-7a23-ab84-f0f9fcdd422c` | Ran the latest local aggregate verification slot; no new immutable release artifact created |
| TRACE — Delivery planning | `01a191d6-27be-7521-a986-637d1da5b063` | This board only; documentation/board-whitespace checks. No application source, suite, schema, types or other shared-doc edits |
| TRACE — Nutrition UI / Query caching | `01a191e0-dcf2-7a83-9f24-a6f1bf73888c` / `01a191e0-eef5-7a02-947f-e5cd15e66069` | No new implementation reservation in this phase; retain earlier owner evidence |
| Production tutorial coordinator | `01a19168-35f2-7222-8461-5a845a0ae331` | Owns the new V1 readiness record/index, coordinates verification slots and explicit schema transfer; no other shared-document writer assigned |

Do not add competing schema/type writers or infer a transfer from completed tests. Preserve unrelated source/docs, stable IDs, pending local work, historical values and the archived candidate. No new chats, agents, automations or cross-chat messages are part of this board task.

## Completed evidence retained by scope

- Lifecycle/cache work: [roster](../qa/roster-lifecycle-2026-10-31.md), [coach nutrition hooks](../qa/coach-nutrition-lifecycle-2026-11-01.md), [remaining hooks / combined 597-test WEB run](../qa/remaining-coach-lifecycle-stage1-2026-11-01.md), and [AiChat](../qa/ai-chat-lifecycle-2026-11-01.md). The exact cleanup-only mounted-ref pattern was removed at all 16 original sites; browser/staging correctness and unrelated consumer races were not thereby certified. Cache fixture request counts are not latency results; chat remains placeholder inference.
- Backend/runtime/private authoring: [SDK CORS](../qa/edge-cors-2026-10-31.md), [Brain runtime](../qa/brain-runtime-2026-11-01.md), [R2 runtime](../qa/media-runtime-2026-11-01.md), and [private authoring](../qa/private-workout-authoring-2026-11-01.md). Runtime validation is not media entitlement; private atomic save/reload is not assignment delivery. Earlier private-save read-only review found no actionable issue only within its source-inspection boundary.
- [Nutrition acceptance](../../../TRACE-client/docs/releases/nutrition-acceptance-2026-10-31.md) retains the final per-occurrence parser repair and attributed 98-focused / 412-mobile-test results plus source/fingerprint review. Native durability and broader saved-meal/catalog/date acceptance remain separate.

Dated counts, interruptions, warning details and original test boundaries stay in their owning records rather than being recopied or relabeled here.

## Next acceptance gates

1. Review remaining findings and acceptance boundaries in [current V1 readiness](../qa/v1-readiness-2026-11-04.md); do not infer that the dated diagnosis or local repairs establish hosted correctness.
2. Keep the pilot **NOT READY** until live migration/deployment and hosted Auth/RLS/R2/Deno/PostgREST behavior, including concurrent PostgreSQL acceptance, are verified. No live migration or deployment occurred in this work.
3. Exercise the [minimum useful coaching V1 journey](../qa/v1-readiness-2026-11-04.md#minimum-useful-coaching-v1) in a controlled hosted environment with two coaches/two trainees; record deployed versions, authorization denials and recovery behavior.
4. Test on native devices with SQLite kill/reopen, offline sync, account switching, sign-in/link and reconnect behavior; complete signing and restore/monitoring acceptance for the exact intended pilot artifact.
5. A separately approved pilot release follows [cross-app rollout](../operations/cross-app-rollout.md), compatible schema/RPC-before-client ordering, older-client support and recovery procedures. Planning, local passes and approved policy choices authorize no live migration, deployment or publication by themselves. Keep AI funding/provider/data-routing decisions separate.

This board update changes no application sources and runs only the documentation checker and board whitespace review. No commit, push, live operation or deployment is part of this task. **Local milestones are verified; deployed pilot readiness remains NOT READY.**
