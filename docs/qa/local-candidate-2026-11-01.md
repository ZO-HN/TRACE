# Local paired candidate: 1 November 2026

Status: local automated checks and web compilation passed; **NOT PRODUCTION READY**. Owner: TRACE maintainers. Capture: 2026-11-01 11:11:53 Asia/Singapore. Candidate ID: `trace-local-20261101-1115-sgt` (identifier, not capture time). Sources: actual paired dirty sources, candidate-local logs/fingerprints, [private authoring](private-workout-authoring-2026-11-01.md), [media runtime](media-runtime-2026-11-01.md), and [nutrition review](../../../TRACE-client/docs/releases/nutrition-acceptance-2026-10-31.md).

## Identity and preservation

| Repository | Branch / resolved HEAD | Capture context |
| --- | --- | --- |
| TRACE | `codex/edge-cors-contract` / `06675347e6b13085750cf319c3b66ffde4a6954e` | 155 dirty paths, zero staged; 211 selected files, 34 selected untracked |
| TRACE-client | `codex/trace-reliability` / `774ab9df80d423d76f4d5d5c134ba731d10339a9` | 154 dirty paths, zero staged; 298 selected files, 48 selected untracked |

Counts use `--untracked-files=all`. Candidate identity includes dirty bytes, not HEAD alone. Paired selected-source SHA-256: `70e8b93171e2db916408df88306fc86f30388021bfdce3cc52a5d83dcc77d84b`.

Local-only output: `C:\Users\imint\.codex\local-candidates\trace-local-20261101-1115-sgt`. `candidate-manifest.json`, `source-before.json`, per-command source snapshots, `source-final.json`, `results.json`, logs, `prior-evidence-comparison.json`, dependency metadata and `SHA256SUMS.txt` reside there. This machine-local directory is not uploaded or a durable CI artifact store.

Selected inputs include runtime source/routes/static assets, package manifests/lockfiles, build/test configs, CI, scripts/tests, all canonical migrations/functions/shared modules, both generated database type files, and stable feature/architecture contracts. The manifest lists every selected untracked source and hash. `selected-source.zip` preserves those selected bytes; it is not a full repository or installed dependency archive. Supplemental `seed.sql` and local backend config fingerprints are captured separately; the seed scenario was reconfirmed after that supplemental capture.

Excluded: unrelated thesis/revision material; `.env` and signing/secret files; caches/node_modules; generated native Android/iOS trees; existing native/web artifacts; mutable planning, QA, release and coordination documents. Generated database types are an explicit inclusion. No secret values, real account data or health records were collected. Existing app/schema/spec/board work was preserved. Repository edits in this task are this record and one index link only.

Source fingerprints and both HEADs/branches were checked before and after every validation/build command and after documentation work. No selected-source drift occurred. Supplemental fixture/config fingerprints also stayed unchanged. Drift would invalidate local candidate acceptance.

## Actual local verification

Commands ran sequentially with installed dependencies, Node `v24.14.0`, npm `11.9.0`; no install or clean dependency restore. Exact argv, timestamps, exit codes and log hashes are in `results.json`. Direct Node entry points below execute the corresponding package scripts without a dependency-fetching wrapper.

| Command / checkout | Result and tested boundary |
| --- | --- |
| Web `node node_modules/vitest/vitest.mjs run --maxWorkers=1` | Pass: 20 files, 254 tests, including Edge/authoring regressions; controlled services, not deployed Deno |
| Web `node node_modules/oxlint/bin/oxlint` | Pass: five existing Fast Refresh warnings |
| Web `node --test --test-concurrency=1 tests/database/contracts.test.mjs tests/database/workoutAuthoring.test.mjs` | Pass: 16 canonical SQL/PGlite scenarios; not hosted PostgREST or concurrent production transactions |
| Web `node scripts/generate-database-types.mjs --check` | Pass for both apps; no type regeneration in this task |
| Web `node scripts/check-client-contract.mjs` | Pass for both apps; table/RPC names, not every transport/payload |
| Mobile `node node_modules/vitest/vitest.mjs run --maxWorkers=2` | Pass: 63 files, 412 tests, after generated-type addition; mocked/in-memory boundaries |
| Mobile `node node_modules/typescript/bin/tsc --noEmit` | Pass |
| Web `node node_modules/typescript/bin/tsc -b`, then `node node_modules/vite/bin/vite.js build --outDir <candidate>/web-dist` | Pass: fresh production-mode output; main JS 1,090.59 kB / 306.21 kB gzip; chunk-size warning remains |
| Mobile `node node_modules/expo/bin/cli export --platform web --output-dir <candidate>/expo-web --max-workers 2` | Pass: fresh Expo WEB export, four web bundles plus assets; no APK/IPA or native acceptance |
| Web `node --test --test-name-pattern="optional local seed" tests/database/contracts.test.mjs` | Pass: one seed scenario, reconfirmed with supplemental seed/config fingerprints |
| Web `node scripts/check-documentation.mjs` | Pass after adding this record/index link; local links/navigation only |

Both compilations deliberately use `https://candidate.invalid` and a non-secret fixture public key, with public development auto-login values removed. Expo dotenv loading is disabled, preview is off, offline/telemetry settings are recorded. These are local production-mode compilation artifacts with fixture backend configuration, not deployable production builds. No app/browser session or live transport was exercised.

## Artifacts and new schema boundary

| Local artifact | SHA-256 |
| --- | --- |
| `selected-source.zip` | `ed1be6b8b8430ad4946e83d73b4f564596e8ce6d73b494b79a225cab3b9dfa65` |
| `coach-web-production.zip` | `a6601f3d5b228504361cc0ecdb60436fe1bb8a0a1d465b8f63c9fa34db49682f` |
| `mobile-expo-web.zip` | `71e50b17eb496964cf726e2d5cb852b23042423f15bcb23bdca9359f7a9c854a` |

`artifact-fingerprints.json` records all 52 individual output files. Artifact-set SHA-256: `02e9e91c3a4d65679cb33ec790b1b2b1f5960a7c7ecb06c7e1625bb25439677e`.

The new additive migration is `20261101000000_atomic_private_workout_authoring.sql`, SHA-256 `770f6f80bd340e2e823cbc1ab9994c9bc71ca57d8233ba64936fd143c58b0b92`. Both generated type files match byte-for-byte, SHA-256 `1c80d0ee32972101cad49139a1da8348ac3af010c27f65898b00de60dea65e41`; their diffs add only the save-receipt table and RPC. `test:db` now discovers both SQL test files sequentially. Local SQL checks cover atomic ordered private save/readback, retry identity/content binding, failure rollback, foreign-account denial, receipt denial/deletion behavior and existing history/sharing compatibility.

This establishes private authoring's tested local boundary. It does not establish hosted save/reload, assignment delivery, calendar/program bridges, persistent unfinished editor drafts, or final assignment/versioning semantics. No legacy-media or assignment product decision was resolved.

## Reused evidence and remaining acceptance

All seven media/Brain/CORS source/test fingerprints in the November 1 media record match. All six final nutrition source/test fingerprints plus its owning contract match; all three recorded roster lifecycle fingerprints match. Those prior focused results/source reviews are carried forward only within their original controlled-service boundary. Earlier aggregate builds/suites lack a complete matching candidate manifest, so they were not relabeled as candidate results: aggregate checks and both compilations above were executed afresh. Older Android APKs remain dated testing evidence and are not candidate artifacts.

| Flow | Current boundary / next required acceptance |
| --- | --- |
| Food | Local parser/hook/component/outbox checks pass. Real SQLite offline kill/reopen/retry, 501-row staging totals, historical values, account switching and coach-summary round trip: not run |
| Workout | Private atomic authoring passes local handler/SQL checks. Browser create/add/remove/reorder/save/reload, hosted lost-response/concurrent retry and unrelated-account denial: not run. Assignment delivery remains unavailable/separate |
| Coach | Lifecycle/cache and scoped SQL fixtures pass. Two real staging coaches/two trainees, claim/role/reassignment/check-in and authorized summaries: not run |
| Media | Local CORS/body/error regressions pass. **D01 known foreign-key entitlement vulnerability remains open**; D05/D06 kind/playback and D22 object/finalization/legacy-policy gates remain. Real gateway OPTIONS/auth POST, bucket PUT/playback/expiry/reassignment: not run |

Follow [shared acceptance](cross-app-acceptance.md) and [mobile acceptance](../../../TRACE-client/docs/qa/mobile-acceptance.md) using dedicated synthetic staging fixtures. No staging credentials/accounts or devices were established in this task. No live Supabase/R2/provider requests, account provisioning, push/messages, migrations or deployments occurred. Browser functional acceptance was not run; fixture components/SQL cannot certify real private save/reload.

Additional release blockers: Deno unavailable on PATH (native checking not run); deployed migration/function/Auth/R2 configuration unverified; Android testing identity `com.anonymous.traceclient`, version 1.0.0/code 1 and debug signing remain; intended native signing/distribution and iOS environment/device acceptance unverified; EAS/project/push/webhook provisioning, provider inference and backup/restore evidence remain open. No native build, paid provider call, push or restore drill was performed. Broader unresolved diagnosis findings remain tracked independently.

Before any separately authorized release, verify the exact target environment and reviewed pending migrations, backup/recovery and older-client compatibility. Deploy additive RPC support before the dependent coach web bundle; package shared CORS with any authorized function deployment. Then test authenticated staging and the intended signed native artifacts, with independent pass/fail/not-run records. Neither green local checks nor private authoring closes full D03 assignment delivery. **Result: locally verified compilation/test candidate; NOT PRODUCTION READY.**
