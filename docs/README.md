# TRACE documentation

Maintained: 2026-10-31. Owner: TRACE maintainers. This is the shared documentation entry point for TRACE web, TRACE-client mobile, and their backend. [Project overview](project-overview.md) explains the product; [development workflow](development/workflow.md) explains how work is delivered.

## Read by task

| Task | Authoritative document |
| --- | --- |
| Run an app | [Web README](../README.md), [mobile README](../../TRACE-client/README.md) |
| Direct a coding agent | [Web instructions](../AGENTS.md), [mobile instructions](../../TRACE-client/AGENTS.md) |
| Understand current implementation | [Architecture](architecture/overview.md), [diagnosis](qa/diagnosis-2026-10-31.md) |
| Change product behavior | [Feature specifications](features/README.md) |
| Change shared data/access | [Client contract](architecture/client-contract.md) |
| Change offline behavior | [Offline contract](architecture/offline-sync.md) |
| Understand technical choices | [Platform decision](architecture/decisions/0002-shared-platform.md), [media decision](architecture/decisions/0001-media-storage.md) |
| Improve performance or unify AI | [Architecture evolution proposal](planning/architecture-evolution.md) |
| Choose priorities | [Open items](planning/open-items.md), [implementation board](planning/implementation-board.md), [product scope](planning/product-vision.md) |
| Prepare the next development phase | [Working-copy baseline and commit plan](development/phase-baseline-2026-10-31.md) |
| Provision or release | [Backend](operations/backend-provisioning.md), [web](operations/web-deployment.md), [cross-app rollout](operations/cross-app-rollout.md), [mobile](../../TRACE-client/docs/operations/mobile-release.md) |
| Verify behavior | [Shared acceptance](qa/cross-app-acceptance.md), [mobile acceptance](../../TRACE-client/docs/qa/mobile-acceptance.md), [D02 Edge CORS evidence](qa/edge-cors-2026-10-31.md), [coach lifecycle verification](qa/remaining-coach-lifecycle-stage1-2026-11-01.md) |
| Inspect current UI routes and controls | [Source-verified UI navigation map](qa/ui-navigation-map-2026-11-05.md) |
| Inspect the frozen local candidate | [1 November local candidate evidence](qa/local-candidate-2026-11-01.md) |
| Review private workout assignment | [5 November assignment evidence](qa/private-workout-assignment-2026-11-05.md) |
| Assess the initial version-one release | [4 November V1 readiness](qa/v1-readiness-2026-11-04.md) |
| Inspect the latest work-in-progress GitHub checkpoint | [8 November synchronization evidence](qa/github-checkpoint-2026-11-08.md) |
| Review current pilot rollout gates | [6 November repairs and hosted preflight](qa/pilot-preflight-2026-11-06.md) |
| Review onboarding implementation and handoff | [7 November local workflow evidence](qa/onboarding-workflow-2026-11-07.md) |
| Review saved meals and coach nutrition delivery | [7 November nutrition delivery evidence](qa/nutrition-delivery-2026-11-07.md) |
| Review human-message recovery and V1 AI scope | [7 November messaging and AI evidence](qa/messages-and-ai-scope-2026-11-07.md) |
| Plan client workflow and missing-feature completion | [Client workflow completion plan](planning/client-workflow-completion-plan-2026-11-06.md) |
| Review program/calendar/group delivery design | [Program delivery design](planning/program-delivery-design-2026-11-07.md) |
| Review persisted one-off calendar delivery | [8 November calendar evidence](qa/coach-calendar-2026-11-08.md) |
| Plan private resource delivery | [Resource-vault delivery design](planning/vault-resource-delivery-design-2026-11-08.md) |
| Review verified uploads and recoverable attachments | [8 November media finalization evidence](qa/media-finalization-2026-11-08.md) |
| Review live coach program/group delivery | [8 November program delivery evidence](qa/live-coach-programs-2026-11-08.md) |
| Assess OpenGym exercise reuse | [OpenGym source and licensing review](research/opengym-integration-2026-11-07.md) |
| Choose exercise catalog sources | [Exercise datasets and visual-media shortlist](research/exercise-datasets-2026-11-06.md) |
| Respond to failures | [Operations and recovery](operations/recovery.md) |
| Create a spec/decision/release record | [Templates](templates/README.md) |
| Trace consolidated sources | [Source register](sources.md), [Android testing evidence](../../TRACE-client/docs/releases/android-testing-baseline.md) |

## Documentation rules

1. TRACE owns shared contracts, specifications, and backend procedures. TRACE-client owns device setup and native evidence. Link to the owner instead of copying its contents.
2. Describe current implementation in architecture; expected behavior in feature specs; unimplemented changes in proposals. A recommendation is not implementation evidence or authorization to change product scope.
3. Use `Proposed`, `Accepted`, or `Superseded` for decisions. Track implementation, automated verification, staging/device verification, and deployment separately.
4. Every substantive document identifies its owner, status/purpose, and relevant source/evidence. Date evidence and record both app revisions plus dirty-tree context. Never invent a test or deployment result.
5. Update affected docs in the same change as behavior. Use source files/manifests for exact dependency versions and generated schemas; prose explains semantics, boundaries, and rationale.
6. Keep active tasks in issues/a project board: Backlog, Ready, In progress, Review, Done. An open question becomes a task only after scope and acceptance criteria are set.
7. Consolidate unique decisions before deleting superseded material. The source register records provenance; current docs contain the maintained guidance. No duplicate original-text archive is maintained.
8. Run `node scripts/check-documentation.mjs` from TRACE after edits. It checks local Markdown links, anchors, and index reachability across both sibling repositories; it does not verify remote URLs or runtime claims.

Sibling links assume local `TRACE` / `TRACE-client` folders. Repository identities are [TRACE](https://github.com/ZO-HN/TRACE) and [TRACE-app](https://github.com/ZO-HN/TRACE-app); the mobile checkout is named TRACE-client. Hosted GitHub readers can use those repository links when sibling links are unavailable.
