# Coaching, identity, media, and communication

Status: mixed implemented paths and open integration/release gates. Owner: TRACE maintainers. Updated: 2026-11-05. Sources: RLS/RPCs, auth/check-in/chat/media/push modules, diagnosis D01/D02/D05/D06/D08-D10/D13/D15/D17/D18/D20-D25, and [D01 local evidence](../qa/media-entitlement-2026-11-05.md).

Current local onboarding follow-up (7 November): account-owned step-save/resume, invite-derived atomic submission/receipt, roster questionnaire review, existing-account mobile email-code sign-in, explicit coach-role handoff and waiting-for-assignment states are implemented. These require the new canonical migration and actual email/browser/native acceptance before release. Existing submitted-coach questionnaire access is preserved; no corrections/retention policy was added. [Evidence and release order](../qa/onboarding-workflow-2026-11-07.md).

## Behavior required for acceptance

- Coaches use the web workspace; trainees select/claim a coach or follow an authorized invite. Privilege and coach-link changes are controlled server-side. Handle the diagnosed mobile coach-role UX mismatch explicitly.
- Completing an invited onboarding creates the trainee account's coach relationship, records the submitted answers for that coach, and copies the submitted full name into the trainee profile so the new client is identifiable in the coach's Clients roster. Reopening the invite must not switch an account already linked to a different coach.
- Check-in responses belong to the trainee, use the scheduled due date, and receive server-stamped coach identity. Review fields are coach-controlled. See the [shared contract](../architecture/client-contract.md).
- Keep standalone form checks separate from per-set clips. Media URLs require a server-issued ownership registry entry. New/changed attachments must match registered owner and kind; owners can view their registered media, and the current coach can view attached per-set or standalone form videos. Reassignment revokes the former coach from newly issued URLs. Unregistered legacy references stay stored but receive no new URL; reupload is required. Existing signed URLs expire normally. `progress-photo` is now supported for its owning trainee. V2 write-once upload and size/type/ETag/signature-prefix verification precede attachment; V1 views seal an immutable server copy. Check-in files require a trainee-owned explicit answer and the audited current coach. Exact photo/form/avatar receipts preserve history on retry. [Finalization evidence](../qa/media-finalization-2026-11-08.md) records the local boundary; full decoding/scanning, cleanup/deletion, quotas, retention and hosted/native acceptance remain open.
- Enforce the real browser SDK preflight headers and R2 bucket CORS as separate hops. Support a media kind on both upload and playback before exposing its success path.
- Media finalization/cleanup must account for failed metadata writes, actual object size/type, deletion, quotas and retention. Current live object validation/lifecycle configuration is unverified.
- Chat loads recent history, paginates older records, reconciles initial fetch/Realtime arrivals, and exposes failed delivery. Never present the oldest 200 messages as complete current history.
- Notifications honor category/mute/quiet-hour preferences with explicit timezone/overnight behavior. Distinguish provider acceptance from delivery; inspect error tickets/receipts, handle invalid tokens, and route push-open events intentionally.
- A notification inbox requires scoped persisted reads/unread state. An empty screen/preferences form is not an implemented inbox. Vault folders require resource records, access control and recipient delivery before being described as a delivered library.
- A coach can assign an active private workout as a fixed ordered copy to one currently linked trainee. The copy contains its own prescription snapshot; editing the source later does not alter it, and a newer version requires another explicit assignment. The trainee starts that exact assigned template from the existing workout library. No assignment notification is sent. Local code and focused tests exist; hosted role, browser, authenticated mobile/device and deployment acceptance remain open in [assignment evidence](../qa/private-workout-assignment-2026-11-05.md).

## Acceptance

- [ ] Two coaches/two trainees complete invite/claim/profile flows; each completed invited trainee appears with their submitted name in only the invited coach's Clients roster and onboarding answers remain coach-readable; forged role/admin/review/link writes fail.
- [ ] Submit/review a dated check-in, reload, and verify connected-coach access plus unrelated-account denial.
- [ ] Upload/reopen per-set and standalone clips separately. Local SQL/handler checks cover owner, current coach, unrelated accounts, coach reassignment, forged references and unregistered legacy keys. Deployed R2 round trips and expired URLs remain staging acceptance gates.
- [ ] Progress photos pass capture/upload/metadata/reopen/comparison and privacy checks; current kind/playback gaps remain open.
- [ ] OPTIONS permits the actual SDK headers; authenticated browser POST and direct R2 PUT succeed only under intended policies.
- [ ] Conversations above 200 messages show newest content and older pagination without duplicates during switching/reconnect.
- [ ] On a real device, verify muted/quiet-hour behavior, invalid Expo tickets, token cleanup, inbox state, and notification open from a terminated app.
- [ ] Vault visibility/revocation and client delivery pass before advertising the feature.

## Coach roster lifecycle

`useClients` scopes each load to the current coach and effect setup, including StrictMode replay. An account change immediately hides the prior coach's rows/error. Only the latest read from the current setup can replace the roster or settle loading; cleanup invalidates pending completions. Failed/rejected reads expose an error, retain only previously loaded same-coach rows, and support retry through the hook's additive `refresh()` method. No new retry control is added to the routed page by this hook-only repair.

Churn still uses `set_client_churned` with the existing arguments and server permissions. A completion refreshes only its originating, still-active roster setup. RPC failures return an error; a successful RPC followed by a failed roster reload remains a committed mutation with a separate read error. A request already sent is not canceled or rolled back by switching accounts. See [roster lifecycle evidence](../qa/roster-lifecycle-2026-10-31.md). This repairs the `useClients` portion of D04; it does not close the other hooks or establish authenticated browser/RLS acceptance.

## Dashboard analytics caching

Dashboard analytics reuse a complete, account-scoped in-memory snapshot for 30 seconds and share pending requests across remounts. Refresh bypasses freshness. Loading and unavailable states are distinct from successful empty results; failed refreshes retain previously loaded same-account analytics with an error and last-update time. Sign-out, identity changes, changed or failed profile verification, observed role changes, and auth-shell unmount clear the cache. Late responses cannot restore invalidated data. Server authorization remains authoritative. Roster, check-in and form-check reads remain independent; cache tests do not establish their loading/error behavior.

Controlled hook tests record five RPCs for a cold analytics load, zero additional calls for a warm remount/focus or an already pending batch, and five additional calls at expiry or explicit refresh. These are fixture request counts, not latency measurements or authenticated staging acceptance. A local fixture also exercised the actual hooks under StrictMode with paired React/test-renderer 19.2.3 from the companion checkout and the installed web Supabase SDK 2.110.7, intercepting all HTTP responses. It independently observed five cold RPCs, zero additional calls on dashboard remount, and five additional calls for explicit refresh; refresh failures, late old-account responses, role changes, sign-out and auth-observer unmount passed. The web uses React 19.2.7; this renderer fixture does not establish browser behavior or live Auth/RLS acceptance.

## Release boundaries

### Local Edge CORS implementation

As of 2026-10-31, `r2-presign`, `r2-get-url`, and `trace-brain` share the SDK header policy for `authorization`, `apikey`, `content-type`, and `x-client-info`. OPTIONS is unauthenticated; existing POST authentication/authorization and JSON response shapes are preserved. Tests exercise requests emitted by both installed SDKs and the actual handler source with controlled external services. [D02 evidence](../qa/edge-cors-2026-10-31.md) records the implemented boundary. Authenticated staging-browser POST, gateway behavior and direct R2 PUT remain acceptance gates; the checkbox above is not closed by local tests. D01/D05/D06/D22/D23 remain separate work.

Terms/privacy destinations and real store links need maintained destinations before public onboarding claims. Configure EAS/project credentials, webhook authentication, intended identity/version/signing, and authorized staging fixtures. Refer to [rollout](../operations/cross-app-rollout.md), [recovery](../operations/recovery.md), and the dated diagnosis for specific findings. Documentation does not fix these application defects.
