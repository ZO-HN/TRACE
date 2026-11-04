# Operations, incidents, and recovery

Status: required operating procedure; monitoring/restore capability not established by this documentation. Owner: TRACE maintainers; assign a named release/incident owner in each task. Updated: 2026-10-31. Source: diagnosis D22/D24 and cross-app release requirements.

## Before release

Record environment identity, app/function revisions, migration head, backup mechanism/retention and restore access. Demonstrate a restore into an isolated environment and record date/result before claiming recoverability. Identify where to inspect Auth/API/RPC errors, queue age/failures, media authorization/cleanup and push receipts. Select alert thresholds from actual baselines and record who responds; no installed observability vendor is implied.

## During a failure

1. Record time, impacted flow/accounts, revisions, errors and reproduction boundary without secrets or personal health content.
2. Preserve pending SQLite work, server records and relevant sanitized logs. Distinguish permission denial, unavailable service, invalid input and missing data.
3. Contain the failing feature with an authorized rollback/disable action. A client rollback should remain compatible with the additive schema; inspect migration effects before any database reversal.
4. Reproduce in staging and repair with targeted regression/acceptance checks. Media entitlement issues need cross-account tests; sync issues need lost-response/restart tests.
5. Verify recovery through the intended real transports, compare known totals/records, and record impact, fix revision, remaining gaps and follow-up tasks.

## Data and object recovery

Choose database restore or forward repair based on the actual migration/data loss and approved recovery plan. Verify restored ownership/RLS and compatibility before serving traffic. Object storage recovery/retention is separate from PostgreSQL; reconcile metadata and objects using trustworthy ownership. Deletion/orphan cleanup must preserve records needed for pending uploads and authorized user recovery. Never clear failed queues to produce a healthy-looking status.

Use [release evidence](../templates/release.md) for restore drills and deployment recovery results. Current backup, alerting and retention state remains unverified until that evidence exists.
