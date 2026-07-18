# Spec: Offline Session-Sync Outbox

> **Status:** Draft (Specify phase). Open questions in §9 are unresolved and gate the Plan phase.

## 1. Objective

Let a trainee log a full workout session with **no network** and have it reliably sync to Supabase once connectivity returns — no lost sets, no duplicates. Success = a session logged in airplane mode appears in Supabase `set_logs` after reconnect, exactly once.

**Reframed success criteria** (from "reliable offline sync"):

- A session logged fully offline persists across a hard page reload (IndexedDB, not memory).
- On reconnect, the outbox flushes automatically within 5s of the `online` event.
- Re-flushing an already-synced item is a no-op (idempotent — client UUID is the dedupe key).
- A failed flush retries with backoff and never drops the item.

## 2. Tech Stack

- Existing: React 19, TypeScript, Vite 8, `@supabase/supabase-js`, Tailwind v4, oxlint.
- New (needs approval — see §8 Boundaries): `zustand` (state), `idb` (IndexedDB wrapper), `vitest` + `@testing-library/react` (tests).

## 3. Commands

```
Dev:   npm run dev
Build: npm run build
Lint:  npm run lint
Test:  npm run test          # to be added with Vitest
```

## 4. Project Structure

```
src/lib/outbox/
  db.ts          → IndexedDB schema + open (via idb)
  outboxStore.ts → Zustand store: queue, status, flush actions
  sync.ts        → online-detection + flush-to-Supabase with backoff
src/hooks/
  useOutboxSync.ts → wires the store to window online/offline events
tests/outbox/    → Vitest unit + integration tests
```

## 5. Code Style

Matches existing repo idiom (see `src/hooks/useTraceUser.ts`): typed interfaces, no default exports for hooks, explicit return types.

```ts
export interface OutboxItem {
  id: string;            // client-generated UUID = idempotency key
  payload: SetLogInsert;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  attempts: number;
  updated_at: string;    // ISO
}
```

## 6. Testing Strategy

Vitest. Unit-test the store reducer logic and the backoff calculator in isolation; integration-test the flush path against a mocked Supabase client (assert idempotency + retry). Every acceptance criterion in §1 has a matching test.

## 7. Success Criteria

The four reframed criteria in §1, each backed by a passing test.

## 8. Boundaries

- **Always:** client-UUID as the dedupe key; run `npm run test` + `npm run lint` before commit; keep `estimated_1rm` (generated column) out of any write payload (per `useTraceUser.ts`).
- **Ask first:** adding `zustand` / `idb` / `vitest` deps; any change to the `set_logs` schema or migrations.
- **Never:** commit Supabase secrets; write to generated DB columns; drop items from the outbox without a synced or explicit-discard state.

## 9. Open Questions

1. **Web vs native** — confirm web PWA (IndexedDB). This is the load-bearing decision.
2. **Zustand** — adopt it now (spec says so), or start with a plain store to avoid a dependency?
3. **Vitest** — OK to add the first test framework to this repo?
4. **Conflict policy** — is last-write-wins (client UUID + `updated_at`) acceptable, or do coaches need a server-authoritative merge?
