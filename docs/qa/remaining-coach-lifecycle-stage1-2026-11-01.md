# Remaining coach-hook D04 repair: stage 1 and combined web verification

Status: **combined local WEB verification passed; browser/staging acceptance remains open**. Owner: TRACE maintainers / delivery planning. Updated: 2026-11-01 12:12 SGT (UTC+08:00). Sources: current reserved hooks/consumers, executed actual-hook regressions, [D04 diagnosis](diagnosis-2026-10-31.md#d04--p1-in-development--strict-mode-permanently-invalidates-mounted-flags) and coordinator stage-1 scope.

## Scope and source boundary

TRACE ancestry `06675347e6b13085750cf319c3b66ffde4a6954e`, branch `codex/edge-cors-contract`; companion ancestry `774ab9df80d423d76f4d5d5c134ba731d10339a9`. Both are extensive dirty working copies. This task changes only ten reserved hooks and two new focused test files, plus this narrow QA record/index link and the current board. Existing shared test harness and all unrelated application work are preserved. The parallel `useAiChat` task, its tests and AI specification belong to Query caching; none is edited here.

The [archived candidate](local-candidate-2026-11-01.md), ID `trace-local-20261101-1115-sgt`, and its dated evidence remain separate. No candidate archive, export, artifact set or manifest was created, overwritten, rehashed for recapture or relabeled. Earlier candidate/324-test web results do not certify these ten new hook implementations. No new paired or production-ready candidate is claimed.

Reserved hooks:

| Hook | Preserved special boundary |
| --- | --- |
| `useClientTags.ts` | Tag rows and assignment display are published together; successful state retained if either query fails |
| `useCoachAllowlist.ts` | No owner parameter/auth subscription added; isolation follows the actual admin-only consumer and AppShell removal/replacement lifetime |
| `useCheckInTemplates.ts` | Null/empty schedules still fall back to `DEFAULT_SCHEDULE`; existing create/update/delete payloads |
| `useExercises.ts` | Own-plus-seeded filtering, muscle mapping and parent-then-links write sequence preserved |
| `useEquipment.ts` | Existing list/create/delete query and nullable category behavior |
| `useInviteLink.ts` | No active invite remains successful `null`, distinct from read failure; unchanged rotate/revoke RPCs and screen payload |
| `usePrograms.ts` | Coach metadata CRUD only; no delivery/assignment implementation |
| `useRoadmaps.ts` | Existing client-name projection, fields and nullable payloads |
| `useVaultFolders.ts` | Folder metadata/visibility payload only; no resource delivery |
| `useTrainingGroups.ts` | Existing program/member-count projection and membership reload; separate member-ID/page-selection boundary below |

## Lifecycle and failure behavior

Nine owner-parameter hooks tag visible state with the coach. Account changes hide prior rows/errors immediately. Every effect setup gets an active scope, including StrictMode replay and A to B to A. Reads use a request sequence; only the latest response from the current scope can publish data or settle loading. Cleanup invalidates old scopes. Empty coach identities make no read/write calls. Recoverable reload errors retain complete successful same-account data and surface an error. An additive `refresh()` supports recovery without adding UI controls.

Mutation wrappers reject stale callbacks before constructing requests, catch returned/thrown/rejected failures, and reload only the originating still-active scope. A committed mutation remains successful if its reload fails, with a separate read error; switching accounts does not cancel or roll back already sent operations. Existing tables/RPC names, row/payload shapes, filters/defaults, server permissions, grants, invitation policy and multi-request transaction semantics are not redesigned.

Allowlist isolation is **not** an invented coach ID. [SettingsPage](../../src/components/pages/SettingsPage.tsx) conditionally mounts CoachAccessTab for a platform admin. The actual [AppShell](../../src/components/layout/AppShell.tsx) removes protected Outlet children while loading, signed out, failed, or non-coach; an admin-flag change removes the Settings tab. Fixtures execute the actual shell branches, assert the existing Settings condition, unmount the old no-argument hook and mount a fresh admin instance. Late reads/writes/stale callbacks from the removed instance cannot publish state or reload it. No second `useTraceUser` or auth listener is introduced. This is controlled branch/lifetime evidence, not a React-router/browser acceptance run.

## Compound and partial-write limits

- Tags and assignment maps form one successful state; errors do not combine a new tag list with an old map.
- Exercise creation still writes parent then muscle links. Returned/rejected link failures can leave a parent. If the account changes after parent creation, linking is stopped with an explicit warning that the exercise may already exist; no rollback is claimed. A complete exercise needing no links still reports successful creation and skips obsolete refresh. No atomic RPC/idempotent retry was added.
- Group membership writes refresh group counts only in the active owner scope. `fetchMemberIds` was not itself the cleanup-only D04 gate. It keeps its query/result shape and now catches rejected reads and discards obsolete-account returns. **TrainingGroupsPage's same-coach group-selection race remains:** its effect does not cancel/version `fetchMemberIds(group.id)` completions when the selected group changes. No page changes, error-presentation redesign or group-selection fix was absorbed here.
- Read/mutation recovery does not implement missing program/vault/group delivery or repair authorization. D01 remains open. Historical standalone current-coach access is approved policy awaiting implementation; legacy-media and assignment-versioning policies remain unanswered.

## Actual stage-1 checks

| Command / step | Result | Evidence |
| --- | --- | --- |
| `npm test -- tests/hooks/remainingCoachLifecycle.test.ts` on original hooks | Exit 1; initial 210-case corpus: 159 failed / 51 passed, 27 unhandled errors | [Owner-hook reproduction](evidence/remaining-coach-lifecycle-stage1-2026-11-01/before.txt) |
| `npm test -- tests/hooks/allowlistLifecycle.test.ts` on original hook | Exit 1; initial 17-case corpus: 15 failed / 2 passed | [Allowlist reproduction](evidence/remaining-coach-lifecycle-stage1-2026-11-01/allowlist-before.txt) |
| `npm test -- tests/hooks/remainingCoachLifecycle.test.ts tests/hooks/allowlistLifecycle.test.ts` after repair | Exit 0; 2 files / **246 tests passed** | [Final targeted run](evidence/remaining-coach-lifecycle-stage1-2026-11-01/targeted-final.txt) |
| `node node_modules/oxlint/bin/oxlint` with exactly the ten hook paths and two new test paths | Exit 0; no scoped warnings/errors | [Scoped lint](evidence/remaining-coach-lifecycle-stage1-2026-11-01/scoped-lint-final.txt), [exit codes/time](evidence/remaining-coach-lifecycle-stage1-2026-11-01/stage1-results.json) |

The final corpus extends the initial reproductions. Cases execute actual hooks, reusing [the unchanged controlled lifecycle harness](../../tests/hooks/hookHarness.ts), and cover replay, A/B out-of-order/A/B/A, immediate hiding, unmount, latest read and post-mutation refresh ordering, returned/thrown/rejected reads and every mutation method, failure recovery, stale callbacks, late completion, singleton/compound/partial-write semantics and preserved payload/filter/RPC cases. [Final source fingerprints](evidence/remaining-coach-lifecycle-stage1-2026-11-01/source-fingerprints.json) cover all ten hooks, both test files, unchanged harness and shell/consumer fixture sources. Supabase/React scheduling are controlled; no real Auth/RLS/renderer/browser transport is established.

`node scripts/check-documentation.mjs` passed (exit 0); scoped `git diff --check` and a final-newline/trailing-whitespace check over all 15 owned source/test/doc files passed. [Preservation results](evidence/remaining-coach-lifecycle-stage1-2026-11-01/preservation.json) record unchanged tested fingerprints/shared harness/consumer fixtures, unchanged mobile files, empty indexes and no removed pre-existing dirty paths. Parallel AiChat source/tests/AI-spec/evidence changes are attributed to that separate task and were not edited or verified here. **Stage-1 boundary at the time:** aggregate web suites, project-wide lint/typecheck, build, SQL/mobile suites, type generation, browser, exports and artifact/candidate capture were deferred. The subsequently authorized combined WEB checks below now provide aggregate web test/lint and TypeScript/Vite build results; they do not add mobile/SQL/browser/live acceptance.

## Combined eleven-hook WEB verification (2026-11-01 12:12 SGT (UTC+08:00))

The coordinator confirmed both targeted tasks idle and granted delivery planning the sole combined WEB slot. The ten hooks above were checked together with the separately owned [AiChat lifecycle](ai-chat-lifecycle-2026-11-01.md). No AiChat semantics, tests, harness, AI spec or recorded evidence were edited here. Its hook stayed at SHA-256 `2CBC540D3D5B8527587633C2A0DFD50B55798B8AD51EAC25743B24C345F8AE4B`. That record retains its stage-1 wording; this section owns the later combined results.

| Sequential command | Actual result | Evidence |
| --- | --- | --- |
| `npm test` | Exit 0; **24 files / 597 tests passed** | [Combined tests](evidence/remaining-coach-lifecycle-stage1-2026-11-01/combined/web-test.txt) |
| `npm run lint` | Exit 0; five existing Fast Refresh warnings | [Combined lint](evidence/remaining-coach-lifecycle-stage1-2026-11-01/combined/web-lint.txt); field, badge, toast and AppShell (two) |
| `npm run build` | Exit 0; TypeScript/Vite; main JS 1,105.74 kB / 308.77 kB gzip, chunk-size warning | [Combined build](evidence/remaining-coach-lifecycle-stage1-2026-11-01/combined/web-build.txt) |

[Command timestamps/exit codes](evidence/remaining-coach-lifecycle-stage1-2026-11-01/combined/results.json) identify this run. [Affected-source start hashes](evidence/remaining-coach-lifecycle-stage1-2026-11-01/combined/source-start.json) and [final snapshot](evidence/remaining-coach-lifecycle-stage1-2026-11-01/combined/source-final.json) show all 33 captured affected hook/test/config fingerprints stayed equal across verification. The final snapshot also lists every current web `src`/`tests` file (143 hashes) and both HEADs. The full web file list is a post-run snapshot; only the explicitly captured affected set has independent before/after equality. This is a combined dirty-source validation record, not a newly frozen paired candidate or deployable artifact set.

No compile/integration failure occurred, so no semantic integration fix or AiChat owner hand-back was needed. The existing tests cover admin-shell replacement and compound error retention; no concrete additional coverage gap requiring another renderer run was identified. The AiChat owner separately reported 27 focused tests and five controlled actual-React probe cases (paired React/renderer 19.2.3 versus web React 19.2.7); those are attributed in its record, not rerun or presented as browser acceptance here.

### Original D04 source-pattern audit

[Per-site audit](evidence/remaining-coach-lifecycle-stage1-2026-11-01/combined/pattern-audit.json) checked all **16 original HEAD sites**: useClients; useFoods/useMeals/useMealPlans; the ten hooks in this record; useAiChat; and useTraceUser. All sixteen initialized `mountedRef` with true at HEAD. None retains that exact pattern in the current source. The only remaining mountedRef is auth's `useRef(false)`, with true restored in effect setup, false in cleanup and request/identity guards. The eleven new scopes/generations replace the old cleanup-only gates; roster/nutrition/auth had earlier scoped repairs.

This closes the **exact source-pattern defect at those sites locally**, not all D04/browser behavior, all concurrency bugs or all product findings. AiChat's old flag affected New's session selection rather than proving its initial history always hung. TrainingGroupsPage's group-selection race, multi-request exercise partial writes and live role/account/browser behavior remain distinct open boundaries. No program/vault/group delivery or AI inference was implemented.

### Scoped encoding correction and preservation

A byte-aware scan was limited to the task-owned ten hooks, two test files and their own QA/board/index files. It found task-introduced UTF8-as-cp1252 em-dash/arrow sequences in comments in five hooks and in board chat names. [Correction record](evidence/remaining-coach-lifecycle-stage1-2026-11-01/combined/encoding-fixes.json) lists exactly those files. Only recognized sequences were replaced, using explicit UTF-8 reads/writes; valid Unicode and unrelated source were preserved. An initial mapping-construction attempt rejected an undefined cp1252 byte before any writes; the final explicit known-sequence replacement succeeded. These comment corrections preceded the combined source hashes and passing run; stage-1 hashes remain the historical bytes, not relabeled as matching the corrected comments.

Six protected candidate archive/evidence hashes matched the prior protected values after verification. The old candidate directory, ZIPs, manifest/checksum list and QA record were not modified or recaptured. No mobile, SQL, type generation, manifest/schema/Edge/native/provider/browser-artifact capture was run. Final `node scripts/check-documentation.mjs` passed (exit 0; 52 Markdown files / 416 links). Scoped `git diff --check`, owned-file newline/trailing-whitespace/encoding checks and the unchanged-source recheck passed. Both indexes remain empty. No AiChat semantic change or owner-record rewrite was made.

## Handoff and remaining gates

The coordinator-granted combined WEB slot completed as recorded above. Required aggregate web tests/lint/build passed for this snapshot; no broader release or subsequent source is certified. Browser/staging acceptance remains separate, including admin role/identity replacement, routed loading/retry, permitted writes and current group selection.

D04 is repaired locally only within these ten stage-1 hook scopes and the earlier verified roster/nutrition scopes; the distinct conversation lifecycle remains owned by `useAiChat`, with its unchanged bytes included in the combined run. Full browser/staging correctness remains unverified despite local source-pattern removal and passing aggregate checks. Archived candidate, D01/media policy, delivery bridges, native/signing/live/production gates remain unchanged. No new features/dependencies/schema, commits/pushes/deployment/live operations, chats/subagents/automations or cross-chat messages were performed.
