# D01 media entitlement implementation evidence

Status: locally implemented and focused regressions passing; live migration, deployed functions, staging and real R2 behavior remain unverified. Owner: TRACE maintainers. Date: 2026-11-05, Asia/Singapore. TRACE HEAD: `b11fcab2d9282595c073b67ef5ce5bee5d87e668`; TRACE-client HEAD: `9b123120bb8564e2522c1c15bc4acf4d78987449`. TRACE contains unrelated untracked thesis work. TRACE-client contains an unrelated in-progress edit to `tests/components/workoutDraft.test.ts`; both were preserved.

## Scope and behavior

The additive canonical migration `20261104000000_media_entitlement.sql` creates a server-owned `media_objects` registry and caller-scoped entitlement helpers. `r2-presign` records verified user, key, kind, declared content type and size using the service role before it signs a PUT URL. A failed registry write produces no URL. `r2-get-url` calls `can_view_media` with the authenticated caller context before signing a GET URL.

Owners can view their registered issued media. A current coach can view a registered form video attached to the trainee's per-set log or standalone form check. Current relationship is checked at request time; reassignment revokes a former coach from newly issued URLs. New and changed attachments are rejected unless registry owner and media kind match the row owner and attachment type. An unchanged existing reference remains data-compatible but does not establish playback entitlement. Thus unregistered legacy objects receive no new URL and require reupload. Previously issued URLs remain bearer links until their 600-second expiry. Progress-photo support, finalization, cleanup and actual stored-byte verification were not added.

The form-check query scopes historical rows through the current profile relationship. The stamped `form_checks.coach_id` remains audit data and does not control media entitlement.

## Focused verification

Commands ran sequentially from `C:\Users\imint\TRACE` against installed dependencies:

| Command | Result | Boundary |
| --- | --- | --- |
| `node --test tests/database/mediaEntitlement.test.mjs` | Exit 0; 3 tests passed | Executes all canonical migrations in PGlite and verifies owner/current-coach/unrelated-user access, reassignment revocation, legacy visibility without playback, foreign/wrong-kind attachment denial, and registry privilege isolation. A legacy row is loaded with its attachment trigger disabled to model pre-migration data. |
| `npx vitest run tests/edge/mediaRuntime.test.ts` | Exit 0; 1 file, 105 tests passed | Executes actual Edge handler source with controlled Auth/database/signing. Confirms registry write contents/order/fail-closed behavior and caller-scoped entitlement RPC before signing, plus existing request/error cases. |

## Coordinated verification

After the UI task reported completion, types were regenerated and checked for both apps. The TRACE-client workout recovery test edit and evidence were preserved; the updated generated client types passed its typecheck.

| Command | Result | Boundary |
| --- | --- | --- |
| `npm run db:types` | Exit 0; generated for 2 apps | Canonical migration-derived types in both repositories. |
| `npm test` | Exit 0; 24 files, 600 tests passed | Full TRACE web Vitest suite, including media handler, browser/mobile SDK CORS and shared function regressions. |
| `npm run lint` | Exit 0; 5 Fast Refresh warnings | Warnings are in AppShell, badge, toast and field components outside this media change. |
| `npm run build` | Exit 0; TypeScript and Vite build passed | Existing warning: minified main JS chunk exceeds 500 kB. This is not Deno Edge type/runtime validation. |
| `npm run test:db` | Exit 0; 19 tests passed | Full canonical PGlite database suite, including the new entitlement cases and the adjusted form-check fixture with a matching registered key. |
| `npm run db:types:check` | Exit 0; verified for 2 apps | Generated types are current in TRACE and TRACE-client. |
| `npm run test:contracts` | Exit 0 | Both apps' referenced tables and RPCs exist in canonical migrations. |
| TRACE-client `npm run typecheck` | Exit 0 | Mobile TypeScript check after cross-app type generation. The UI task separately reported 434 mobile tests passing before type regeneration; no full mobile suite was repeated here. |
| `node scripts/check-documentation.mjs` | Exit 0; 55 Markdown files, 423 local links | Shared docs and sibling links are reachable. |
| `git diff --check` in both repositories | Exit 0 | No whitespace errors in tracked diffs. |

These fixtures do not establish hosted PostgreSQL behavior, Deno type/runtime compatibility, deployed Edge configuration, R2 upload/object existence, or real browser/device flows. No migration was applied to a live database and no function was deployed.

## Remaining release gates and rollout

Regenerate both apps' database types and run coordinated web, SQL, contract and mobile type checks against the intended companion revision. Run documentation and final-diff checks. Then perform a reviewed staging migration and authenticated owner/current-coach/unrelated-account round trips, including reassignment, legacy denial and URL expiry; verify R2 bucket CORS and the function service-role secret. Confirm actual object metadata/size enforcement and failure cleanup separately; this implementation stores declared metadata only.

No production release is authorized by this evidence. For release, coordinate a short media endpoint maintenance window: apply the registry/trigger migration, deploy both `r2-presign` and `r2-get-url`, verify the new paths, then restore media endpoint access. The old playback handler can issue URLs from writable references, so it must not remain active after the new attachment migration is enabled. Existing signed bearer URLs cannot be revoked and can remain valid for up to their original expiry.
