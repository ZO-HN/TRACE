# D04 scoped repair: coach roster lifecycle

Status: implemented locally; browser/staging acceptance remains open. Owner: TRACE maintainers / delivery planning. Date: 2026-10-31, Asia/Singapore. Sources: current [useClients](../../src/hooks/useClients.ts), [D04 diagnosis](diagnosis-2026-10-31.md#d04--p1-in-development--strict-mode-permanently-invalidates-mounted-flags), [coaching specification](../features/coaching.md#coach-roster-lifecycle), and executed regression checks.

## Baseline and scope

TRACE HEAD `06675347e6b13085750cf319c3b66ffde4a6954e`, branch `codex/edge-cors-contract`; companion HEAD `774ab9df80d423d76f4d5d5c134ba731d10339a9`. Both checkouts have substantial existing uncommitted work. Verification includes the dirty web tree and prior dashboard-cache/CORS changes; it is not verification of HEAD alone or of the mobile tree. No mobile, SQL, schema, Supabase client, auth-shell or dashboard implementation changes were made by this repair.

Fresh inspection confirmed the roster hook still set its mounted flag false only during cleanup, did not guard read completions by account/request, and could refresh coach A after a churn RPC completed under coach B. This repair is limited to that hook and focused tests. D04 remains open across the other affected hooks.

## Acceptance and behavior

- StrictMode setup/cleanup replay must still finish the current roster load; prior setup results cannot replace it.
- Coach A to B immediately hides A's rows/error. Out-of-order reads, old errors and A to B to A completions cannot change the current roster.
- Unmounted hooks accept no late state writes. Empty coach identity causes no query or mutation.
- Returned, synchronously thrown and rejected read failures settle loading and allow retry. Refresh failures retain only same-coach rows; the latest refresh wins.
- `set_client_churned` RPC name, parameters and server authorization remain unchanged. A completed RPC refreshes only its originating active scope; account switches/unmounts cannot trigger an obsolete refresh. RPC failure remains a returned mutation error.

Each effect setup creates a scope token; cleanup invalidates it. Reads use a sequence within that token. Visible state is tagged with its coach to prevent a previous roster appearing during the render before effects run. `refresh()` is an additive hook API; routed page controls are unchanged. Completed server writes are not rolled back on navigation. A failed post-write reload is exposed as a read error while the mutation result still reflects the successful server write.

The [17 regression cases](../../tests/hooks/useClients.test.ts) execute the actual hook using the existing [controlled hook harness](../../tests/hooks/hookHarness.ts), with Supabase responses and React state/effect scheduling controlled by the test. This establishes the tested lifecycle logic, not actual React renderer/browser scheduling, live Auth/RLS or deployment health.

## Actual verification

Before the repair, the focused command `npm test -- tests/hooks/useClients.test.ts` exited 1: 14 failed, 3 passed, and 2 unhandled read errors. After the repair, the same command exited 0 with all 17 passed. The before run includes the intended additive retry-API acceptance cases as well as reproduced lifecycle failures; it is not a claim that every failure was StrictMode-specific.

| Check | Actual result | Evidence |
| --- | --- | --- |
| Focused regression before repair | Exit 1; 14 failed / 3 passed, 2 unhandled errors | [Before](evidence/roster-lifecycle-2026-10-31/regression-before.txt); includes additive retry-API acceptance cases and stale-action timeout |
| Focused regression after repair | Exit 0; 17 passed | [After](evidence/roster-lifecycle-2026-10-31/regression-after.txt) |
| `npm test` | Exit 0; 15 files / 100 tests | [Web tests](evidence/roster-lifecycle-2026-10-31/web-test.txt) |
| `npm run lint` | Exit 0; five existing Fast Refresh warnings | [Lint](evidence/roster-lifecycle-2026-10-31/web-lint.txt) |
| `npm run build` | Exit 0; JS 1,088.22 kB / 304.84 kB gzip, large-chunk warning | [Build](evidence/roster-lifecycle-2026-10-31/web-build.txt) |

[Command exit codes/timestamps](evidence/roster-lifecycle-2026-10-31/results.json) and [source fingerprints](evidence/roster-lifecycle-2026-10-31/source-fingerprints.json) identify the tested hook/tests/harness snapshot. `node scripts/check-documentation.mjs` passed (exit 0; 45 Markdown files, 336 local links), and `git diff --check` passed (exit 0). No mobile or SQL suites were run for this web-only repair; no schema or server authorization semantics changed. Their earlier results belong to separate records. No browser/renderer or staging probe was run.

## Remaining gates and release

Verify the actual routed roster under React StrictMode in a browser using dedicated coach fixtures: initial load, retry after failure, sign-out/account switch with delayed reads, and churn followed by a switch/reopen. Server ownership checks remain authoritative. Existing routed-page mutation error presentation and other hooks' lifecycle problems require separate work; this task does not change the page's discarded mutation return values.

No migration, function deployment or mobile release is required by this hook repair. A separately authorized web release must select a stable candidate and follow [cross-app rollout](../operations/cross-app-rollout.md). Current uncommitted work is not a release sign-off. Nothing was committed, deployed, pushed or mutated in a live backend. Media entitlement, CORS staging gates and the unresolved media/assignment policies remain independent work on the [implementation board](../planning/implementation-board.md).
