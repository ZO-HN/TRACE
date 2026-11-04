# Cross-app acceptance

Status: maintained checklist; scenarios are not marked passed by documentation edits. Owner: TRACE maintainers. Updated: 2026-10-31. Sources: existing SQL/outbox coverage, prior shared checklist and [diagnosis](diagnosis-2026-10-31.md). Feature-specific requirements are owned by [feature specs](../features/README.md).

## Preparation and automation

Use two dedicated staging coaches A/B and one trainee per coach. Follow [test-account setup](../../../TRACE-client/docs/qa/test-account.md), allowlist coaches deliberately, and claim/link trainees explicitly. No default coach is assumed. Record both app revisions/dirty state, backend migration/functions, account roles/relationships, device/OS/network, and expected/observed results.

From TRACE run `npm test`, `npm run lint`, `npm run build`, `npm run test:db`, `npm run db:types:check`, `npm run test:contracts`, and `node scripts/check-documentation.mjs`. From TRACE-client run `npm test` and `npm run typecheck`. Local SQL/mocks/types establish only their tested boundaries; they do not replace real Auth, RLS through the data API, Realtime, Deno, R2, AI or native tests.

## Scenarios

| Flow | Acceptance |
| --- | --- |
| Routed authoring/assignment | Coach saves ordered exercises/targets from the actual route, reloads, assigns, and trainee opens exactly that workout; unrelated trainee denied. Current builder gap stays open until this succeeds. |
| Offline cold start | Download real content, enable airplane mode, reopen, log sets/food, force quit/reopen, reconnect; records persist and arrive once for authorized coach. |
| Continuous delivery | Online enqueue drains without network toggling; the UI reflects local save and subsequent delivery distinctly. |
| Lost response/parent failure | Commit then lose the response; retry preserves one copy. A failed parent defers child sets without exhausting their retries. |
| Retry/storage failure | Five failures retain work for manual retry. Failed SQLite persistence does not report successful logging. |
| Account/role switch | B never sees/sends A's cache/pending records; A's records recover on return. Coach-role mobile entry receives the intended handoff; backend privileges remain protected. |
| Nutrition correctness | Whole-day totals include more than 50 records plus deduplicated pending entries; historical snapshots/date/unit semantics survive catalog edits and retries. |
| Cardio/steps | Known daily values appear in authorized coach summaries; deleting cardio reduces totals; week/midnight boundaries and unrelated-coach denial hold. |
| Check-ins | Submit a scheduled response using allowed template, review as assigned coach, reload as trainee; forged review/foreign-template writes fail. |
| Media | Per-set and standalone videos plus progress photos pass supported upload/playback paths. Deny known foreign key, forged attachment and unrelated account; verify reassignment/expiry. Test actual Edge preflight and bucket PUT separately. |
| Program copy | Join permitted private source by token with repeated/rest days; recipient owns usable copies even after source deletion. Missing/revoked tokens and malicious source selection fail. |
| Coach delivery bridges | Program/calendar/meal-plan/resource delivery reaches the intended recipient after reload with exact values and revocable access. Mark incomplete bridges failed/not run honestly. |
| Chat | Latest messages and older pagination work above 200 records; initial fetch/Realtime switching deduplicate and recover failures. |
| Notifications | Actual device registration/webhook/push-open work; preferences/quiet hours honored; invalid error tickets handled. Inbox reflects persisted authorized records. |
| AI | Apply [AI acceptance](../features/ai.md): honest coach availability, provider errors, credential isolation, reviewed estimates, and scoped actions if implemented. |
| Permissions | Direct role/admin/coach-link changes fail while allowed profile edits and claim operations succeed; positive access and unrelated-account denial are both recorded. |

Run the [mobile-specific checklist](../../../TRACE-client/docs/qa/mobile-acceptance.md) separately. Record pass/fail/not run per case with evidence using the [release template](../templates/release.md). A known blocked path cannot be signed off by fixture-only SQL success.
