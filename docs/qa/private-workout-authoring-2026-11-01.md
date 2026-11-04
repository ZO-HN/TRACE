# Private workout authoring: 1 November 2026

Status: locally implemented and automatically verified; browser/staging/deployment acceptance pending. Owner: TRACE maintainers. Evidence window: 2026-11-01, 10:54-11:00 Asia/Singapore. Scope: private coach create -> atomic save -> library reload/readback, existing prescription fields only. Owning documents: [training](../features/training.md), [shared contract](../architecture/client-contract.md).

## Inspected revisions and working copies

- TRACE HEAD: `06675347e6b13085750cf319c3b66ffde4a6954e`.
- TRACE-client HEAD: `774ab9df80d423d76f4d5d5c134ba731d10339a9`.
- Both checkouts had substantial pre-existing source/docs/fixture changes and unrelated thesis files. Evidence includes those dirty working copies and this uncommitted slice, not just HEAD or any deployed release. Existing media/CORS/auth/dashboard/nutrition/mobile edits were preserved. Node runtime: `v24.14.0`.
- The earlier targeted process handle was unavailable after the interrupted run. Verification below was performed afresh; its missing result is not treated as a pass.

## Implemented boundary

The existing `/workouts` route mounts the durable `TemplateBuilder` and reads private active templates belonging to the current AppShell coach. It uses the existing profile context rather than another auth observer. The builder captures name/description, selects real catalog exercises, adds/removes/reorders items, and captures sets/reps/nullable integer RPE/rest seconds. Repeated exercises and zero rest are allowed. Stored detail displays ordered prescription values.

The additive migration `20261101000000_atomic_private_workout_authoring.sql` adds `save_workout_template` and an inaccessible-to-clients retry receipt table. Authenticated coach identity must match the submitted creator. Parent, children and receipt commit atomically. Stable operation/template UUIDs bind retries to one normalized request; mismatched identity/content or an existing template cannot be overwritten. Deleted templates are not silently recreated by retry. Existing template/item policies, personal-program sharing, session/set history and assignment behavior are unchanged.

Failed requests retain editor values and UUIDs through modal close/reopen while the route remains mounted. Reload/navigation does not persist an unfinished editor draft; reload the library before recreating a save whose response was lost. Matching retries are safe within the retained operation. Error/loading/empty/saved states are explicit. Catalog and library reads have visible retry paths; account-switch, stale-response, StrictMode replay and unmount cases have lifecycle unit coverage.

Assignment is visibly unavailable pending its delivery/versioning decision. There is no target-load field, public publishing, recipient-policy change, mobile prescription change, program/group bridge or calendar persistence in this slice. D03's full assignment-to-trainee journey, D11/D12 and other D16 writers remain open.

## Executed verification

| Command | Actual result / boundary |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run tests/lib/templateBuilder.test.ts tests/hooks/useTemplateSave.test.ts tests/hooks/useCoachPrivateWorkouts.test.ts tests/components/privateWorkoutAuthoring.test.ts --maxWorkers=1` | 4 files, 22 tests passed. Actual hook/component handlers with controlled lifecycle/transport; not a DOM/browser or real Supabase test. |
| `node --test tests/database/workoutAuthoring.test.mjs` | Initial 4 SQL cases passed against canonical PGlite replay before adding the final receipt deletion/access assertions. |
| `npm run test:db` | Final 16 SQL cases passed: 11 existing and 5 authoring cases, executed sequentially. Includes actual canonical SQL/RLS, exact ordered readback, duplicate exercise positions, zero rest, response replay, changed content/owner/ID rejection, child-FK rollback with recovery using the same IDs, direct receipt SELECT/INSERT/UPDATE/DELETE denial, deleted-template retry, preserved personal history and existing token-sharing/assignment regressions. |
| `npm run db:types` | Generated both apps' type files with the existing generator; each diff adds only the new receipt table and RPC. |
| `npm run db:types:check` | Both apps verified against canonical schema. |
| `npm run test:contracts` | Passed for both checkouts. Covers referenced table/RPC names, not every payload or hosted transport. |
| `npm test -- --maxWorkers=1` | Final 20 files, 254 tests passed after lifecycle fixes. Includes existing Edge regression suites; no deployed Deno execution. |
| `npm run lint` | Exit 0, five pre-existing Fast Refresh warnings in badge/toast/field/AppShell. Two initially introduced ref-cleanup warnings were fixed using captured lifecycle tokens; none remain in authoring hooks. |
| `npm run build` | TypeScript and Vite passed. Main JS 1,090.79 kB / 306.42 kB gzip; bundle-size and plugin-time warnings remain. |
| TRACE-client `npm run typecheck` | Passed after generated-type update. No mobile source change or full mobile suite in this slot. |
| `node scripts/check-documentation.mjs` | Passed: 48 Markdown files, 364 local links, all reachable from the shared index. |
| `git diff --check` scoped to authoring source/tests/manifest/types in both apps | Passed; Git reports LF-to-CRLF informational notices. Added-file trailing whitespace checked separately. |

CI plumbing: `test:db` now runs `node --test --test-concurrency=1 tests/database/*.test.mjs`, so the existing reliability workflow invocation includes both SQL files. Other pre-existing package edits and dependencies were preserved. Tests did not require longer timeouts or new dependencies.

## Review and remaining gates

- Automated evidence establishes local code/SQL boundaries only. No real browser route session, authenticated hosted PostgREST/RPC round trip, network-lost-response/concurrent production transactions, staging migration, native/device run or production deployment was performed.
- Before release, review pending migrations in canonical order and verify staging ownership, private readback and retry behavior with dedicated coach/trainee/unrelated-account fixtures. Confirm both old mobile personal-program/sharing behavior and new web RPC support against the intended backend.
- Release the additive migration before the dependent web bundle. Both generated files must travel with their coordinated revisions. Older mobile writers remain supported; generated types do not activate trainee delivery.
- Browser acceptance still needs real create/add/remove/reorder/save/reload/readback, visible catalog/save/read failures, repeated taps, retained failed input and account switching. Test a truly lost response and concurrent retry against staging, not just the controlled unit transport.
- Assignment/versioning remains a product decision and separate implementation. Do not close D03 or claim the coach-to-trainee journey works from this private authoring milestone.

## Final record checks

Documentation links and tracked-file whitespace checks passed. The generated type diffs add only 24 lines per app (receipt table and RPC); pre-existing `contracts.test.mjs` changes remain 41 added lines. The only package script change in this slice is SQL test discovery; the existing `dev:demo` edit is preserved. No commits, pushes, live migrations or deployments were performed.
