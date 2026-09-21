# Cross-app reliability QA

Use two coaches (A/B) and one trainee for each, against the same staging backend. Allowlist coaches, sign in, and explicitly claim each coach through the mobile flow. There is no default-coach auto-enrollment. An already-linked web invite account should enter mobile without claiming again.

## Automated checks

From TRACE: `npm test`, `npm run lint`, `npm run build`, `npm run test:db`, `npm run db:types:check`, `npm run test:contracts`.
From TRACE-client: `npm test`, `npm run typecheck`.
The database suite replays canonical migrations, repeats reconciliation to verify preservation, and exercises actual PostgreSQL RLS. It covers assignments, repeated sessions, cardio, steps/nutrition, reviews and token-based copies. Client tests cover queue recovery/concurrency/ownership/cache failures. These tests are not device/transport validation.

## Staging/device acceptance

| Flow | Actions and expected result |
| --- | --- |
| Assignment | Coach A assigns real exercises. Trainee A opens the exact template and targets. Trainee B cannot read it. An invalid selected template shows unavailable; an unassigned account sees an honest empty state. |
| Offline cold start | Download the workout online. Enable airplane mode, reopen with an existing session, log sets, force quit, then reconnect/reopen. Saved queue entries survive and eventually appear once on the coach side. Never display demo exercises as an assignment. |
| Continuous connectivity | Keep the phone online and log a set/nutrition entry. The pending banner drains without toggling the network or restarting. |
| Delivery recovery | Interrupt a request after the server commits, before its response arrives. Restart; a retry preserves one session and one copy of each set. Simulate failure of the parent session: child sets remain saved without exhausting retries. |
| Retry limit | Fail five attempts. The failed entry remains saved and visible. Restore connectivity and press Retry sync; it delivers once. |
| Account switch | Queue A's records offline, sign into B and reconnect. B never sends A's payload or sees its pending count. Sign back into A to recover its queue. |
| Storage failure | Simulate a failed SQLite write. The set stays incomplete and an error is visible; retry only after storage recovers. |
| Cardio | Add 30 minutes for today, check coach A's summary after focus or the 30-second refresh; delete it and verify the total drops. Coach B cannot request A's summary. Verify week boundaries. |
| Check-in | Submit with a due date and the coach's template. Coach A reviews; trainee sees status and notes. Cross-coach templates are rejected. Trainee cannot forge review fields. |
| Form video | Upload a real clip through R2, submit a form check, play it on the coach dashboard, review and reload the client list. Verify an unrelated account cannot request the media URL. |
| Steps/nutrition | Log known values, then verify the connected coach's summary and unrelated-coach isolation. Check local calendar dates near midnight. |
| Program sharing | Share a program with private templates, repeated template days and rest days. Recipient joins by token and can read/log the copied exercises. Delete the source; the copy still works. Missing/revoked tokens fail. Shared sources are not listable by other accounts. |
| Permissions | Direct trainee updates to role, platform-admin flag or coach linkage fail, while name/profile editing and the coach-claim RPC still work. |

Record device/OS, app revisions, backend migration version, expected/observed result and errors for each case. Never mark device QA passed solely from unit or SQL tests. AI/RAG, wearable ingestion, solo mode and new features are outside this milestone.
