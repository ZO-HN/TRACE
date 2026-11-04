# D23 R2 handler runtime validation and bounded failures

Status: implemented locally; deployment/live acceptance unverified. Owner: TRACE maintainers. Date: 2026-11-01, Asia/Singapore. Sources: actual handler inspection, [D23 diagnosis](diagnosis-2026-10-31.md#d23--p2--edge-body-validation-and-exception-handling-are-incomplete), [media API contract](../../supabase/functions/r2-presign/README.md) and executed checks below.

## Scope and baseline

This repair changes only runtime request/error handling in [r2-presign](../../supabase/functions/r2-presign/index.ts) and [r2-get-url](../../supabase/functions/r2-get-url/index.ts), adds [actual-handler regressions](../../tests/edge/mediaRuntime.test.ts), and updates the owning function contract. Existing shared CORS source/regressions and the prior [Brain-only D23 repair](brain-runtime-2026-11-01.md) were preserved unchanged. No SQL, generated types, mobile code, media registry, attachment enforcement, relationship/reassignment rule, legacy-media policy or new media kind was introduced. D01 remains open: a visible client-written reference still does not prove foreign-object entitlement. D05/D06/D22 remain separate.

Initial inspection: 2026-11-01 00:22:10 SGT. TRACE HEAD `06675347e6b13085750cf319c3b66ffde4a6954e`, branch `codex/edge-cors-contract`; companion TRACE-client HEAD `774ab9df80d423d76f4d5d5c134ba731d10339a9`, branch `codex/trace-reliability`. Both working copies have extensive uncommitted work, including shared CORS, Brain runtime handling, onboarding/database fixtures, dashboard cache/hooks, mobile nutrition/workout/outbox work and documentation integration; unrelated thesis material was preserved. Results describe combined dirty sources, not HEAD alone, an immutable release or deployed behavior. No dependencies were installed; no commits, pushes, real accounts/messages, provider calls, migrations or deployments were performed.

## Accepted behavior and compatibility

- Require non-array JSON objects before reading fields. Malformed JSON and null/array/primitive bodies return bounded 400 JSON before signing.
- Upload kind must be an own policy entry. Inherited names such as `__proto__`, `constructor`, `toString` and `hasOwnProperty` return `Unknown media kind` (400), rather than dereferencing prototype members as policy.
- Validate declared content type as an allowed string and size as a finite positive number within the existing per-kind limit. The kind/MIME/maximum-size policy is unchanged; `progress-photo` remains unsupported. No new integer or length restriction is introduced.
- Filename omission and empty strings remain compatible. A supplied filename must be a string; numeric/object/array/boolean/null values now return 400 instead of implicit string conversion. Both mobile `PresignRequest` and the web avatar caller provide strings. This tightening avoids treating malformed metadata as filenames without requiring a new client payload.
- Playback requires a non-blank string key. Preserve valid key bytes without trimming, new prefix requirements or entitlement rules. Both handlers still tolerate additional fields. Upload/read success response shapes and 600-second expiry remain unchanged.
- Preserve preflight/method/auth handling and the verified uploader prefix. Missing/invalid auth stays 401; a successful database lookup without a visible reference stays 403. Playback still uses caller-scoped profile/self-avatar or set-log reference queries. Returned database errors are infrastructure failures (500), distinct from invisible rows.
- Check non-blank Supabase URL/public key before SDK construction and all four R2 settings before signer construction. Missing configuration, rejected Auth/DB/signing calls and SDK/signer constructor exceptions return generic bounded 500 JSON with shared CORS and no internal error details.

Actual stored bytes, size/content verification, successful finalization, object existence, quotas, deletion and orphan cleanup are not established by these declared metadata checks. In particular, these changes do not secure the known-key D01 path or invent legacy ownership.

## Executed verification

Commands ran from `C:\Users\imint\TRACE` against installed dependencies. Aggregate web checks ran sequentially in the assigned slot; no SQL/mobile suites or competing browser/device sessions were started.

| Command | Actual result | Boundary |
| --- | --- | --- |
| `npx vitest run tests/edge/mediaRuntime.test.ts tests/edge/brainRuntime.test.ts tests/edge/cors.test.ts` | Exit 0; 3 files, 165 tests; began 00:24:30 SGT, duration 21.63s | 102 media runtime cases plus 39 unchanged Brain and 24 unchanged CORS cases. Actual handler/shared module execution after transpilation; external Auth/DB/signing controlled. |
| `npm test` | Exit 0; 17 files, 241 tests; 00:25:16-00:25:51 SGT | Combined dirty web test inventory. |
| `npm run lint` | Exit 0; seven warnings, no errors; 00:25:51-00:25:57 SGT | Five Fast Refresh export warnings in AppShell/toast/field/badge and two hook-ref cleanup warnings in useTemplateSave/useCoachPrivateWorkouts, all outside this repair's files. |
| `npm run build` | Exit 0; 00:25:57-00:29:09 SGT; main JS 1,090.74 kB / 306.40 kB gzip; chunk-size/plugin-timing warnings | Web TypeScript/Vite compilation does not check deployed Deno handlers. |
| `Get-Command deno -ErrorAction SilentlyContinue` | Not found on PATH | Deno-native handler checking not run; no installation attempted. |
| `node scripts/check-documentation.mjs` | Exit 0; 47 Markdown files, 358 local links, all reachable | Local links/anchors/navigation only. |
| `git diff --check -- supabase/functions/r2-presign/index.ts supabase/functions/r2-get-url/index.ts supabase/functions/r2-presign/README.md` | Exit 0 | Scoped tracked-diff whitespace. |
| `python -` scoped new-file whitespace check | Exit 0; two files | Trailing whitespace and final newline checked in the new media runtime test and this evidence record. |

Cases cover malformed bodies and field types, inherited/unknown kinds, declared-size boundaries, all four allowed kinds, omitted/empty filename compatibility, invalid auth/missing user, missing/blank configuration, rejected SDK/Auth/DB/signer dependencies, returned DB errors, both current avatar/set-log denied and success paths, trusted uploader prefix and exact success shapes. Error assertions verify consistent CORS and bounded error-only JSON without fixture secret/stack details. Non-finite JavaScript fixture values serialize to JSON null and are rejected; the handler also explicitly checks finiteness.

SQL/type/contract/mobile suites were not rerun because this assignment changes no schema or client contract shape. No live Supabase, R2, provider, gateway, bucket CORS or signed-in device round trip was attempted.

## Source fingerprints

SHA-256 captured after focused verification, before aggregate verification. These identify dirty source bytes rather than an immutable release:

| File | SHA-256 |
| --- | --- |
| `supabase/functions/r2-presign/index.ts` | `E86914E36D177E6AE224C0F8F9A8E02903F0169B12B969F1EAB6C56A1C39E165` |
| `supabase/functions/r2-get-url/index.ts` | `0D76420C1DEC8502524D43328A55C14F5E3AABF137E4CCF9286A90F9EC9DB1BB` |
| `tests/edge/mediaRuntime.test.ts` | `EB2F2B4206C7C6ADAD366EEB2FAD1EF71C72858D2FE3D8838E018F810FB76A99` |
| `tests/edge/cors.test.ts` | `906ECA68654C81459DB08A245152BCC18A66EC33D0C2A02396D7A7CE39722F03` |
| `supabase/functions/_shared/cors.ts` | `44851E80E7FDD5CC5ABEF3872772202BCB7ED4BEEF8BA318C3FA5C6B5B93E0CB` |
| `supabase/functions/trace-brain/index.ts` | `41919D5A43A5CB82AC742D126FE5631427B431A31C3D3BE6470B2728EF1F117F` |
| `tests/edge/brainRuntime.test.ts` | `1E8B4C1DAA7D7F6B022209EA816ADDC078AB710F6F3E3E58A2A2ED58204F0EE6` |

All seven hashes were rechecked unchanged at 00:28:16 SGT, as were both HEADs. Brain/CORS hashes match the prior Brain evidence record. Source review confirmed unchanged successful response shapes, declared kind/MIME/size limits, verified uploader identity and the two existing playback lookup paths.

## Remaining release gates

Run Deno-native checks in a supported environment and separately verify deployed method/preflight/auth/body/error behavior and direct R2 upload/playback with dedicated staging fixtures. Real RLS and signing failures need staging evidence; a fixture pass establishes only its tested boundary. No migration or mobile release is required for these compatible runtime changes; any later authorized function deployment must include the shared CORS module. Deployment is not performed by this task. D01 entitlement/legacy-policy work and D22 actual-object policy remain open regardless of these checks.
