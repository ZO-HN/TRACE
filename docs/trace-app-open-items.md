# TRACE cross-app rollout checklist

The architecture baseline is now documented in [trace_architecture.md](trace_architecture.md). Coach selection, personal programs and manual steps logging exist in TRACE-client; do not rebuild them from older handoff notes.

## Rollout order

1. Run coach tests, lint/build, `test:db`, `db:types:check` and `test:contracts`; run client tests/typecheck against the matching client checkout.
2. Compare the staging database with canonical migrations. If mobile draft tables already exist, reconciliation preserves them and existing named policies. Investigate any differing definitions before applying; do not blindly replay historical drafts.
3. Apply the two September reliability migrations in order, before releasing the new client. They add the canonical mobile baseline, safe session RPC, cardio aggregation, token-scoped sharing and profile/review write restrictions.
4. Release the coach dashboard and client. Existing session inserts still work; the new client requires the session RPC. No automatic migration of legacy cardio-typed workout sessions is performed.
5. Execute [cross-repo QA](qa-testing-cross-repo.md) on staging and a physical device. Verify R2 upload/playback and auth independently from SQL tests.

## Remaining product work

Native wearable ingestion, AI/RAG, solo mode, billing and new coaching features remain separate projects. Current steps logging is manual. Current cardio logging is online. Personal program enrollment is distinct from coach assignment.

## Operational checks

Check the mobile pending/failed banner after reconnection and app restart; retain failed data for retry. Check Supabase RPC errors and compare coach cardio totals to known `cardio_entries`. Confirm a shared private program remains usable after its source is deleted. Deployments are not implied by passing local tests.
