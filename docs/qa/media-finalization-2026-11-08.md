# Media verification and recoverable attachment — 8 November 2026

Status: implemented and aggregate-verified locally; not deployed. Owner: TRACE coordinator. No deployment, live migration/R2 request, cleanup or publication. Sources: [function contract](../../supabase/functions/r2-presign/README.md), paired upload/read hooks, actual screen integrations and canonical finalization migration.

## Candidate boundary

Dirty paired master worktrees remain based on TRACE b11fcab2d9282595c073b67ef5ce5bee5d87e668 and TRACE-client 9b123120bb8564e2522c1c15bc4acf4d78987449. Later uncommitted source is included; unrelated thesis/UI work is preserved. Historical candidates/debug APK do not certify these bytes. Other chats own only assigned catalog/recovery-test/vault-design files; coordinator owns SQL/types and aggregate slot.

## Local evidence

| Requirement | Evidence boundary |
| --- | --- |
| Exact V2 owner/operation/signed headers, missing or changed objects denied | Actual handler and verifier tests with controlled Auth/registry/AWS transports |
| Actual size/type/ETag/range/signature prefix and immutable V1 sealing | Bounded verifier tests; actual R2 beta extension remains untested |
| Unregistered/foreign/unattached/former denial and owning submissions | SQL registry/attachment/check-in audit/role scenarios in PGlite |
| Retry preserves row identity, corrections/review/newer avatar | SQL receipts plus avatar orchestration/hook and mobile journal tests |
| Account switches, late replies, expiry and explicit reload | Actual web URL hook and mobile React renderer hook tests |
| Complete photo/form history with error recovery | Fifty-row keyset paging, nullable legacy form dates, exact metadata RPC receipt tests |
| Current unfinished workout draft receives verified recovered key | UI chat's GymLogger/UploadRecovery renderer regressions; native storage/server sync untested |

Coordinator focused runs: 169 Edge tests across verifier/V2/runtime/CORS; 11 web avatar/URL tests; 7 SQL finalization scenarios; 7 mobile upload/read lifecycle tests and 8 upload-orchestration tests. These are focused runs, not a whole-app or deployed acceptance. A test-only focus-effect mock initially reran each render and exhausted a worker; adding callback dependencies fixed that harness defect and the focused rerun passed. The original workout renderer import also pulled native animation through the new recovery control; the UI chat owns isolation and actual recovery regressions. These initial failures are recorded, not relabeled as device/app failures.

Coordinator current checkpoint aggregate passed: 690 web / 54 SQL / 495 mobile tests, lint (six existing warnings), web build (existing bundle warning), generated types for both apps, contracts, mobile typecheck, docs (70 files / 619 links) and staged whitespace. The companion UI chat supplied actual recovery tests; coordinator repaired the unfinished GymLogger fixture and added stale-target/disabled-control protection, then both renderer files passed 13 tests. MediaViewer error/reload checks also pass. The vault migration is included as unfinished work; these baseline suites do not establish vault feature acceptance. [GitHub checkpoint boundary](github-checkpoint-2026-11-08.md) records the paired source context.

## Remaining gates

Signature prefixes do not establish full decoding/scanning, quotas or cleanup/retention/deletion. V1 originals and recovery metadata are retained. Temporary source loss before PUT may need reselecting a file. Native camera MIME/streaming, playback, disk-full, kill/reopen, SQLite/outbox and account-switch acceptance remain required. No resolution/duration/compression guarantee is claimed.

Deno is unavailable locally; VM tests do not replace deployed Deno/gateway compilation. Actual Supabase Auth/RLS/PostgREST, real PostgreSQL concurrency, R2 conditional PUT/HEAD/range/copy beta/ETags/private bucket CORS, expiry/relationship changes, browser/native artifact journey and backup/restore remain release gates. Follow contract maintenance order; old hosted handlers must not issue unchecked URLs during transition. Application remains NOT RELEASE READY.
