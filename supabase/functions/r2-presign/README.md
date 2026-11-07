# R2 upload, verification and playback contract

Status: implemented locally; focused checks pass, current aggregate pending, not deployed. Owner: TRACE maintainers. Updated: 2026-11-08. Sources: the three R2 handlers, shared mediaPolicy/verifyMedia helpers, canonical entitlement/finalization migrations. See [storage decision](../../../docs/architecture/decisions/0001-media-storage.md), [D01 evidence](../../../docs/qa/media-entitlement-2026-11-05.md) and [current finalization evidence](../../../docs/qa/media-finalization-2026-11-08.md).

## Upload and verification

Authenticated r2-presign preserves the original `{kind, filename?, contentType, sizeBytes}` V1 request/response. New clients send `{protocolVersion:2, ownerId, operationId, kind, filename, contentType, sizeBytes}`. V2 requires the captured authenticated owner, UUID operation, integer size and filename at most 255 characters. A service-only RPC binds the exact manifest to one extensionless `<kind>/<owner>/<operation>` key; changed reuse fails. Registry failure returns no URL. Success adds `protocolVersion:2,uploadHeaders` to `{uploadUrl,key,expiresIn:600}`. Clients send the exact signed Content-Type and If-None-Match:* headers. Uncertain PUT/412 verifies the SAME key, never automatically creating a replacement operation.

Kinds: form-video (50 MiB); meal-photo, coach-image, progress-photo (10 MiB); file (25 MiB). The shared policy owns MIME lists. Progress photos are owner-only; no coach timeline access is added.

Authenticated r2-finalize accepts `{key,ownerId}` for its registered owner and returns `{key,ready:true}` only after actual size/type/ETag and conditional range/signature-prefix checks. Prefix reads are bounded to 4096 bytes. Supported signatures are JPEG/PNG/WebP/HEIC/MP4/QuickTime/WebM/PDF. Ready metadata cannot be rebound. Subsequent finalize/playback HEAD-checks that the same object still exists with matching metadata/ETag. Verification failure returns bounded 409. These checks are not full decoding, malware scanning, transcoding, duration/resolution limits or quotas.

V1 PUT capabilities are mutable. An issued V1 source is therefore never signed directly for playback: verification seals a deterministic server-only `sealed/SHA256(original-key)` copy with source-ETag and destination write-once conditions, verifies it and binds readiness once. Originals/references are retained. Unsupported/failed copy, missing object or mismatch fails closed, without a mutable-source fallback or whole-video proxy. The [R2 conditional-copy extension](https://developers.cloudflare.com/r2/api/s3/extensions/) marks destination conditions beta; actual bucket acceptance is required. Verify actual [presigned header binding](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) and PUT/range/ETag behavior before rollout.

## Attachment and read permission

Authenticated r2-get-url accepts `{key}` and returns `{url,expiresIn:600,contentType}`. It checks caller-scoped can_access_media_identity before object access, verifies/seals the object, rechecks can_view_media and signs only its immutable verified key. A relationship change during verification cannot grant a new URL. Issued bearer URLs expire normally.

- Owners can view their issued verified media. Unregistered legacy references stay stored but receive no new URL; trustworthy ownership verification or reupload is required.
- Current coaches can view attached per-set and historical standalone form videos. Former coaches get no new URLs.
- A current coach can view a file explicitly attached by its trainee to a check-in audited to THAT coach. Reassignment does not grant the new coach access to earlier check-in files. Other files/progress photos remain owner-only.
- New/changed attachments enforce registered owner/kind and V2 readiness. Unchanged historical references remain stored without becoming viewable. Coaches cannot substitute submitted form identity or attach a known unsubmitted trainee key.

save_progress_photo, submit_form_check and set_verified_avatar are owning-account transactions with exact operation receipts. Lost-response retry does not duplicate rows, revert photo corrections/coach review, resurrect removed submissions or reapply an old avatar over a newer one. Avatar writes compare the expected previous key. RLS and compatible legacy writes remain; a client reference alone never grants entitlement.

## Client recovery

Mobile journals captured owner/operation/local date/file metadata BEFORE presign, issued key BEFORE PUT and readiness BEFORE returning an attachment result. Recovery is explicit/paged and verifies the same key before using it for a current permitted target. Form submissions retain original exercise/operation. Workout clips are durably saved to the selected unfinished session draft before set completion can include them. Account/setup/target changes invalidate late attachment. The journal stores metadata/local URI, not another whole-video copy: if temporary local bytes disappear BEFORE upload, reselecting the source may be required; uploaded verified objects recover without local bytes. No OS background upload guarantee is claimed.

Web avatars retain per-owner operation metadata in localStorage before PUT. After reload, uploaded objects can be verified/confirmed without the original File. Old completed receipts never reapply an old avatar. Storage failures block a new upload. URL hooks hide old-account/key responses, expose reload and clear expired links; returned content type supports extensionless file images. Native/browser/storage behavior still needs acceptance.

## Provisioning and rollout

All three functions need server configuration SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET. No service/storage secrets belong in clients. Use a private bucket/least privilege. Bucket CORS must allow intended origins, PUT and actual Content-Type/If-None-Match headers; Edge SDK OPTIONS/CORS is separate. Three handlers share POST/OPTIONS and authorization/apikey/content-type/x-client-info. Auth failures are 401, entitlement 403, verification 409, internal/config/database failures generic 500.

Follow [cross-app rollout](../../../docs/operations/cross-app-rollout.md): reviewed backup/restore and compatibility first; migration and all three functions under controlled maintenance BEFORE V2 clients. Old deployed get-url must not keep issuing unchecked mutable URLs during transition. Actual Auth/PostgREST/RLS, concurrent retries, Deno, conditional-copy beta/range/ETag, legacy/foreign/former denials, browser SDK/R2 CORS, native upload/playback and bearer expiry are release gates. Cleanup, retention and deletion remain separate; originals/journals are not pruned.
