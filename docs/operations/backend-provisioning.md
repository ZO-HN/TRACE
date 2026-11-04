# Backend provisioning

Status: maintained procedure; target deployment unverified. Owner: TRACE maintainers. Updated: 2026-10-31. Sources: canonical migrations/functions, existing scripts and diagnosis. Execute only for the intended authorized environment.

## Local reproduction

Use the Node version in CI (currently 24), install with `npm ci`, and run `npm run test:db`. This replays canonical SQL with minimal auth fixtures in disposable PGlite without live credentials. For full local Supabase services, use Docker and `npx supabase start`. `npx supabase db reset --local` is only for a disposable local database; optional example seed data is separate from production setup.

## Staging/production procedure

1. Identify target project/environment and compatible app revisions. Inspect canonical pending migrations and existing migration history; deployments that previously used drafts need definition comparison rather than blind replay. All new SQL comes from TRACE.
2. Establish a restorable backup and [recovery plan](recovery.md). Link the CLI to the intended project, inspect `npx supabase db push --dry-run`, and apply reviewed pending migrations with `npx supabase db push` under the release task.
3. Confirm required RPCs/policies exist before shipping dependent clients. The September baseline/reliability migrations introduce canonical mobile structures/session delivery; later migrations, including idempotent coach claim, must also be considered. Follow actual pending order, not a fixed two-file historical recipe.
4. Configure Auth site/redirect URLs, email and Google providers for the intended web/native callback paths. Apple is intentionally unavailable in the inspected UI. Presence of environment names is not proof of working providers.
5. Bootstrap the first authorized coach/admin through a privileged, audited project operation: allowlist the intended signed-in email and promote its matching profile to coach/platform-admin. Verify identity/target first; ordinary client updates cannot grant these privileges. Subsequent coaches use the allowlist workflow.
6. Provision private R2 storage and server-only secrets. Deploy the required `r2-presign`, `r2-get-url`, `send-push-on-message`, and `trace-brain` functions at the release revision. Follow [media contract](../../supabase/functions/r2-presign/README.md). Repair diagnosed entitlement/CORS gaps before accepting affected paths. Coach Brain remains a placeholder even if a provider key is set.
7. Configure push project/native credentials, webhook authentication/gateway behavior, and database triggers deliberately. Test actual SDK/Edge preflight separately from bucket CORS. Do not assume a webhook secret bypasses gateway JWT validation.
8. Build clients with the intended public project URL/key; keep service-role, R2 and TRACE-owned AI keys only in approved server secret storage. Run [cross-app acceptance](../qa/cross-app-acceptance.md).

## Completion evidence

Record migration head, deployed function revisions, Auth redirects/provider tests, object privacy/CORS/retention verification, push receipt tests, and both app revisions using the [release template](../templates/release.md). Local tests do not establish live schema or deployment health. Retain pending client data throughout rollout and rollback.
