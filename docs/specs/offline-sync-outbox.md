# Offline delivery contract

Implemented in TRACE-client (Expo/React Native), not the coach web app.

## Persistence and ownership

`trace-outbox.db` stores JSON entries keyed by client-generated UUID. Entries include table, payload, owner, revision, status, attempts and last error. Zustand mirrors durable records. Logging awaits the session and set writes before marking a set complete. Session duration snapshots may be refreshed after earlier snapshots synced; the server keeps the maximum duration and completion timestamp.

New sets carry explicit ownership. Legacy sets inherit ownership from their stored session. Ownerless orphan entries are retained but never transmitted; diagnosing such legacy data requires recovering its original parent, never guessing an account. No sign-out operation clears another account's pending data.

## Delivery lifecycle

- One worker across remounts and account changes. Its HTTP client is bound to the captured account token; before each item it verifies that account is still signed in.
- A restarted worker changes interrupted `syncing` entries back to `pending`.
- Parent sessions precede sets. A failed, missing or exhausted parent defers its children without consuming their attempts.
- Session delivery uses `sync_workout_session(jsonb)`, an ownership-checked RPC that cannot alter coach feedback. Set/nutrition upserts use their stable UUIDs. Replayed deliveries cannot create duplicate rows.
- An acknowledgement updates the SQLite entry only if its payload revision still matches. A later edit remains pending.
- Network/auth/enqueue/app-resume events trigger work while online and active. Transient failures retry after 1, 2, 4 and 8 seconds, up to five attempts; the backoff helper is capped at 30 seconds. Exhausted records remain saved for manual retry.
- The banner exposes pending count, delivery failures and Retry sync. Storage failures are surfaced rather than represented as successful saves.

## Offline reads

Workouts cache real template and exercise IDs per account and selection. Offline logging needs an earlier download. A server response saying an explicit workout is missing invalidates its cache instead of selecting a replacement. Backend errors are visible. Cached profiles let a previously authenticated user reopen the app offline; no cache grants server permissions.

## Automated and device verification

The client tests cover ownership, parent failure, retries, concurrent workers, interrupted delivery, newer revisions and cache isolation. TRACE database tests cover repeated session delivery under real RLS. Device QA must additionally exercise airplane mode, force quit, foreground resume, token expiry and SQLite storage failure. PGlite and in-memory queue tests do not prove native-device behavior or background delivery.
