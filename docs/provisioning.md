# Backend provisioning

TRACE is the sole owner of `supabase/migrations` and `supabase/functions`. TRACE-client must never apply its historical draft SQL independently.

## Local reproducibility

From TRACE, install with `npm ci`, then run `npm run test:db`. This replays all canonical SQL in a disposable PostgreSQL/PGlite database with minimal Supabase auth fixtures and runs ownership/flow tests. It does not require Docker, secrets or a live backend.

For the complete local Supabase stack, start Docker, run `npx supabase start`, and use `npx supabase db reset --local`. Reset is for a disposable local database only. The optional seed contains example exercises and a sample coach page. Replaying migrations without fixtures can use `--no-seed`. Native auth, PostgREST, Realtime and R2 require their own smoke tests.

## Staging and production

1. Compare existing schema/migration history with the canonical files. Some deployments installed mobile drafts manually. `20260921000000_mobile_schema_baseline.sql` preserves matching existing tables and named policies; differing definitions must be reconciled deliberately.
2. Back up the target database and link the CLI to the intended project. Inspect `npx supabase db push --dry-run`, then apply reviewed pending migrations with `npx supabase db push`.
3. Apply `20260921010000_coaching_reliability.sql` before shipping the new client. It supplies `sync_workout_session`, changes cardio aggregation, fixes private program sharing and restricts profile/review writes. Existing pending session inserts remain valid, but the updated client requires the RPC.
4. Configure Auth URLs/providers and bootstrap the first coach/admin using the README. New trainees initially have no coach and use the coach-selection flow or web invite onboarding.
5. Deploy the required Edge Functions (`r2-presign`, `r2-get-url`, `send-push-on-message`, `trace-brain`) from TRACE. Follow each function's secret/header documentation. Configure R2 CORS for the actual dashboard/mobile-web origins and permitted upload requests. The Brain function remains a placeholder.
6. Build each app with the same project URL/public anon key. Never ship service-role or R2 credentials in app bundles.

## Compatibility and release checks

- Regenerate/check both database type files using `npm run db:types` / `npm run db:types:check`.
- Run `npm run test:contracts` with `TRACE_CLIENT_PATH` pointing at the matching client checkout.
- Run the [cross-app QA checklist](qa-testing-cross-repo.md) using two coaches and two trainees.
- Cardio summaries now count `cardio_entries` only. Do not dual-write or automatically backfill legacy cardio-typed workout sessions without establishing that they are not duplicates.
- After rollout, inspect pending/failed sync counts, RPC errors and known cardio totals. Retain failed local entries for retry. Revert app releases if needed; do not roll back the access restrictions or delete saved logs to hide a failure.

Local checks do not deploy or confirm production migration state.
