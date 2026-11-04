# Cross-app rollout

Status: maintained release procedure. Owner: TRACE maintainers. Updated: 2026-10-31. Sources: existing CI/contracts, diagnosis and current migration inventory. No release is performed by following this document in a planning task.

## Compatibility and order

1. Select exact web/mobile revisions and intended backend environment. Record dirty-tree context if building local changes. Existing CI companion refs default to moving `master`; select/record a coordinated ref and verify the exact checked-out SHA.
2. Run web test/lint/build; shared SQL/type/contract checks; mobile tests/typecheck; documentation checker. Use matching companion sources. Add handler/payload/device checks for the changed area.
3. Review pending migrations, current schema, backup/restore evidence and access risks using [provisioning](backend-provisioning.md). Add compatible schema/RPC support before dependent client releases. Keep older supported phones working; breaking removals need an explicit deprecation/support decision.
4. Deploy required function changes and verify their runtime auth/body/CORS contracts. Apply reviewed migrations in canonical pending order. Record any dependency between SQL and function versions; do not expose half-compatible public flows.
5. Release web through [web procedure](web-deployment.md) and mobile through [mobile procedure](../../../TRACE-client/docs/operations/mobile-release.md). Version/store rollout is independent; verify supported combinations rather than assuming simultaneous updates.
6. Run [shared acceptance](../qa/cross-app-acceptance.md) and [mobile acceptance](../../../TRACE-client/docs/qa/mobile-acceptance.md) with dedicated roles/accounts. A staged flow that meets a known finding's closure criteria can be recorded as fixed with its revision/evidence.
7. Record [release evidence](../templates/release.md), actual deployment result, remaining gates, and monitoring owner.

## Observe and recover

Observe API/RPC errors, sync backlog/retry age, known nutrition/cardio totals, media denials/orphans, push failures and app startup. Agree measurable acceptance thresholds from baselines rather than claiming an unmeasured target. If a client release regresses, revert/disable the affected app feature while preserving saved work and compatible schema. Data restoration/destructive rollback needs its reviewed recovery procedure; never remove authorization restrictions or logs to mask a failure.

AI unification, wearable import, billing and new assignment bridges require their own tasks. Passing a release checklist does not silently include those projects.
