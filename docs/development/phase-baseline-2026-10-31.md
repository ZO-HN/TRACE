# Next development phase baseline: 31 October 2026

Status: local checks passed; mobile working copy is still changing; review and release gates remain. Owner: TRACE maintainers. Date: 2026-10-31, Asia/Singapore. Purpose: preserve the existing work, define reviewable commit boundaries, and establish fresh local evidence. Sources: both AGENTS files, [documentation index](../README.md), [workflow](workflow.md), current Git/source inspection, and commands executed for this record. This is not a deployment or a finding-closure record.

## Checkout baseline and preservation

| Repository | Branch | HEAD | Existing changed paths |
| --- | --- | --- | --- |
| TRACE | `master` | `06675347e6b13085750cf319c3b66ffde4a6954e` | 91: 27 tracked modifications/deletions, 64 untracked files |
| TRACE-client | `codex/trace-reliability` | `774ab9df80d423d76f4d5d5c134ba731d10339a9` | 141: 89 tracked modifications/deletions, 52 untracked files |

Both indexes were empty. All verification below includes the pre-existing uncommitted working copies in both repositories, not just HEAD. No staging, commits, branch moves, resets, cleans, deployments, account creation, remote messages or production data writes were performed. Existing deletions were retained; nothing was discarded. Concurrent mobile nutrition edits were detected later and preserved, as recorded below. Ignored native/build outputs are not part of the Git inventory.

The [exact file inventory](phase-baseline-2026-10-31.inventory.json) assigns every initial dirty path to a proposed group and fingerprints surviving files with SHA-256. It excludes this report, the inventory itself, copied verification logs and the index link added by this preparation task. The hashes fingerprint this captured working copy; they are not release artifact hashes. A supplementary `concurrent_mobile_changes` snapshot records subsequent nutrition edits without overwriting the original baseline.

TRACE contains **28 unrelated thesis/revision paths**, including scripts, extracts and media files. They are assigned `EXCLUDE`, remain untouched, and must stay outside application commits. Do not use `git add .` or `git add -A` across this tree.

## Concurrent work detected during preparation

The final preservation check detected later edits to mobile `src/components/NutritionLogger.tsx`, `src/hooks/useNutritionLogs.ts` and `src/lib/nutrition/mealSlots.ts`, plus a newly dirty `src/components/nutrition/MealSlotCard.tsx` (142 dirty mobile paths at that observation). This preparation task did not edit those files. They belong to M9 but remain in-progress work: the later diff introduces dated reads, sync-state display and a redesigned nutrition screen, including removal of some previous summary controls. Review intended scope, loading/failure behavior and affected owning specifications before merging. The original 338-test pass predates these edits. A second run also passed 61 files / 338 tests and typecheck, and the contract check passed again. Nutrition work continued during that run: a later snapshot found 18 paths differing from the initial inventory, including newly dirty catalog hooks and new `CatalogStatus.tsx` / `useNutritionCatalog.ts`. `latest_mobile_drift` lists those exact paths, hashes and M9 ownership. Original and supplementary hashes distinguish these observations. **The latest mobile tree is not a frozen verified revision.** Stop or coordinate concurrent editing, capture an exact revision, and rerun the affected checks before staging M9 or claiming a passing final mobile baseline.

## Implemented work versus completion

The following implementation is present and has passing local suites, but still needs focused diff review and the acceptance boundaries below:

- Documentation consolidation introduces shared architecture/contracts, feature specs, operations, QA, templates and instruction files; retires old handoffs/draft SQL copies; adds link checking to both workflows. The source register records provenance. Review removed material for unique constraints before committing; link success alone does not establish semantic completeness.
- Web onboarding adds account-role/coach-link validation, required-answer checks, up to three goals, OAuth return-path support and embedded previews. A new migration makes coach claims retryable for the same coach. Preview defects and missing claim regression cases prevent calling this whole flow finished.
- Mobile workout work adds serialized account/template-scoped draft storage, queued-set recovery, finish action, a deadline-based rest timer, and workout/folder search/edit/delete behavior. Tests use controlled storage/network dependencies; native persistence is unverified here.
- Mobile logging work merges pending nutrition/session entries into reads, preserves timestamps, adds dated weigh-ins/date-aware charts and shared unit updates, and exposes more save/read errors with duplicate-tap guards. Dashboard work adds date navigation/history and persisted card visibility.
- Mobile account/chat/AI work adds profile editing, stale-response guards, recent chat retrieval/reconciliation, provider selection/validation, and explicit unsupported voice modes. Settings, input validation, reusable controls, preview/build/download/test-account tooling and regression tests are also present. Paid provider calls and native tool execution were not run.

No D01-D25 diagnosis finding is closed by these statements. The [diagnosis](../qa/diagnosis-2026-10-31.md) is a prior evidence record; this preparation reran the local suites, not its browser, cloud, security or dependency-audit probes.

## Proposed reviewable commits

Group IDs resolve to exact paths in the inventory. Titles below are proposed, not existing commits. A group marked held needs follow-up before it can be presented as complete. Run checks on each actual assembled commit; the combined working-copy pass does not prove each intermediate commit compiles.

| Group | Repository / proposed subject | Dependencies and review gate |
| --- | --- | --- |
| D1 | TRACE: `docs: consolidate shared contracts and delivery guidance` | Shared docs, instructions, checker, README, ignore rule, three Edge comment-only link changes and R2 README. Review old-document deletions with replacements. Coordinate workflow hunk with D2. Include this report/inventory/evidence here or in a separate handoff commit. |
| D2 | Mobile: `docs: consolidate device guidance and shared navigation` | Mobile docs/instructions/README and instruction ignore hunk. Requires D1 docs for sibling links. Keep `/artifacts` ignore hunk with M2. |
| W1 | TRACE: `fix(db): allow same-coach claim retries` | Held for targeted SQL cases: repeat same coach via ID and code, wrong/different coach, coach account, unauthenticated caller and ownership denial. Current SQL suite exercises initial ID claims, not that full retry matrix. Read shared contract/canonical predecessors first; update changed retry semantics there. |
| W2 | TRACE: `test(db): cover dated weigh-ins and folder ownership` | Existing added SQL scenarios pass. Pair review with M6/M7; keep these unrelated assertions out of the claim migration commit. |
| W3 | TRACE: `fix(auth): preserve OAuth return paths and account choice` | OAuth helper, buttons and AppShell. Review switch-account failure feedback: AppShell currently discards the returned error. Verify real OAuth callbacks/session switching; W4 uses the new redirect prop. |
| W4 | TRACE: `feat(onboarding): validate enrollment and embed previews` | Depends on W3 and compatible W1 backend for claim retries. Held for full-preview defect below, answer requirements/product review and browser/auth acceptance. Update coaching specification with accepted behavior. |
| W5 | TRACE: `dev: isolate coach preview backend access` | `dev:demo`, localPreview, Supabase configuration. Held: preview profile is not wired to auth hook; add acceptance proving demo route access and blocked cloud writes before describing this as working preview. |
| W6 | TRACE: `fix(ui): adjust create-program dialog placement` | Isolated one-line placement change. Review narrow/wide layouts and dock alignment; no responsive/browser acceptance performed. |
| M1 | Mobile: `refactor(ui): add guarded async actions and accessible controls` | Shared hook, Button/Select/TabBar and test helper/renderer dependencies. Split package scripts out; keep dependency lockfile hunk. Required by later component/hook tests. |
| M2 | Mobile: `dev: add native testing and fixture tooling` | Build/download/test-account scripts and matching package/ignore hunks. Syntax passes only; do not run account creation or start LAN serving as part of a baseline commit. Native identity/signing stays a testing boundary. |
| M3 | Mobile: `dev: add isolated trainee preview and sync status` | Preview script/config, Supabase blocking, root layout and auth screen. Split preview package script from M2 if desired. Held: root layout also removes explicit coach-role blocking; resolve that scope separately. |
| M4 | Mobile: `feat(ai): validate BYO provider settings and requests` | Depends on M1. Provider transports/storage/settings/voice guards plus tests. Device-global credential limitation and live provider/model acceptance remain; no shared server AI is installed. |
| M5 | Mobile: `fix(workouts): recover drafts and finish queued sessions` | GymLogger, draft/storage/timer helpers, integer-duration validation and matching tests. Needs M1; native restart, failure, account-switch and sync acceptance remain. |
| M6 | Mobile: `feat(workouts): manage personal workout folders` | TrainingScreen, folder route/hooks/helper/tests. Needs M1; W2 supplies SQL ownership/delete coverage. Verify persistence, failure recovery and assigned versus personal distinctions. |
| M11 | Mobile: `fix(forms): expose failures and validate health inputs` | Shared health validation, catalog retry, settings saves and remaining guarded forms. Needs M1. This prerequisite group precedes M7/M8 despite its inventory ID. Notification settings do not fix push delivery or add an inbox. |
| M7 | Mobile: `feat(bodyweight): add dated entries and consistent units` | Routes/hooks/helpers/chart/unit state and tests. Needs M1/M11; coordinate W2. Verify date boundaries, units, repeated-date edits, account switching and failed saves on device. |
| M9 | Mobile: `fix(logging): merge queued entries into visible history` | Nutrition forms/types/meal slots/outbox timestamp and session history. Needs M1; audit durable persistence and eligible totals/history bounds. Depends on M7 for cross-area tracking tests moved to M12. |
| M8 | Mobile: `feat(dashboard): add dated history and card preferences` | Dashboard, date/history components, layout helper/hook/tests. Needs M1/M7/M9/M11. Dashboard.tsx mixes several features; review each hunk with its prerequisite or keep as one dependent dashboard commit. |
| M10 | Mobile: `fix(account): guard profile and conversation updates` | Account editor, auth/profile/chat hooks, menu and tests. Needs M1; recent 200-message retrieval is not pagination. Role-gate removal remains in held M3, not accepted by this group. |
| M12 | Mobile: `test: verify cross-feature tracking and navigation` | Tracking/settings/catalog/navigation tests spanning multiple groups. Apply after their source groups, or split each test with its source change. |

Suggested sequence: paired D1/D2 documentation; W2 and reviewed W1; M1 -> M11 -> M5/M6/M7/M9/M10 -> M8/M12; M2/M4 independently after their prerequisites. W3/W4/W5/M3 remain held until their stated gaps are resolved. Hold M9 and its dependent M8/M12 checks until active nutrition editing is coordinated and verified on a frozen revision. W6 can be reviewed independently. This is a dependency plan, not approval to bundle unfinished changes.

### Mixed files and staging procedure

- TRACE `package.json` belongs with W5. Mobile `package.json` combines renderer dependencies, preview, APK/download and account scripts; split hunks between M1/M2/M3, with `package-lock.json` following dependency changes.
- Mobile `.gitignore` combines versioned agent instructions (D2) and generated artifacts (M2). Both workflows add a docs check that depends on *both* replacement documentation trees. Default companion ref is moving `master`; record exact paired SHAs/use `companion_ref` for coordinated CI. Do not assume either single-repository docs commit passes against the old companion docs.
- Mobile `app/_layout.tsx` combines preview, sync banner and removal of a role gate. TRACE `OnboardingWizardPage.tsx` combines enrollment validation and preview. Keep those changes visible in review; do not stage a whole mixed file under an unrelated title.
- Use explicit literal file paths and `git add -p` for mixed tracked files. Add new source/test files explicitly. Stage retired docs by their exact paths together with replacements, then inspect `git diff --cached --stat` and `git diff --cached --check`. Preserve the thesis exclusions.
- Use focused `codex/` branches for follow-up work. No branch was changed here. Each commit needs its owning specification/contract and matching tests. Recheck the assembled commit and pinned companion, then record its actual SHA/results before calling it Review-ready.

## Fresh verification results

Executed locally on the dirty pair above using installed dependencies; no clean `npm ci`, remote CI, production build deployment or dependency upgrade was performed. Shared checks used `TRACE_CLIENT_PATH=C:\Users\imint\TRACE-client`.

| Command / working directory | Actual result | Evidence / boundary |
| --- | --- | --- |
| `npm test` / TRACE | Exit 0; 10 files, 39 tests | [Web tests](../qa/evidence/phase-baseline-2026-10-31/web-test.txt); utility/unit scope. |
| `npm run lint` / TRACE | Exit 0; 5 Fast Refresh warnings | [Lint](../qa/evidence/phase-baseline-2026-10-31/web-lint.txt); badge, toast, field and two AppShell exports. |
| `npm run build` / TRACE | Exit 0; production compilation passed | [Build](../qa/evidence/phase-baseline-2026-10-31/web-build.txt); JS 1,085.05 kB / 303.57 kB gzip, chunk-size warning. |
| `npm run test:db` / TRACE | Exit 0; 11 SQL scenarios passed | [SQL](../qa/evidence/phase-baseline-2026-10-31/db.txt); disposable PGlite, not deployed Supabase. |
| `npm run db:types:check` / TRACE | Exit 0; 2 apps verified | [Types](../qa/evidence/phase-baseline-2026-10-31/types.txt); generated files unchanged. |
| `npm run test:contracts` / TRACE | Exit 0 | [Contracts](../qa/evidence/phase-baseline-2026-10-31/contracts.txt); literal table/RPC existence, not payload/runtime correctness. |
| `npm test` / TRACE-client | Exit 0 twice; 61 files, 338 tests each | [Mobile tests](../qa/evidence/phase-baseline-2026-10-31/mobile-test.txt); mocked storage/network/render dependencies; concurrent nutrition drift prevents certification of the latest files. |
| `npm run typecheck` / TRACE-client | Exit 0 twice | [Mobile types](../qa/evidence/phase-baseline-2026-10-31/mobile-typecheck.txt); no native execution. |
| `node scripts/check-documentation.mjs` / TRACE | Exit 0 before handoff edits: 40 Markdown files, 252 links | Final result after adding this record is recorded below. Local links/anchors/reachability only. |
| `git diff --check` / each repository | Exit 0 | No whitespace errors in tracked unstaged diffs; untracked content is outside this command. |
| `node --check` / five changed/new Node scripts | Exit 0 for all five | TRACE docs checker; mobile build-android, serve-android-download, preview and test-account. Syntax only, no script runtime operation. |

## Remaining blockers and acceptance

Newly identified from current source inspection (not browser reproduction):

1. **Full invite preview cannot advance.** `OnboardingWizardPage` starts `authChecked=false`, skips the auth effect for preview, but its intro button stays `disabled={!authChecked}`. `previewInviteId` therefore leaves Get Started disabled even after invite resolution. Test full invite and single-screen previews independently, including no auth/write side effects.
2. **Coach demo is partially wired.** `previewProfile` is exported but unused; `useTraceUser` has no preview branch. The demo Supabase fetch returns 503 while AppShell still requires a user. A fixture profile file and successful build do not establish a usable coach preview.
3. **Mobile role-gate removal needs resolution.** Current root layout removes `CoachAccountBlocked` and guards coach selection only for trainees. Coaches can fall through to trainee UI. This is consistent with open D25; restore explicit role UX or obtain an explicit product decision with authorization/write-boundary acceptance before merging that hunk.
4. **Claim retry coverage is incomplete.** Existing setup performs initial claims; frontend helper tests do not verify the migration's repeated ID/code and denial matrix. Add focused database regression coverage and contract wording before treating W1 as complete.

Priority next tasks retain the [open-items order](../planning/open-items.md):

- D01/D02/D05/D06/D22/D23: trustworthy media entitlement, real SDK preflight, aligned upload/playback kinds, runtime validation and finalization/object-policy checks. The Edge diffs currently change comments only; they fix none of these behaviors.
- D03/D04/D16: durable routed workout builder, StrictMode lifecycle and atomic aggregate writes. Current web `useClients` still has the cleanup-only mounted flag; no fix was added here.
- D07/D11-D15/D17-D20: delimit incomplete AI/program/calendar/vault/nutrition delivery, visible recovery, full history/totals and notification inbox/delivery. Partial mobile improvements do not close those product-wide findings.
- D08-D10/D21/D24/D25: push provisioning/preferences/ticket handling, native release identity/signing, role UX and operational assurance. Prior dependency advisory counts were not refreshed; perform a separate current dependency/security assessment before release rather than presenting the older audit as current.

Not run: signed-in two-coach/two-trainee staging acceptance; real OAuth callbacks; deployed migration/function inventory; deployed Deno auth/body/CORS checks; R2 object lifecycle/private media round trips; Realtime delivery; paid AI/provider/model checks; push receipt/open checks; fresh Expo web/Android exports; APK build/install; physical Android/iOS restart/offline/SQLite/account-switch checks; clean-install reproducibility; remote CI/protected-branch settings. No staging health or outage conclusion was established by this task. Use dedicated fixtures and the [shared acceptance](../qa/cross-app-acceptance.md) / [mobile acceptance](../../../TRACE-client/docs/qa/mobile-acceptance.md) records.

## Release boundary

**Nothing was deployed.** Review-ready work can be separated now; affected release flows remain blocked on the above repairs and their acceptance evidence. When a separately authorized release is ready: pin both app revisions, validate compatible canonical SQL/RPCs before dependent clients, sequence functions according to their SQL dependencies, then release web/mobile and verify supported old-client combinations. Follow [cross-app rollout](../operations/cross-app-rollout.md); confirm backups/recovery and record staging/device/production evidence separately. Do not infer authorization to release from this preparation record.

## Final handoff checks

- Documentation checker after this report and index link: exit 0; 41 Markdown files, 269 local links, all reachable from the shared index.
- Both tracked-diff whitespace checks passed. Both indexes remain empty; no commits were created.
- All original TRACE fingerprints match except `docs/README.md`, where this task added one navigation row. The 28 unrelated thesis/revision paths are preserved.
- Mobile's second test/typecheck run and renewed contract check exited 0. Concurrent nutrition edits continued; the inventory preserves the initial snapshot, the first detected changes and the later 18-path drift snapshot. Those changes were retained, not reverted. No claim is made that the latest moving mobile tree exactly matches either passing run.
- Added by this task: this Markdown report, JSON inventory, eight text verification logs, and one shared-index navigation link. No application source changes were made by this task. Freeze/review the active mobile work and rerun checks before making its commits.
