# Reliable onboarding and mobile handoff

Status: local implementation; hosted/browser/native acceptance outstanding. Owner: TRACE maintainers. Date: 2026-11-07 SGT. Implements the first local delivery slice of the [completion plan](../planning/client-workflow-completion-plan-2026-11-06.md).

## Source boundary

Both checkouts remain dirty on master: TRACE HEAD `b11fcab2d9282595c073b67ef5ce5bee5d87e668`, TRACE-client HEAD `9b123120bb8564e2522c1c15bc4acf4d78987449`. This record includes uncommitted changes and preserves earlier media/assignment/nutrition/recovery changes and unrelated thesis/UI work. It is not a new release candidate, deployment or certification of the older APK.

## Implemented journey

1. An authenticated trainee opens a current server-issued invitation. `get_client_onboarding` creates or returns their private draft, capturing the invite's coach and enabled form. Name/email are always required. Raw URL coach/config values cannot authorize submission.
2. Next/Back and **Save answers for later** persist the current answers through a revision-checked RPC. Partial answers may be saved; drafts are not visible to coaches. Reload restores the last successfully saved version, not unsaved keystrokes.
3. Completion validates the whole frozen form and atomically updates the trainee name/coach relationship, inserts the submitted snapshot and saves a stable operation receipt. A failure rolls back all three. Replaying the exact operation/revision returns the original response, including after invite revocation. A new operation cannot create a second submission from that draft.
4. A lost save response retains the exact request for retry; a lost completion response freezes edits until an exact retry or explicit server reload. Account/invite changes suppress stale responses. Revoked invitations and accounts linked to another coach fail visibly. The old compatible insert path now requires the trainee's actual linked coach and forbids client-supplied review/receipt fields.
5. The coach's Clients roster has **Onboarding answers**, with a lazy, client/coach-scoped, 20-row paginated viewer, load retry, safe text rendering and idempotent **Mark reviewed**. Existing submitted-coach read rules remain intact; this change does not decide questionnaire access after reassignment or add corrections/retention cleanup. Coach-code joining still need not create a questionnaire.
6. Mobile offers email-code sign-in for an existing onboarding account (`shouldCreateUser: false`), retaining password/Google options. Duplicate requests are guarded, resend has a local cooldown, and failed verification retains input. Coach accounts receive an explicit website/sign-out handoff instead of the trainee coach picker.
7. Home distinguishes loading, unavailable/retry, no assignment/waiting, cached and ready workouts. Focus or explicit refresh checks assignments; opening one passes its exact template ID. An active workout is not refreshed/replaced by this change. Home nutrition requests the complete local day using the existing paginated day-read path rather than a recent-50 slice.

## Verification

Checks passed on the dirty paired working copies:

| Command | Result |
| --- | --- |
| TRACE `npm test` | 612 tests / 27 files passed |
| TRACE `npm run test:db` | 28 tests passed, including five new onboarding transaction/access tests |
| TRACE `npm run lint` | Passed with six warnings outside this onboarding change |
| TRACE `npm run build` | Passed; existing large-chunk warning remains |
| TRACE `npm run db:types:check` | Generated schema types match both apps |
| TRACE `npm run test:contracts` | Both apps' table/RPC references exist |
| TRACE-client `npm test -- --maxWorkers=2` | 445 tests / 67 files passed |
| TRACE-client `npm run typecheck` | Passed |
| TRACE `node scripts/check-documentation.mjs` | 61 Markdown files / 564 local links passed |
| Both `git diff --check` | Passed; generated/pre-existing LF/CRLF notices only |

Initial implementation checks found a test-only timestamp reference comparison, a test-only circular React-tree serialization, and a PromiseLike rejection-handler typing issue. These were corrected before the successful runs. The new code's two lifecycle lint warnings were also removed. Controlled hook/component transports and PGlite test transactions do not establish actual email delivery, browser behavior, PostgREST, PostgreSQL cross-connection races or native-device persistence.

The SQL tests cover account ownership, forged legacy coach/review fields, draft resume, duplicate save response, stale revisions, failed-completion rollback, exact replay, review permissions, revocation, required/invalid/bounded values, frozen forms, operation collisions and a changed coach relationship. Hook tests cover repeated taps, recoverable errors, exact completion retry, account switches, malformed server results and preview without writes. Coach-handler tests cover lazy scoped reads, review deduplication and stale-client suppression. Mobile controlled renderer tests cover same-email verification, no accidental account creation, send deduplication and expired-code recovery.

## Release order and remaining gates

Preserve the restore/environment gates in the [pilot preflight](pilot-preflight-2026-11-06.md). Apply the seven pending local migrations in timestamp order, including `20261107000000_reliable_client_onboarding.sql`, only under an authorized rollout with recovery evidence. Ship the new web/mobile callers after the schema; no Edge function was edited in this slice. The older direct onboarding insert remains supported for correctly linked trainees.

Before accepting this journey, verify the configured Supabase email template exposes the OTP token, actual email delivery/rate limits/expiry, web redirect allowlist, same Auth user on web and mobile, account switching, two-coach/two-trainee isolation, lost responses and concurrent PostgreSQL requests. No email template was changed and no test email was sent here. Use the approved private-pilot installation link; store buttons remain unavailable. Signed native identity/distribution, SQLite force-kill/reopen/offline sync, object finalization and restore/monitoring evidence remain separate gates. Saved-meal atomic batches, nutrition-plan delivery, catalog/media import and the other plan phases remain unfinished.
