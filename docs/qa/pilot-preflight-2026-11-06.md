# Private pilot preflight: 6 November 2026

Status: local repairs implemented; hosted rollout and native acceptance blocked. Owner: TRACE maintainers / production coordinator. Scope: both current dirty master worktrees. TRACE HEAD `b11fcab2d9282595c073b67ef5ce5bee5d87e668`; TRACE-client HEAD `9b123120bb8564e2522c1c15bc4acf4d78987449`. Unrelated thesis work remains untouched. Dates use Asia/Singapore. This record supersedes only the specific older readiness observations addressed below.

## Local repairs

- Nutrition queue admission now rejects descriptions exceeding 280 Unicode code points, core macros exceeding numeric(6,1) capacity, out-of-range/non-integer calories and invalid smallint meal slots. Quick Add previews the same limits, retains invalid input and disables saving. Every parser occurrence is range-checked, including later duplicates. Already pending records are neither edited nor deleted.
- Training lists valid saved drafts for the exact account, independently of remote catalog loading, and resumes the persisted template ID. Existing downloaded prescription caches remain required for offline opening. Loading and failed local reads with retry are explicit. Late results cannot restore another account's rows.
- Finish no longer recreates a resumable draft in the still-mounted logger after removing it. A fresh edit, mode change or clip attachment enables persistence for the next session even when navigation retains the screen behind History; the regression checks a new session ID and recoverable input across remount. Completed logs remain queued under their original IDs.

Sources: [nutrition validation](../../../TRACE-client/src/lib/nutrition/validation.ts), [queue boundary](../../../TRACE-client/src/lib/outbox/outboxStore.ts), [resume UI](../../../TRACE-client/src/components/ResumeWorkouts.tsx), [draft storage](../../../TRACE-client/src/lib/workout/activeDraftStorage.ts), [logger](../../../TRACE-client/src/components/GymLogger.tsx). See the owning [nutrition](../features/nutrition.md) and [training](../features/training.md) specifications.

Focused checks: four files / 12 tests passed for queue validation, draft storage, logger recovery and Quick Add; two resume-component tests passed for exact selection, storage-error retry and stale-owner completion. Final `npm test -- --maxWorkers=2` passed **66 files / 443 tests**, followed by `npm run typecheck` exit 0 on the final application source. Documentation validation passed **59 Markdown files / 550 local links**; both repositories' whitespace checks passed. Tests use controlled React/AsyncStorage and a memory outbox, not native SQLite or authenticated transports. Web/SQL aggregate suites were not repeated for these mobile-only repairs; the [prior paired evidence](private-workout-assignment-2026-11-05.md) keeps its own source boundary.

SHA-256 prefixes of the final mobile application files (including inherited dirty logger changes): `validation.ts CE3025E8F8DF75DF`; `parseQuickEntry.ts C698701D08783CDA`; `outboxStore.ts D4CF5D310186D8FE`; `activeDraftStorage.ts E69A6B470447281A`; `ResumeWorkouts.tsx E2CA91E167139914`; `TrainingScreen.tsx 43E06774CFAFD330`; `GymLogger.tsx 420B684E3CC7A08F`; `QuickAddTab.tsx 126E958ACDE1525F`. HEAD alone does not identify these uncommitted bytes.

## Verified hosted configuration

Read-only Supabase CLI access and the Vercel connector work. No live migration, function deployment, account creation, paid provisioning or publication occurred.

| Observation | Actual result |
| --- | --- |
| Supabase project | `lfaxkrorjljdeefnafjb`; matches both apps' configured public URL and local CLI linked project. |
| Remote migration history | Matches local history through `20260817000000`; six canonical migrations have no remote entry. |
| `supabase db push --dry-run` | Exit 0; lists the six files below. This only plans migration ordering; it does not execute or validate their SQL against the target's existing definitions. |
| Deployed functions | `r2-presign` ACTIVE v2, `trace-brain` ACTIVE v2, `r2-get-url` ACTIVE v1; all report gateway JWT verification enabled. Local later fixes are not thereby deployed. |
| Server secret inventory | Names for R2 account/access key/secret/bucket and Supabase URL/anon/service-role are present. Values were not printed; presence does not verify validity or bucket permissions. |
| Physical backup listing | Exit 0; `backups: []`, WAL-G enabled, PITR disabled, region `ap-southeast-1`. No available physical backup was returned; external backups and restore capability remain unverified. |
| Isolated restore environment | Docker Desktop is installed but its Linux-engine named pipe was unavailable, including after one launch attempt. The attempted helper was stopped. No backup dump or restore occurred. CLI backup/restore requires a working engine and an isolated target; see [Supabase backup procedure](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore). |
| Vercel project | `trace`, team `zohn-proj`, project `prj_dqvl7rnvQSeUzzb2k35EHc0dt355`; verified domain `trace-coach.vercel.app`. Connector inspection found production/preview keys `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; values were not decrypted. |
| Latest inspected production deployment | `dpl_2VguNWyrw9a6fVaR5GhePAzgbXJU`, READY from `ZO-HN/TRACE` master commit `b11fcab`; newer dirty repairs are absent. Build readiness does not establish application acceptance. |
| Native access | Standard Android SDK adb is available; `adb devices -l` returned no connected devices. Existing app package is `com.anonymous.traceclient`; development signing is not a selected pilot signing identity. |
| Dedicated QA fixtures | Mobile `.env.test.local` absent; no dedicated two-coach/two-trainee authenticated fixture set was supplied or provisioned. |

Pending canonical migration order:

1. `20260921000000_mobile_schema_baseline.sql`
2. `20260921010000_coaching_reliability.sql`
3. `20260927000000_idempotent_coach_claim.sql`
4. `20261101000000_atomic_private_workout_authoring.sql`
5. `20261104000000_media_entitlement.sql`
6. `20261105000000_fixed_workout_assignments.sql`

## Current Android testing artifact

`npm run android:apk -- --reuse-native` completed with exit 0 / BUILD SUCCESSFUL on the final source (19m45s; 563 tasks, 22 executed). Metro rebuilt 2,516 modules. Output: `C:\Users\imint\TRACE-client\artifacts\TRACE-android-arm64.apk`, 53,926,600 bytes, SHA-256 **`0238b6829e12687b8260a25db71e30641ae5289a57822bfdd954eae713d43a4f`**. The artifact uses the existing app URL/public key, clears development flags through the build helper and does not rely on Metro at runtime. No hosted schema compatibility or actual login is established by bundling.

Independent Android build-tools 36.0.0 checks passed: `apksigner verify --verbose --print-certs` (v2 signature), `zipalign -c -P 16 4` (ZIP alignment), and `aapt dump badging`. Identity: `com.anonymous.traceclient`, version code 1/name 1.0.0, label TRACE, ARM64 only, min SDK 24/target SDK 36. Signer is **Android Debug**, certificate SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. ZIP alignment alone is not ELF/page-size or device acceptance.

A dated copy, checksum, manifest and selected mobile repair-file ZIP are preserved outside both repositories at `C:\Users\imint\.codex\local-verification\trace-pilot-20261106-0410-sgt`. Copied APK hash matches. The manifest identifies both parent HEADs, dirty-source status and twelve code/test fingerprints. This is a testing-artifact snapshot, not a frozen paired release candidate or a signing decision. No device installation or distribution occurred. Existing Gradle deprecation warnings, SDK XML version warning, Node shell-option deprecation and color-output warnings were observed; they did not fail the build.

## Concrete rollout gates

1. Establish a restorable backup and demonstrate isolated restore before changing the hosted database, as required by [recovery](../operations/recovery.md). Review existing definitions against the mobile reconciliation migration; migration-history parity is not schema parity when drafts may have been applied manually.
2. Identify the controlled acceptance environment and dedicated coach A/B and trainee A/B fixtures. Keep credentials outside chat and tracked files. Do not infer that a privileged CLI login proves end-user Auth/RLS behavior.
3. Apply the six reviewed migrations in order during the explicitly approved rollout. Coordinate media endpoint maintenance: the registry/attachment migration and both entitlement-aware signing handlers must become compatible before traffic resumes. Deploy the reviewed shared-CORS/runtime handlers; validate gateway JWT behavior, actual R2 PUT/GET, bucket CORS and cross-account denials. Follow [media rollout](media-entitlement-2026-11-05.md).
4. Verify real PostgreSQL concurrent retries, private save/assignment/readback and mobile exact-template loading through Auth/PostgREST. Record current-coach historical media access, former-coach denial and legacy denial with actual requests.
5. Select paired immutable release revisions and intended native identity/signing/distribution; verify exact artifacts on a connected device: offline non-default workout, force-kill/reopen, nutrition/set delivery, lost response, account switch and deduplicated coach review. A development APK is only a testing aid.
6. Release compatible clients after backend acceptance. The inspected Vercel production deployment comes from master; treat a push as potentially releasing production until current Git integration settings are verified. Do not use a push as a harmless backup of unreviewed client/backend work. Agree explicit pilot exclusions for unsupported progress photos, unfinished delivery bridges, AI/push and saved-meal partial-write behavior before advertising those paths.

No public release, production-ready claim, backup/restore success, native acceptance or live media acceptance is established by this record.

## Exercise sources

The owner-requested [exercise repository shortlist](../research/exercise-datasets-2026-11-06.md) compares metadata, still images, GIF/video sources, source terms and storage shape. No dataset or media import was performed. Free API access and repository code licenses do not by themselves grant durable media redistribution rights.
