# D23 Brain runtime validation and bounded failures

Status: implemented locally; deployment and live acceptance unverified. Owner: TRACE maintainers. Date: 2026-11-01, Asia/Singapore. Sources: actual handler inspection, [D23 diagnosis](diagnosis-2026-10-31.md#d23--p2--edge-body-validation-and-exception-handling-are-incomplete), [AI specification](../features/ai.md), and the commands below.

## Scope and baseline

This repair addresses only `trace-brain` runtime body validation and its error boundary. [Handler](../../supabase/functions/trace-brain/index.ts) and [focused regression](../../tests/edge/brainRuntime.test.ts) are the application/test changes. The [shared CORS module](../../supabase/functions/_shared/cors.ts) and [existing CORS regressions](../../tests/edge/cors.test.ts) were preserved unchanged. Media entitlement D01, progress-photo D05, standalone playback D06, actual-object policy D22, other handlers' D23 work, and inference/retrieval D07 remain open. No schema, mobile, provider, account, real message, migration or deployment operation was performed.

TRACE HEAD: `06675347e6b13085750cf319c3b66ffde4a6954e`, branch `codex/edge-cors-contract`. Companion TRACE-client HEAD: `774ab9df80d423d76f4d5d5c134ba731d10339a9`, branch `codex/trace-reliability`. Both checkouts already contained substantial uncommitted edits. Relevant pre-existing work includes shared Edge CORS, onboarding and SQL fixtures, dashboard cache source/tests, mobile nutrition/workout/outbox changes, documentation integration and unrelated thesis files. Those changes were preserved. Aggregate checks exercise the combined dirty web sources and are not evidence about either HEAD alone or a deployed release. No dependency installation, commits or pushes were performed.

## Runtime contract

After method/preflight and authentication handling, require a non-array JSON object and non-blank string `sessionId`/`content` before session lookup or drafting. Malformed JSON, null/array/primitive bodies, missing values and wrong field types return 400. Whitespace-only values are unusable and return 400; valid string bytes are not trimmed or otherwise rewritten. Extra fields and long strings remain accepted. No arbitrary length cap or UUID-format restriction was introduced.

Missing bearer credentials, invalid authentication and missing users retain 401. No RLS-visible session retains 403. A returned session-query error is an infrastructure failure (500), not evidence of an ownership denial. The caller bearer token still scopes the session query; service-role construction and ASSISTANT insertion occur only after this check succeeds. Missing/blank required configuration, rejected Auth/database calls and client construction failures return a generic 500. Returned insert errors and absent inserted messages retain the bounded `Could not save reply` error. All handled failures carry JSON plus the existing shared CORS policy; internal dependency error text, stack and secret values are not returned.

Valid requests retain `{ message }` and persist the same honest placeholder. Adding an LLM key does not implement inference. These separate session-read and insert operations are unchanged; this repair does not add transactional/idempotent message creation or change access policies.

## Verification

Commands executed from `C:\Users\imint\TRACE` against installed dependencies, sequentially for aggregate web checks, on 2026-11-01 SGT.

| Command | Actual result | Boundary |
| --- | --- | --- |
| `npx vitest run tests/edge/brainRuntime.test.ts tests/edge/cors.test.ts` | Exit 0; 2 files, 63 tests passed; began 00:07:57, duration 13.01s | 39 Brain runtime cases and all 24 unchanged CORS cases. Actual handler/shared module transpiled/executed with controlled external dependencies; installed SDK request construction covered by CORS tests. |
| `npm test` | Exit 0; 16 files, 139 tests passed; 00:08:50-00:09:01 | Combined dirty web test inventory; no live backend. |
| `npm run lint` | Exit 0; five existing Fast Refresh warnings; 00:09:01-00:09:03 | AppShell (two), toast, field and badge export warnings; no lint errors. |
| `npm run build` | Exit 0; 00:09:03-00:09:40; main JS 1,088.22 kB / 304.84 kB gzip; chunk-size and plugin-timing warnings | TypeScript/Vite compilation does not check deployed Deno handlers. |
| `Get-Command deno -ErrorAction SilentlyContinue` | Not found on PATH | Deno-native typecheck not run; no installation attempted. |
| `node scripts/check-documentation.mjs` | Exit 0; 46 Markdown files, 349 local links, all reachable | Local Markdown links/anchors/navigation only. |
| `git diff --check -- supabase/functions/trace-brain/index.ts docs/features/ai.md` | Exit 0 | Tracked-diff whitespace only. |
| `python -` scoped new-file whitespace check | Exit 0; three files | Checked trailing whitespace/final newline in `tests/edge/brainRuntime.test.ts`, `docs/features/ai.md` and this evidence record; these files are untracked in the baseline. |

Runtime cases cover numeric/object/null/array/string/missing values, malformed JSON, blank strings, authentication and access denials, missing/blank configuration, thrown SDK construction, rejected Auth/session/insert dependencies, returned database errors, missing reply data, and successful placeholder persistence after the caller-scoped session check. The successful case includes long content, preserved leading whitespace and extra fields. Failure assertions verify consistent CORS and bounded error-only responses without fixture exception details.

No SQL, generated type or mobile application behavior changed; database/type/contract/mobile suites were not rerun for this bounded assignment. Tests do not establish actual RLS enforcement, deployed secrets/gateway behavior, Deno-native execution, network/provider behavior or signed-in device operation.

## Source fingerprints

SHA-256 captured at 00:08:28 SGT, after a comment-only wording correction following the focused run. The aggregate test run includes that final handler source. These fingerprints identify dirty files, not an immutable release:

| File | SHA-256 |
| --- | --- |
| `supabase/functions/trace-brain/index.ts` | `41919D5A43A5CB82AC742D126FE5631427B431A31C3D3BE6470B2728EF1F117F` |
| `tests/edge/brainRuntime.test.ts` | `1E8B4C1DAA7D7F6B022209EA816ADDC078AB710F6F3E3E58A2A2ED58204F0EE6` |
| `tests/edge/cors.test.ts` | `906ECA68654C81459DB08A245152BCC18A66EC33D0C2A02396D7A7CE39722F03` |
| `supabase/functions/_shared/cors.ts` | `44851E80E7FDD5CC5ABEF3872772202BCB7ED4BEEF8BA318C3FA5C6B5B93E0CB` |

All four fingerprints were rechecked unchanged after aggregate verification and documentation checks. The final review preserved the existing method/preflight/auth/access checks, caller-scoped session lookup and success shape; no media or shared CORS source was edited.

## Release gates

Before deployment, run Deno-native checking in a supported environment and exercise deployed authenticated POST/OPTIONS, session-owner/unrelated-account denials, valid placeholder persistence, invalid bodies and bounded failures using dedicated staging fixtures. Deployment is a separate authorized release operation. There is no migration or client release dependency for this repair; retain the shared CORS module in the deployed function bundle. D23 is repaired locally only for the Brain scope; other handler/runtime gaps and all media policy work remain separate.
