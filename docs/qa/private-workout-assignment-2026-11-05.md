# Private workout assignment: 5 November 2026

Status: locally implemented and aggregate local verification passed; hosted staging, browser, authenticated device, and deployment acceptance remain open. Owner: TRACE maintainers. Scope: assign one active private coach workout to one currently linked trainee as an immutable ordered snapshot. TRACE HEAD: `b11fcab2d9282595c073b67ef5ce5bee5d87e668`; TRACE-client HEAD: `9b123120bb8564e2522c1c15bc4acf4d78987449`. Both worktrees remain dirty. TRACE includes this assignment work, media-entitlement work, and untracked thesis drafts; TRACE-client includes this assignment recovery work and existing workout-recovery/UI edits. The assignment work is uncommitted.

## Implemented behavior

The canonical `20261105000000_fixed_workout_assignments.sql` migration adds an authenticated coach RPC, private operation receipts, current-link/source ownership checks, expected snapshot comparison, and transactional creation of a separate assigned template plus ordered item rows. A receipt makes a copy immutable; direct assigned-template creation and direct receipt-table access are revoked. The internal fixed-copy lookup helper is not executable by authenticated clients. Stable operation and copy IDs make response-loss retries idempotent. Later source edits require another explicit assignment. No notification is sent.

The coach route exposes assignment for private workouts and offers the current linked-trainee roster. TRACE-client scopes explicit template reads to that trainee's assigned template (or the owner's private template), carries rest prescriptions into the logger, and recovers repeated exercise occurrences using stable log IDs and occurrence-global set numbers. Completed repeated rows without a stable occurrence binding fail closed. `activeDraft.ts` was not changed.

## Verification

### Focused assignment checks

| Command | Result | Boundary |
| --- | --- | --- |
| `node --test tests/database/workoutAssignment.test.mjs` | Exit 0; 4 tests passed | PGlite canonical migrations: atomic ordered copy, idempotent replay, immutable copies including ID changes and item moves, forged writes, linked-recipient/source checks, stale snapshot rejection, later explicit copy, stable performed-session reference, source lock observation, and authenticated denial of receipt/helper access. |
| `node node_modules/vitest/vitest.mjs run tests/hooks/useWorkoutAssignment.test.ts tests/components/privateWorkoutAuthoring.test.ts --maxWorkers=1` | Exit 0; 2 files, 6 tests passed | Coach hook payload/retry/coalescing and component handler/hook harness; no browser DOM or live Supabase transport. |
| Mobile focused workout suite | Earlier run: 5 files, 41 tests passed. Follow-up `node node_modules/vitest/vitest.mjs run tests/lib/assignedDraftRecovery.test.ts --maxWorkers=1`: 3 tests passed. | Follow-up covers persisted `is_completed: true`, second-occurrence global `set_number`, exact bound log IDs, and fail-closed handling of an unbound repeated-exercise row. |
| `npm run typecheck` in TRACE-client; `npx tsc -p tsconfig.app.json --noEmit` in TRACE | Exit 0 in both repositories | Scoped TypeScript checks. |
| `npm run db:types` and `npm run db:types:check` in TRACE | Exit 0 | Both generated type files regenerated and verified. |

### Combined local verification

The combined verification passed on the working source at the HEADs above. Full web suite: **603 passed**. Lint passed with **five pre-existing Fast Refresh warnings**. Build passed with the existing bundle-size warning. Generated types/check and client-contract checks passed. Mobile suite: **438 passed**; mobile typecheck passed. Documentation check passed for **56 Markdown files and 425 local links**. Diff checks passed in both repositories.

The first `npm run test:db` run found the existing contract integration fixture directly inserting an `ASSIGNED` template, which the new receipt-backed guard intentionally rejects: **22/23 passed**. The fixture was changed to create a private source with a complete ordered prescription, call the authorized assignment RPC, and use its returned copy ID for trainee session/set retries and coach-isolation checks. The SQL suite then passed **23/23**. This was a fixture-only test change; no application source changed after the other combined suites had passed. The final docs check was rerun after this evidence edit.

### Working-source fingerprint

SHA-256 prefixes for the relevant current uncommitted source files:

| File | SHA-256 prefix |
| --- | --- |
| `supabase/migrations/20261105000000_fixed_workout_assignments.sql` | `7707274C9769E8DF` |
| `src/hooks/useWorkoutAssignment.ts` | `8B349F2ADE3785D2` |
| `src/components/coach/WorkoutAssignmentDialog.tsx` | `72B6872F92D2C886` |
| `TRACE-client/src/lib/workout/assignedDraftRecovery.ts` | `6FDDFFEFEDCBE603` |
| `TRACE-client/src/hooks/useAssignedWorkout.ts` | `D76491BC7E244D30` |
| `TRACE-client/src/components/GymLogger.tsx` | `EA6743A0B812E73E` |

## Remaining acceptance

The assignment locks the source template row `FOR UPDATE`, then locks its existing item rows `FOR UPDATE` before snapshot comparison. The parent lock serializes FK-backed item inserts/parent-ID changes; item row locks serialize updates/deletes that do not otherwise lock the unchanged parent. The focused PGlite regression observes relation locks inside the open transaction but does not simulate competing database sessions. The migration has not been applied to hosted Supabase. Hosted grants, Auth claims, PostgREST behavior, and real PostgreSQL concurrency remain staging checks. Browser assignment/readback, authenticated mobile transport/device behavior, exact assigned-ID opening, and queued duplicate-exercise recovery remain live acceptance work. No live migration, deployment, or release acceptance is claimed.
