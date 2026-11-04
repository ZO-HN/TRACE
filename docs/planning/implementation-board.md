# TRACE current implementation board

Status: **private pilot selected; local baseline passed; pilot release blocked by implementation and live/native acceptance**. Owner: TRACE maintainers / delivery planning. Updated: 2026-11-04 16:11 SGT (UTC+08:00). Sources: coordinator instructions and [4 November V1 readiness](../qa/v1-readiness-2026-11-04.md), which owns detailed findings, feature boundaries and acceptance criteria. This board records current reservations, not deployed readiness.

## Current local baseline

Verification ID **`trace-20261104-160348-sgt`** completed at **2026-11-04 16:07:20 SGT** with **PASS / source_stable**: 597 web tests, 412 mobile tests, 16 SQL scenarios, web lint/build, both generated types, contracts, mobile typecheck and documentation passed. Five existing lint warnings and the bundle-size warning remain. Logs, results and selected-source manifests are external at `C:\Users\imint\.codex\local-verification\trace-20261104-160348-sgt`. These are Release acceptance's executed results, inspected through the readiness record; this board-only update reruns no application checks.

| Checkout | HEAD ancestry / branch | Evidence boundary |
| --- | --- | --- |
| TRACE | `06675347e6b13085750cf319c3b66ffde4a6954e` / `codex/edge-cors-contract` | Extensive dirty web/backend/docs sources; baseline covers its selected bytes before the newly assigned repairs |
| TRACE-client | `774ab9df80d423d76f4d5d5c134ba731d10339a9` / `codex/trace-reliability` | Extensive dirty mobile sources; repeated-exercise recovery is a subsequent assigned change |

The build used fixture backend settings. Passing local checks do not establish authenticated hosted behavior or an accepted pilot artifact. HEADs alone do not identify dirty source bytes; preserve the external verification identity and record later repairs separately. The [1 November archived candidate](../qa/local-candidate-2026-11-01.md) remains historical and unchanged; neither its archive nor its evidence is relabeled as certifying 4 November or later bytes.

## Approved scope and policies

- **Private pilot:** selected coaches and trainees. Feature exclusions require explicit agreement; security and the core assign/log/reopen/review journey remain acceptance requirements.
- **Fixed-copy workout assignments:** assignment preserves the copied prescription. Future changes require an explicit update; editing the source must not silently change the assigned copy or performed history.
- **Legacy media:** block newly issued viewing links for unregistered objects until ownership is verified or the user reuploads. Preserve historical records and pending data; do not invent ownership or equate hidden UI with endpoint security.
- **Historical standalone form checks:** the current coach may receive new viewing links; after reassignment the former coach loses newly issued link access. Already issued bearer links expire normally.

These decisions are approved policies, not completed media/assignment implementations. D01 remains open until trustworthy registry/attachment/URL entitlement and relevant acceptance are demonstrated. Shared AI funding/provider/data-routing decisions remain separate; no broad infrastructure redesign or competitor parity is implied. See [open items](open-items.md) and [target architecture](architecture-evolution.md).

## Active ownership and verification reservations

| Existing local chat | Task ID | Current reservation |
| --- | --- | --- |
| TRACE — Media authorization | `01a191e0-b911-70a3-9e8d-5521d28bf59f` | **Sole canonical schema/generated-type writer.** Owns D01 media registry, attachment and URL-handler enforcement, current-coach form-check repair, affected generated types, and assigned web/SQL verification. Preserve released-client compatibility |
| TRACE — UI | `01a191d9-59fb-7570-8ce9-2a9347c94d04` | Only repeated-exercise `activeDraft` recovery using persisted occurrence/log identity and its mobile checks/evidence; preserve pending records and account/session/template isolation. No schema/type or web/SQL overlap |
| TRACE — Durable workout authoring | `01a191e0-c7a3-7e11-b4f0-a2ce51984666` | **Read-only fixed-copy implementation design.** Wait for explicit schema ownership transfer from Media before implementation/schema/type work; existing private-save evidence remains separate from assignment delivery |
| TRACE — Release acceptance | `01a191e1-0b2d-7a23-ab84-f0f9fcdd422c` | Idle after completed stable local baseline report; retain exact manifests/logs and later candidate/gate evidence boundaries |
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

1. Follow [current V1 findings and exact acceptance boundaries](../qa/v1-readiness-2026-11-04.md#fresh-source-review-findings-and-current-work): D01 includes writable set-video/avatar references and the historical form-check access mismatch; the assigned mobile repair addresses repeated-exercise recovery ambiguity. Other newly reviewed mobile/coach gaps remain in that record, not silently included in these reservations.
2. Media completes its bounded registry/attachment/current-coach repair and records actual checks, then explicitly transfers schema/type ownership for one fixed-copy assignment journey. Original UI records the newer recovery source/check boundary. The 16:07 baseline does not certify those future edits.
3. Reverify changed paths and stabilize an exact paired candidate. With separate staging authorization, exercise the [minimum useful coaching V1 journey](../qa/v1-readiness-2026-11-04.md#minimum-useful-coaching-v1) using two coaches/two trainees through real Auth/data API/Edge/R2; record deployed versions and denials.
4. Test the exact signed native pilot artifact: sign-in/link, cached prescription, durable food/set save, force-quit/reopen, reconnect/deduplicated coach visibility and account switching. Signing/identity/distribution, Deno/runtime, media finalization/kinds, operational restore/monitoring and explicit feature exclusions remain release gates in the readiness record.
5. A separately approved pilot release follows [cross-app rollout](../operations/cross-app-rollout.md), compatible schema/RPC-before-client ordering, older-client support and recovery procedures. Planning, local passes and approved policy choices authorize no live migration, deployment or publication by themselves.

No application checks, source/schema/generated-type changes, commits/pushes, live operations or archive changes were performed by this board update. **Local verification passed; deployed pilot readiness remains unaccepted.**
