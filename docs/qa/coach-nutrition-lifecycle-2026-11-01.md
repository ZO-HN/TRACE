# D04 scoped repair: coach nutrition hook lifecycles

Status: locally implemented and web-verified; browser/staging acceptance remains open. Owner: TRACE maintainers / delivery planning. Updated: 2026-11-01 11:31 SGT (UTC+08:00). Sources: current hooks, [actual-hook regression tests](../../tests/hooks/coachNutritionLifecycle.test.ts), [D04 diagnosis](diagnosis-2026-10-31.md#d04--p1-in-development--strict-mode-permanently-invalidates-mounted-flags), and [nutrition requirements](../features/nutrition.md#coach-food-meal-and-meal-plan-lifecycle).

## Candidate and dirty-tree boundary

TRACE HEAD `06675347e6b13085750cf319c3b66ffde4a6954e`, branch `codex/edge-cors-contract`; TRACE-client HEAD `774ab9df80d423d76f4d5d5c134ba731d10339a9`, branch `codex/trace-reliability`. Both checkouts already contained extensive uncommitted implementation/docs and unrelated thesis work. This evidence describes the later dirty web sources, not HEAD alone or a frozen paired release.

The prior [local candidate](local-candidate-2026-11-01.md), ID `trace-local-20261101-1115-sgt`, remains unchanged and **NOT PRODUCTION READY**. Its archived source/build bytes and successful 254-web/412-mobile/16-SQL checks belong to that selected-source snapshot only. The hooks, tests and owning requirement update here are subsequent work and are not certified by that earlier record. No archive or candidate evidence was edited, overwritten or relabeled. Six protected SHA-256 values were checked before/after this task: candidate manifest, checksum list, selected-source ZIP, coach-production ZIP, Expo-web ZIP and the candidate QA document.

## Scope and acceptance

Reserved application files: [useFoods](../../src/hooks/useFoods.ts), [useMeals](../../src/hooks/useMeals.ts) and [useMealPlans](../../src/hooks/useMealPlans.ts), plus the new focused test. The existing lifecycle harness was reused unchanged. No cache library/module was extracted. No roster/auth/cache/private-authoring/media/AI source, mobile source, schema, generated types or manifest was changed. Only the owning nutrition requirement, this evidence and the consolidated board accompany the hook repair.

Fresh tests reproduced the cleanup-only mounted-ref bug, stale account results and unhandled transport failures. The repaired hooks provide:

- A separate scope per effect setup, including StrictMode replay and A to B to A transitions. Cleanup invalidates the scope; late/unmounted completions cannot apply state.
- Coach-tagged visible rows/error so a switch hides prior-account data immediately, including the render before the new effect runs.
- A request sequence within each setup so only its latest read can replace rows or settle loading. Failed refreshes retain only same-coach rows with an error.
- Caught returned, synchronously thrown and rejected reads, with an additive `refresh()` method for read recovery. No routed retry control was added in this hook-only scope.
- Existing create/delete methods and payload/default behavior, with caught mutation failures returned as `{ error }`. Stale callbacks cannot start another account's operation. Successful writes refresh only their originating still-active setup.

The read tables, column lists, `coach_id` filter and descending creation order are unchanged. Create payloads retain existing nullable-string, number-conversion and default-name behavior; delete methods retain their ID filter. No new serving/numeric validation policy, coach-to-trainee nutrition-plan delivery, assignment semantics or target policy is introduced. Server authorization remains authoritative. Account switching does not cancel or roll back an already sent operation; a committed write remains successful if a subsequent reload fails, with the reload failure exposed separately.

## Actual checks

Commands ran sequentially against installed dependencies in TRACE on 1 November SGT. No dependency install or clean restore was performed.

| Check | Actual result | Evidence / boundary |
| --- | --- | --- |
| `npm test -- tests/hooks/coachNutritionLifecycle.test.ts` before repair | Exit 1; 54 failed, 16 passed; 9 unhandled errors | [Before](evidence/coach-nutrition-lifecycle-2026-11-01/regression-before.txt). Includes intended retry/API and stale-operation acceptance cases, not 54 independent product defects. |
| Same focused command after hook repair | Exit 0; 70 passed | [Focused pass](evidence/coach-nutrition-lifecycle-2026-11-01/regression-after.txt). Final aggregate run also includes the later fixture-name correction. |
| Initial aggregate lint | Exit 1; three rules-of-hooks errors in new anonymous test wrappers | [Initial lint](evidence/coach-nutrition-lifecycle-2026-11-01/web-lint.txt), [initial command results](evidence/coach-nutrition-lifecycle-2026-11-01/results.json). Fixed by naming test hook wrappers; no rule suppression or production-code change. Initial test/build commands had passed. |
| Final `npm test` | Exit 0; 21 files, 324 tests | [Web tests](evidence/coach-nutrition-lifecycle-2026-11-01/final-web-test.txt); includes all 70 cases against final fixture names. |
| Final `npm run lint` | Exit 0; five existing Fast Refresh warnings | [Lint](evidence/coach-nutrition-lifecycle-2026-11-01/final-web-lint.txt); AppShell (two), toast, field and badge. |
| Final `npm run build` | Exit 0; JS 1,093.52 kB / 306.82 kB gzip; chunk-size warning | [Build](evidence/coach-nutrition-lifecycle-2026-11-01/final-web-build.txt); TypeScript/Vite, not browser acceptance. |

[Final exit codes/timestamps](evidence/coach-nutrition-lifecycle-2026-11-01/final-results.json) and [source fingerprints](evidence/coach-nutrition-lifecycle-2026-11-01/source-fingerprints.json) identify the three hooks, test and unchanged harness. The controlled harness executes the actual hook source with mocked React lifecycle scheduling and Supabase operations. Cases cover replay, A/B out-of-order reads and errors, A/B/A reuse, unmount, returned/thrown/rejected reads and writes, retry/latest-refresh ordering, same-account stale-data retention, late creates/deletes, stale action callbacks, empty owner/empty results, unchanged query/payload contracts, and committed writes with failed reloads. This is not an actual React renderer, browser, Auth, RLS or network test.

`node scripts/check-documentation.mjs` passed (exit 0); `git diff --check` passed (exit 0). A scoped final-newline/trailing-whitespace check also passed for all seven changed source/test/requirement/board/evidence files, including untracked files. [Preservation results](evidence/coach-nutrition-lifecycle-2026-11-01/preservation.json) confirm unchanged tested source/harness fingerprints and six protected candidate/evidence hashes, preserved pre-existing paths/statuses, unchanged mobile work and empty indexes. No mobile, SQL, generated-type, shared-contract suite, Expo export or candidate rebuild was run for this web-only repair.

## Remaining acceptance and release

Verify the three routed coach workspace flows in a real StrictMode browser with dedicated staging coaches: initial load, create/delete/reopen, failed read/retry, account switching and delayed mutation completion. Confirm real backend ownership separately. Existing callers' mutation-error presentation and new retry controls were not redesigned. Other affected hooks keep their own D04 gaps; this repair does not close D04 globally. The independent coach-to-trainee nutrition-plan/target bridge (D14), saved-meal atomic/restart recovery and wider nutrition acceptance remain open.

No migration, Edge deployment or mobile release is required by these hook changes. Any later authorized web release must pin and verify its selected bytes, respecting the [rollout](../operations/cross-app-rollout.md). D01 remains unimplemented; current-coach historical standalone form-check access is approved policy, while legacy-media handling and immutable-versus-live assignment remain unanswered. Live/staging/native/signing and broader release gates remain open on the [current board](../planning/implementation-board.md). No commits, pushes, deployments, new chats/agents/automations, cross-chat messages or live actions were performed.
