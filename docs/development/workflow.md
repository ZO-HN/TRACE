# Development workflow

Status: maintained procedure. Owner: TRACE maintainers. Updated: 2026-10-31. Scope: human- and AI-assisted changes in both repositories. Sources: project-owner documentation requirements and existing cross-app checks.

## From idea to review

1. Create one issue/task describing the user outcome, affected apps, acceptance criteria, and scope exclusions. Link the relevant [feature specification](../features/README.md) and diagnosis IDs. Ready means the expected behavior and necessary product decisions are explicit.
2. Inspect working-tree changes and applicable AGENTS instructions. Read only task-relevant contracts. Record assumptions and inspect the actual code before relying on a past report.
3. Work in a focused branch/worktree. For a cross-app change, identify the companion branch/revision. Keep independent parallel work on non-overlapping scopes; shared schema changes need one owner.
4. Implement the smallest complete flow, including persistence, permissions, recoverable failures, and affected UI. Add meaningful regression coverage for bugs and changed contracts.
5. Run checks from the applicable AGENTS file. Completion of this step requires actual results; a skipped or blocked check is recorded as such, with reason.
6. Review the diff against every acceptance criterion. Use a separate review pass for sensitive permissions, data loss, migration compatibility, and AI actions. An AI review is advisory evidence, not a human approval or live verification.
7. Update changed specifications/contracts/procedures and navigation in the same change. Record an ADR only for a durable architectural choice. Keep transient logs out of instruction files.
8. Merge/release according to repository protections and [rollout](../operations/cross-app-rollout.md). Done means the task's explicit verification/deployment boundary is met; otherwise record the remaining gate.

## Task prompt

```text
Outcome: [one observable improvement]
Read: AGENTS.md, [feature spec], [relevant contract]
Acceptance: [success], [failure/offline], [permission boundary]
Scope exclusions: [unrelated changes]
Companion revision: [if applicable]
Deliver: focused diff, actual verification results, updated owning docs,
remaining gates, and release order when needed.
```

## Work tracking and evidence

Use one task board: Backlog -> Ready -> In progress -> Review -> Done. Keep task status there; documentation explains stable behavior and unresolved product decisions. A diagnosis finding closes only after linked code/revision and relevant acceptance evidence exist. Do not mark all findings closed because a build passes.

Track these fields independently: implemented revision, automated checks, staging results, native-device results, production deployment. [Release template](../templates/release.md) records the boundary. For dirty worktrees, state that evidence includes uncommitted changes rather than attributing it all to HEAD.

## Documentation maintenance

Use the [feature](../templates/feature.md), [decision](../templates/decision.md), or [release](../templates/release.md) template. Keep the smallest document that answers its owning question. Store exact versions/schema in manifests/migrations; prose covers behavior and rationale. Date research and credit source documents/URLs; candidate ideas are not approved backlog.

Before retiring material, carry forward unique constraints/decisions and record provenance in the [source register](../sources.md). Update incoming links and run the documentation checker. Never leave competing current specifications or recovery compilations in the maintained docs tree.

## Merge and production controls

Require appropriate CI checks on the protected release branch, preserve review evidence, and use separate development/staging/production environments. Record approval according to the team's release policy; an agent must not impersonate an independent approver or disable checks. Production operations follow the release task's explicit authorization and rollback plan. Secret values and personal health data belong outside documentation/test fixtures.

Existing workflows run cross-app checks; branch-protection settings were not verified by this documentation update. [GitHub required checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches) describes the enforcement mechanism.
