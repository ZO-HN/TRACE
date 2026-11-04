# R2 upload and playback contract

Status: implemented handlers with unresolved authorization/kind gaps; shared Edge CORS and runtime handling locally verified, staging pending. Owner: TRACE maintainers. Updated: 2026-11-01. Sources: `r2-presign/index.ts`, `r2-get-url/index.ts`, client media policy and diagnosis D01/D02/D05/D06/D22/D23. Storage boundary: [ADR 0001](../../../docs/architecture/decisions/0001-media-storage.md).

## Current API

Authenticated `r2-presign` POST body: `{ kind, filename, contentType, sizeBytes }`. Successful response: `{ uploadUrl, key, expiresIn: 600 }`. The handler validates declared size/type against its policy and generates `<kind>/<verified-user-id>/<uuid><extension>`. Client PUTs bytes directly to the signed URL, then saves the key/metadata through the appropriate authorized data operation.

Supported handler kinds: `form-video` (declared limit 50 MiB), `meal-photo` (10 MiB), `coach-image` (10 MiB), `file` (25 MiB). Read the handler for current MIME lists. Mobile `progress-photo` currently disagrees with this policy and is rejected. Declared metadata validation is not verification of actual stored bytes or successful finalization.

Authenticated `r2-get-url` POST body: `{ key }`. Successful response: `{ url, expiresIn: 600 }`. Current non-avatar authorization checks a visible set-log reference; this does not establish trustworthy foreign-object entitlement and does not cover standalone form checks/progress photos correctly. Do not describe this as complete secure playback.

Both handlers require JSON objects; malformed JSON, null/array/primitive bodies and invalid fields return bounded 400 errors before signing. Upload `kind` must name an own policy entry (inherited names such as `__proto__` and `constructor` are unknown); `contentType` must be an allowed string and `sizeBytes` a finite positive number within the existing declared limit. No new integer or length restriction is imposed. `filename` remains optional and may be empty; when supplied it must be a string, matching the mobile `PresignRequest` and web avatar caller rather than coercing objects/numbers/null into names. Playback `key` must be a non-blank string; valid key bytes are preserved without trimming, prefix enforcement or new entitlement rules. Additional fields remain compatible.

Missing/invalid authentication remains 401, and a successful lookup without a visible object reference remains 403. Missing/blank required configuration, rejected Auth/database/signing operations and returned database errors yield generic bounded 500 JSON responses with shared CORS and no internal error details. Method/preflight handling and both avatar/set-log access paths are preserved. See [D23 media runtime evidence and remaining gates](../../../docs/qa/media-runtime-2026-11-01.md). This error-handling repair does not resolve D01 or decide legacy-media treatment.

## Provisioning and acceptance

Provision a private bucket and least-privilege R2 credentials. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET` through backend secret storage. Supabase URL/public key are runtime configuration; no R2/service-role values belong in clients or committed docs. Deploy the reviewed functions under [backend provisioning](../../../docs/operations/backend-provisioning.md).

Configure bucket CORS for intended web origins, PUT/required read operations and actual content headers. This is separate from Edge preflight. `r2-presign`, `r2-get-url`, and `trace-brain` import the shared `../_shared/cors.ts` policy: origin `*`, methods `POST, OPTIONS`, and allowed headers `authorization, apikey, content-type, x-client-info`. OPTIONS runs before authentication; POST still requires the existing bearer-token checks. No cookie/credentialed-origin mode is introduced. Success and bounded JSON errors use the same policy. The R2 handlers now contain runtime exception boundaries; deployed behavior remains unverified.

Local regressions execute the actual handler source with controlled external services and capture requests from both installed app SDKs. They do not certify deployed gateway behavior or bucket configuration. See [D02 implementation evidence and staging gates](../../../docs/qa/edge-cors-2026-10-31.md). No request/response body, schema, or client release change is required by this CORS update.

Acceptance requires trusted upload ownership/attachment validation, permitted owner/coach playback, unrelated/known-foreign-key denial, supported kinds, expired links, malformed bodies, actual object policy, failed metadata cleanup and explicit retention/deletion. See [coaching acceptance](../../../docs/features/coaching.md) and [shared QA](../../../docs/qa/cross-app-acceptance.md). No bucket lifecycle, compression enforcement, or deployed credential validity is certified here.
