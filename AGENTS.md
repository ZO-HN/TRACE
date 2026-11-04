# Working in TRACE

TRACE owns the coach web app, canonical PostgreSQL migrations, shared contracts, and Supabase Edge Functions. The sibling `TRACE-client` repository owns trainee mobile screens and device persistence. Start with [documentation navigation](docs/README.md).

## Read by change

| Change | Read before editing |
| --- | --- |
| Product behavior | Relevant [feature specification](docs/features/README.md); [current diagnosis](docs/qa/diagnosis-2026-10-31.md) for known gaps |
| Schema, auth, RPCs, permissions | [Shared contract](docs/architecture/client-contract.md), canonical migrations, affected SQL tests |
| Queues, retries, cached reads | [Offline contract](docs/architecture/offline-sync.md) |
| Media | [Media decision](docs/architecture/decisions/0001-media-storage.md), [function contract](supabase/functions/r2-presign/README.md) |
| Caching, performance, AI redesign | [Target architecture proposal](docs/planning/architecture-evolution.md); inspect current code before treating a proposal as implemented |
| Deployment/migrations | [Cross-app rollout](docs/operations/cross-app-rollout.md) |

## System constraints

- Change shared SQL only in `supabase/migrations`; preserve compatibility with released mobile clients. Use transactional, ownership-checked RPCs for aggregate writes.
- Enforce authorization through RLS and scoped server operations. Public keys belong in clients; service-role, storage, and application-owned AI credentials belong on the server.
- Preserve account isolation, stable IDs, pending local records, and historical nutrition/workout values. Planned and performed workouts are distinct; coach catalogs and trainee personal programs are distinct.
- Generate database types with the existing generator; edit the schema rather than generated files. Run coordinated checks against the intended companion revision.
- Inspect the existing working tree and preserve unrelated edits. Keep each task within its acceptance criteria.

## Verification and completion

- Web application changes: `npm test`, `npm run lint`, `npm run build`.
- Shared schema/contracts: additionally `npm run test:db`, `npm run db:types:check`, `npm run test:contracts`, and affected mobile tests/typecheck from the companion checkout. Set `TRACE_CLIENT_PATH` when it is not the sibling directory.
- Edge changes: additionally validate runtime bodies/auth/CORS and run appropriate handler/staging checks; Vite compilation does not typecheck or exercise deployed Deno handlers.
- Documentation changes: `node scripts/check-documentation.mjs`; update affected links and navigation. Application suites are required when application code is also changed.
- Follow [development workflow](docs/development/workflow.md). Report the actual commands/results, skipped checks, relevant device/staging gaps, and release order. Update the owning specification/contract with changed behavior. A mock, build, or fixture pass establishes only its tested boundary.
