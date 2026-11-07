# Offline persistence and delivery

Status: implemented mobile contract; native release acceptance remains required. Owner: TRACE maintainers. Updated: 2026-10-31. Sources: TRACE-client `src/lib/outbox/`, draft/cache modules, SQL session RPC, and diagnosis. Scope: workouts/sessions/sets and nutrition; cardio/steps/check-ins/media remain online operations. Media has a separate metadata-only owner/operation upload journal and explicit same-key recovery, not a guaranteed background transfer; see the [media contract](../../supabase/functions/r2-presign/README.md).

## Durable ownership

Coach-program opens persist an account-scoped exact operation before requesting an immutable prescription. Unknown outcomes resume through **Confirm previous program open**; changed pending content is rejected. Offline schedule metadata is separately labeled and cannot manufacture a workout: opening offline needs a matching previously issued grant and downloaded exact-template cache, while active drafts resume independently. Program/group/source edits and membership removal never rebind existing session/set IDs or rewrite their captured prescription. Issued copies remain owned recovery capabilities, not a claim of retrospective offline revocation. [Program evidence](../qa/live-coach-programs-2026-11-08.md) records native and hosted acceptance still required.

`trace-outbox.db` stores JSON records with stable UUID, table, payload, owner, revision, status, attempts, and error. Zustand mirrors durable state. Await session/set/nutrition writes before success. Preserve failed input and records; ownerless legacy orphans remain retained but are not transmitted under a guessed account. Sign-out/account switching must preserve other accounts' unsent work.

## Lifecycle

One worker serializes delivery across remounts/account changes. Its client uses the captured account token and verifies the active account before each item. Interrupted `syncing` records recover as pending. Parents precede sets; missing/failed/exhausted parents defer children without consuming their retries.

Session delivery uses `sync_workout_session(jsonb)` with ownership checks and protection for coach feedback. Session duration/completion snapshots preserve the server's maximum progress. Set/nutrition upserts reuse stable UUIDs. Acknowledgement applies only to the matching local revision, so a newer edit remains pending.

Saved/planned meal intake uses `enqueueNutritionBatch`: validate all rows and one captured owner, then insert every new queue row in one exclusive SQLite transaction. Do not report individual foods as saved before that transaction commits. Matching IDs/payloads reconcile an uncertain completed batch; any conflict or partial pre-existing batch fails without replacing records. Preserve the original IDs and timestamp for retry. Update the UI mirror after durable persistence. Delivery to the server remains individually acknowledged nutrition upserts, not an atomic cloud meal write. Storage backends without the batch operation fail explicitly instead of falling back to partial writes. See [saved-meal evidence](../qa/nutrition-delivery-2026-11-07.md); native rollback/restart verification remains required.

Enqueue/auth/network/app-resume events trigger delivery while active and online. Automatic retry delays are 1, 2, 4, and 8 seconds before the fifth failed attempt; the backoff helper caps at 30 seconds. Exhausted entries remain durable for manual retry. The banner reports pending/failures. This is foreground/resume delivery, not a guaranteed OS background service.

## Cached reads and conflicts

Downloaded workouts use real template/exercise IDs and account/selection-scoped caches. First use needs a connection. An explicitly missing workout invalidates that selection instead of substituting another one. Cached profiles permit previously authenticated offline reopening but grant no server permissions. Distinguish network failure from missing/empty data.

Revision-aware queue acknowledgement protects local edits; it is not a general cross-device merge protocol. Define server conflict handling before expanding editable offline features. Pruning synced records needs an explicit retention policy preserving pending work and relevant local history; diagnosis D24 identifies unbounded retained entries as a concern.

## Acceptance

Run outbox/cache tests and the SQL retry/isolation scenarios, then [shared acceptance](../qa/cross-app-acceptance.md) on a real device: airplane mode, force quit/reopen, storage failure, token expiry, lost responses, account switching and manual retry. In-memory/PGlite tests establish only their boundaries. [Architecture evolution](../planning/architecture-evolution.md) proposes broader local caching without replacing durable delivery.
