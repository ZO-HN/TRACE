# Vault resource delivery design

Status: implementation-ready design; no application or schema implementation is included here. Owner: TRACE maintainers. Date: 2026-11-08 SGT. Scope: a coach uploads one verified file, explicitly publishes it to one named currently linked trainee, that trainee lists and opens only that resource, and the publication is revoked when the coach relationship ends. This uses the approved selected-trainee private pilot. TRACE HEAD: `b11fcab2d9282595c073b67ef5ce5bee5d87e668`; TRACE-client HEAD: `9b123120bb8564e2522c1c15bc4acf4d78987449`. Both are dirty working trees; current source includes uncommitted media finalization and other cross-app work, plus thesis/UI edits. Preserve those edits. The current media finalization files were inspected read-only and remain owned by the coordinator.

## Pilot decision and boundaries

- A publication names exactly one trainee returned from the coach's current linked-client roster. The coach may make a separate explicit publication for another named trainee; there is no multi-select or bulk operation.
- The only pilot resource type is an uploaded private file using existing R2 kind `file`: PDF, JPEG, PNG, or WebP, up to 25 MiB. External URLs, video, `progress-photo`, group/tenant access, “all clients”, and public access are outside the pilot. Future support for those audiences and external links remains an explicit product decision.
- A resource is private to its coach until published. A folder organizes coach resources but does not grant access. Existing `vault_folders.visibility` and `client_ids` are legacy presentation metadata: neither `all` nor `specific` may authorize resource reads or URLs. The pilot UI must say access is assigned per resource and must not present “All clients” as a working delivery option. Keep the existing folder rows and schema intact.
- Publication history is retained. Relationship end marks matching active publications revoked; it does not delete resource rows, publication rows, upload receipts, or pending local recovery records. Re-linking later does not reactivate an old publication; the coach must publish again under a new operation.
- No push/email notification or offline binary cache is added. The trainee refreshes the library while online. Cached metadata, if introduced later, is never authority to open a file.

## Existing implementation boundaries inspected

`VaultPage` and `useVaultFolders` currently create/list/delete rows in `vault_folders`; the only policy is coach-owner access. There is no resource row, recipient grant, or mobile Vault/resources route. The create-folder dialog currently offers “All clients” and “Specific clients”, but those values do not create a trainee-readable folder under current RLS.

The coordinator's current working tree contains `20261108010000_media_finalization.sql`, V2 upload registration in `r2-presign`, and `r2-finalize`. V2 presigning binds the authenticated owner, stable upload operation, kind, MIME type, and declared byte count. `register_media_upload` assigns `file/<owner>/<operation>`; the PUT is signed with `Content-Type` and `If-None-Match: *`. Finalization reads the actual R2 HEAD metadata, compares actual size/type to the registered manifest, conditionally reads at most the first 4096 bytes for the supported file signature, and records immutable ready metadata through `mark_media_ready`. The verifier does not fully parse documents or scan for malware. A resource create must require a V2 row already in `ready` state with `verified_key = object_key`; it must not accept a pending row or grandfather V1/unknown legacy keys.

`r2-get-url` checks `can_access_media_identity`, verifies the registered object, rechecks ready-state `can_view_media`, then signs a GET for up to 600 seconds. The current `file` branch in `can_access_media_identity` authorizes only an attached check-in file. Resource publication must be added as a second exact authorization path in that SQL function; do not add a broad `kind='file'` owner/coach shortcut. Current signed URLs remain bearer links until their 600-second expiry, so relationship revocation blocks new URLs immediately but cannot cancel a URL already issued.

Mobile already has V2 file policy, `useMediaUrl`, and `MediaViewer`; on an unknown key kind the viewer exposes an “Open attachment” action, suitable for the supported PDF path. `useOwnedMediaPages` provides owner-scoped focus loading, a 50-row keyset page, load-more, refresh, and visible error state. Training is an existing mobile tab and can link to one new `/resources` route. Existing upload code keeps metadata and file URI in an owner-scoped AsyncStorage journal rather than storing file bytes. The web has only a specialized avatar V2 uploader; Vault needs its own file upload/recovery flow.

## Minimal schema and RPC contract

Add one canonical migration, proposed path `supabase/migrations/20261109000000_vault_resource_delivery.sql`. Names below are the agreed design for the implementation handoff.

### Tables

`public.vault_resources` is the immutable coach-owned file record:

| Column | Contract |
| --- | --- |
| `id uuid primary key` | Stable resource ID generated before the create RPC. |
| `create_operation_id uuid not null unique` | Stable create/retry identity; the V2 upload operation may use the same UUID. The resource row is the create receipt. |
| `coach_id uuid not null references profiles(id)` | Must equal `auth.uid()` and be a coach. |
| `folder_id uuid null references vault_folders(id) on delete set null` | Optional coach-owned organizer only; never part of the access predicate. |
| `title varchar(150) not null`, `description text null` | Display metadata; trim title and bound description. |
| `filename varchar(255) not null` | Sanitized display/download name only; never used as a path or authority. |
| `media_key text not null unique references media_objects(object_key)` | Must name a ready V2 `file` object owned by this coach, with canonical key and actual metadata recorded by finalization. |
| `created_at timestamptz not null default now()` | Immutable creation order. |

Do not duplicate MIME type or byte count in client input; return those from the server-owned `media_objects` row. Do not add edit/replace/delete behavior in the pilot. A corrected file creates a new resource; existing media and rows are retained.

`public.vault_resource_publications` is both the access grant and its durable publish receipt:

| Column | Contract |
| --- | --- |
| `id uuid primary key` | Stable publication ID generated before the RPC. |
| `publish_operation_id uuid not null unique` | Stable retry identity; exact replay returns the same publication ID and never reactivates a revoked row. |
| `resource_id uuid not null references vault_resources(id) on delete restrict` | Exact immutable resource. |
| `coach_id uuid not null references profiles(id)` | The owning publisher. Must match the resource owner and authenticated coach. |
| `trainee_id uuid not null references profiles(id)` | The one named recipient. |
| `published_at timestamptz not null default now()` | Stable feed ordering. |
| `revoked_at timestamptz null`, `revocation_reason text null` | Set by the relationship-end trigger; rows are retained. |

Add a partial unique index on `(resource_id, trainee_id) WHERE revoked_at IS NULL` so one resource has at most one active publication to a trainee. After a prior grant is revoked, a later, currently linked republish can create a new row with a new operation. Index owner resources by `(coach_id, created_at desc, id desc)` and recipient grants by `(trainee_id, published_at desc, id desc)`.

Enable RLS. Grant authenticated users `SELECT` only. Coach reads are limited to their own resources/publications. Trainee resource reads require an active publication addressed to `auth.uid()` and a current `profiles.coach_id = publication.coach_id` relationship. Trainee publication reads use the same active/current-link predicate. Revoke direct client `INSERT`, `UPDATE`, and `DELETE`; all writes go through the two RPCs. Do not grant access through `vault_folders.visibility`, `client_ids`, groups, or tenant membership.

### `create_vault_resource`

```sql
create_vault_resource(
  p_operation_id uuid,
  p_resource_id uuid,
  p_coach_id uuid,
  p_folder_id uuid,
  p_title text,
  p_description text,
  p_filename text,
  p_media_key text
) returns uuid
```

Require authenticated coach identity/role; stable non-null IDs; title, description, and filename bounds; an optional folder owned by that coach; and a matching `media_objects` row locked for read with `owner_id = auth.uid()`, `kind = 'file'`, `protocol_version = 2`, `state = 'ready'`, `verified_key = object_key`, and non-null verified size/type/ETag. The stored media policy remains authoritative for MIME and size. Normalize an exact request JSON from all resource fields. A matching operation replay returns the existing resource ID. Reusing the operation or resource ID for different owner/content fails. An unknown outcome is retried with the same operation/resource IDs and request. No resource becomes visible before finalization and this RPC commit.

### `publish_vault_resource`

```sql
publish_vault_resource(
  p_operation_id uuid,
  p_publication_id uuid,
  p_coach_id uuid,
  p_resource_id uuid,
  p_trainee_id uuid
) returns uuid
```

Require authenticated coach identity/role; lock the trainee profile `FOR SHARE`; verify the named profile is a trainee with `coach_id = auth.uid()`; and lock the resource `FOR SHARE`, verifying its coach owner and ready file registration. The stable operation replay compares the entire owner/resource/recipient request and returns the prior publication ID without changing revocation state. New operations create exactly one recipient grant; reject an existing active grant rather than silently creating duplicates. A different linked trainee needs a separate explicit call and operation ID. Do not enqueue notification delivery.

### Relationship end and URL authorization

Add an `AFTER UPDATE OF coach_id, role ON profiles` trigger. When a trainee's coach changes, becomes null, or the row ceases to be a trainee, set `revoked_at = now()` and `revocation_reason = 'coach_link_ended'` on that trainee's still-active publications from the old coach. Do not delete history. The publish RPC's `FOR SHARE` profile lock serializes with relationship updates: a completed publication is subsequently revoked by the trigger, or a publish that waits on an already changed profile fails its current-link check.

Replace the body of `can_access_media_identity(text)` in the same migration, retaining every current owner, form-video, and check-in `file` rule. Add one predicate requiring all of: media kind `file`; `media_objects.owner_id = vault_resources.coach_id`; the exact media key on an immutable resource; an unrevoked publication for that resource addressed to `auth.uid()`; and a current trainee profile whose `coach_id` equals that publication's coach. Keep the function caller-scoped and authenticated-only. Existing `can_view_media` continues to require `state = 'ready'`. This lets the existing `r2-get-url` authorize only the exact published key, then recheck access after verification before signing.

## UI and recovery flow

### Coach web

1. Keep the folder manager. Replace the folder audience wording with “Folders organize your library; publish each file to one trainee.” Do not migrate or reinterpret saved visibility arrays.
2. Add a file resource dialog in Vault with title, optional description/folder, and the existing `file` MIME/25-MiB limits. Show states `selected → uploading → verifying → saved`, and keep each error/retry attached to the same operation.
3. Before network I/O, persist an owner-bound upload journal entry in `localStorage` containing operation/resource UUIDs, title/description/folder, filename, type, size, key if issued, and phase. Never persist file bytes. Use `r2-presign` V2, direct PUT with exactly the signed headers, `r2-finalize`, then `create_vault_resource`. If an outcome is unknown, first finalize/check the same key and retry the same metadata operation. On reload, verify an existing key first; if no object exists and the original `File` is gone, require the user to reselect a file matching the saved filename/type/size. A different intended file gets a new operation. V2 binds owner/operation/manifest and is write-once, but the existing manifest does not prove byte-for-byte equality to a reselected same-size file; do not claim it does.
4. Show the saved private resource with a separate **Publish to trainee** action. Pick exactly one current `useClients` roster entry. Persist publication ID/operation/request before sending. Retry a lost response with the same IDs. On success, show the named trainee and publication status; reload the resource/publication page from server data.
5. Resource and publication lists use deterministic 50-row keyset pagination, ordered by `(created_at, id)` and `(published_at, id)` descending respectively. Include loading, empty, load-more, and visible load/retry states. Never use client offsets or array index as cursors.

### Trainee mobile

1. Add `/resources` with a single “Shared with you” list and link to it from the existing Training screen. Do not add a tab or merge resources into workout folders.
2. Query publication rows for the signed-in trainee through RLS, joining only the authorized `vault_resources` row. Use `(published_at, id)` descending, 50-row keyset pagination, focus refresh, stale-request/account guards, and visible retry/unavailable/empty states. Do not read folders or infer grants from folder visibility.
3. Open the exact row's `media_key` through the existing `MediaViewer`/`useMediaUrl` → `r2-get-url` path. Never construct an object key or store a long-lived URL. PDF/image rendering uses the verified content type and current attachment fallback. If an unlinked/revoked publication is cached in memory, it is not shown as current after refresh and cannot authorize a GET URL. Do not add an offline binary cache or allow offline cached metadata to imply current access.

## Smallest post-transfer implementation set

No implementation starts until the coordinator explicitly transfers the canonical schema slot. The coordinator remains responsible for generated types and the aggregate test/build slot unless those are separately transferred. After schema transfer, the bounded owned change is:

| Checkout | Exact source/test files |
| --- | --- |
| TRACE | New `supabase/migrations/20261109000000_vault_resource_delivery.sql`; new `src/hooks/useVaultResources.ts`, `src/lib/storage/vaultResourceUpload.ts`, `src/components/vault/ResourceUploadDialog.tsx`, and `src/components/vault/PublishVaultResourceDialog.tsx`; update `src/components/pages/VaultPage.tsx`; add `tests/database/vaultResourceDelivery.test.mjs`, `tests/hooks/useVaultResources.test.ts`, and `tests/components/vaultResourceDelivery.test.ts`. |
| TRACE-client | New `app/resources/index.tsx` and `src/hooks/useSharedVaultResources.ts`; update `src/components/TrainingScreen.tsx` with the route entry; add `tests/hooks/sharedVaultResources.test.ts` and `tests/components/sharedResources.test.ts`. Reuse current `useOwnedMediaPages`, `MediaViewer`, `useMediaUrl`, and upload `file` policy; do not edit `activeDraft.ts` or the coordinator-owned media upload/finalize files. |
| Generated/shared | Root runs the existing database type generator after the migration and updates both generated type files. Root owns the aggregate verification slot. |

## Focused acceptance to run after transfer

1. `tests/database/vaultResourceDelivery.test.mjs`: V2 pending/wrong-owner/wrong-kind media cannot create a resource; only ready V2 `file` rows can; matching create and publish retries return one row; mismatched retries fail; direct DML is denied; one currently linked recipient can list/open; unrelated, second trainee, and former relationship cannot; relationship change sets revocation while preserving rows; a new explicit publication after relink is distinct. Confirm existing check-in `file` access remains unchanged.
2. Web hook/component tests: pending journal survives failure/reload, same-ID retry, no success before finalize/create confirmation, one-recipient selection, visible publish retry, and no broad folder audience implied.
3. Mobile hook/component tests: exact publication query, stable pagination/no duplicates, loading/empty/error/retry, exact-key open, and revoked response handling without offline authorization.
4. Existing focused V2 media handler tests continue to cover presign, finalization and post-verification authorization. Then hand the migration to the coordinator for its aggregate SQL/type/contract/test/build slot.

This design is source-based and does not establish that the dirty finalization work is live. Hosted migration/RLS/Auth/PostgREST, R2 bucket behavior, browser upload, native mobile resource opening, link-revocation timing against real requests, and deployment remain separate acceptance gates. No progress-photo, retention, cleanup, deletion, group, tenant, public-media, or notification feature is included.
