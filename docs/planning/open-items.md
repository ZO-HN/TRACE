# Open decisions and delivery priorities

Status: current planning register; not a claim of completed repairs. Owner: TRACE maintainers. Updated: 2026-10-31. Sources: [diagnosis](../qa/diagnosis-2026-10-31.md), feature specifications, prior handoffs/research credited in [sources](../sources.md), and the project-owner architecture discussion.

## Prioritized repair groups

| Order | Work | Finding IDs / acceptance owner |
| --- | --- | --- |
| 1 | Media entitlement, SDK preflight, upload/playback kind alignment, runtime validation | D01/D02/D05/D06/D22/D23; [coaching](../features/coaching.md) |
| 2 | Durable routed workout authoring, StrictMode lifecycle, atomic writes | D03/D04/D16; [training](../features/training.md) |
| 3 | Honest delivery boundaries and missing program/calendar/nutrition/vault bridges | D11-D15; affected feature specs |
| 4 | Visible error recovery, complete history/totals, AI credential/estimate safety | D17-D19; [nutrition](../features/nutrition.md), [AI](../features/ai.md) |
| 5 | Push preferences/tickets/inbox, role UX, native signing/provisioning and operational acceptance | D08-D10/D20/D21/D24/D25; [coaching](../features/coaching.md), [rollout](../operations/cross-app-rollout.md) |
| 6 | Measured caching/SQL/AI evolution | [Architecture proposal](architecture-evolution.md), including D07 |

Create scoped tasks with acceptance and evidence before implementation. Findings retain their IDs until a linked fix and relevant verification justify closure. No report-import action closes a finding.

D02 implementation update (2026-10-31): the three browser-facing Edge handlers now share the actual SDK header allowlist, with local handler/SDK regression coverage. [Evidence and remaining staging gates](../qa/edge-cors-2026-10-31.md) distinguish this source fix from deployment verification. Priority group 1 remains open, including media entitlement, supported kinds and runtime validation.

## Decisions requiring product ownership

- Food dataset/license and serving conversion/provenance; coach versus adaptive targets; whether/how personal goals/health summaries become coach-visible.
- AI is unavailable for V1 (owner decision, 7 November). Funding, opt-in data routing, provider/credential ownership, account isolation and retention/limits remain decisions for a future explicitly enabled release; earlier BYO-key code is retained inactive.
- Program/group updates automatically affect upcoming delivery; started/completed/offline work must retain its captured history (owner decision, 7 November). Standalone workout copies remain fixed. Full meal-plan publication is now locally implemented with dated immutable nutrition copies; remaining program/calendar implementation and hosted/native acceptance stay open. Preserve distinct personal-program models.
- Media ownership/finalization/deletion/retention policy and permitted coach access after relationship changes.
- Native release identity/signing/distribution, supported app versions, EAS/webhook provisioning, privacy/terms destinations, and backup/restore responsibility.
- Wearable platforms/import deduplication, gym equipment overrides versus location directory, solo entry, and video calling. These are separate scope, not implicit baseline requirements.

## Retained scope constraints

Barcode scanning and Train Together real-time coaching were excluded in the August product decisions. Coach invite-email delivery was previously removed by owner direction; do not restore it from historical UI text. Native wearable ingestion, billing and solo-mode expansion need explicit scope decisions. Manual step entry does not satisfy wearable ingestion. A display value does not establish a billing system.

Older tag-assignment and missing-table claims are superseded by newer source/diagnosis evidence: inspect existing features before rebuilding them. Clarify the purpose of `coach_extensions` / `coach_trainee_relations` before considering schema deletion. Retain per-set versus standalone media, primary/secondary muscle semantics, and allowed profile/review writes during refactors.

Use the task board for active status and [release evidence](../templates/release.md) for verification/deployment. This register holds unresolved decisions and priority rationale.

Current assigned work and paired dirty-tree evidence are recorded on the [implementation board](implementation-board.md). That board does not certify a frozen release candidate.
