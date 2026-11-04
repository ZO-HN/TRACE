# Coach AI chat lifecycle: local evidence

Status: Stage 1 targeted verification passed; combined web verification pending. Owner: TRACE maintainers. Recorded: 2026-11-01, approximately 12:00 SGT. Scope: [useAiChat](../../src/hooks/useAiChat.ts), [focused tests](../../tests/hooks/useAiChat.test.ts), and a task-local lifecycle harness. Owning behavior: [AI specification](../features/ai.md#coach-chat-conversation-lifecycle).

## Snapshot and scope

TRACE HEAD: `06675347e6b13085750cf319c3b66ffde4a6954e`. Companion HEAD: `774ab9df80d423d76f4d5d5c134ba731d10339a9`. Evidence includes this uncommitted hook/test/doc change and the existing dirty working trees; it is not attributed to those commits alone or to an archived candidate. No companion files, shared harness, auth observer, database schema, backend handler, manifest or dependency was changed for this repair. The other ten D04 hooks have a separate owner.

The old cleanup-only mounted flag prevented New from selecting its newly inserted session after StrictMode replay. Initial history used a different cancellation flag and was not blocked by that mounted flag. The repair uses owner/setup identity and conversation generations, with owner-tagged visible state. Reads and asynchronous write responses must still belong to the current scope before changing display state or starting a dependent operation.

## Targeted checks executed

- `node_modules/.bin/vitest.cmd run tests/hooks/useAiChat.test.ts`: **1 file, 27 tests passed**.
- `node_modules/.bin/oxlint.cmd src/hooks/useAiChat.ts tests/hooks/useAiChat.test.ts tests/hooks/aiChatHarness.ts`: **passed without warnings**.
- Scoped `git diff --check -- src/hooks/useAiChat.ts`: **passed**.

The tests execute the actual hook source with controlled Supabase dependencies and a task-local state/effect runner. They cover setup replay, existing/new-session initialization, canceled lookup, error bodies and rejected lookup/history/session creation/message insertion/function invocation, New after replay, overlapping New, ordered distinct sends and duplicate pending text, send then New, late history, owner A-to-B-to-A, stale action callbacks, and unmount at each asynchronous stage. They preserve complete fixture message fields and exercise only mocked placeholder invocation. The runner is not React StrictMode itself and does not establish browser or deployed behavior.

## Focused real React check

`node "$env:TEMP\trace-ai-chat-react-probe.cjs"`: **five scenario checks passed**, using the actual transpiled hook and helper with the existing paired companion React/test-renderer 19.2.3 and controlled Supabase mocks. It covers real StrictMode initialization and coalesced New after replay; accepted send then New ordering; owner A-to-B-to-A with a late reply; unmounted lookup resolving empty without a later insertion; and visible history rejection. The temporary script is retained at `C:\Users\imint\AppData\Local\Temp\trace-ai-chat-react-probe.cjs` for local reproduction. It does not modify the companion checkout or install dependencies. The renderer emits its deprecation notice. Web React is 19.2.7; no browser or live SDK/Auth/data API acceptance is established by this paired-renderer check.

## Behavior and limits

The latest-session query, history query/order, session/message payloads, caller authorization and placeholder function API remain unchanged. No D18 pagination, AI inference, retrieval, provider routing or service credential work is included.

New coalesces overlapping requests and waits for already accepted sends before changing a usable conversation. It can supersede unfinished initialization. Distinct sends preserve call order, and the same pending text coalesces until completion. On failure, New keeps the previous usable conversation; send failures settle thinking and retain acknowledged messages. Readiness stays false on failed initialization with a visible error. New can recover by explicitly creating a new session.

Invalidation suppresses stale UI results and further dependent calls; it does not cancel or roll back an already-started server write. An unused session or an old-conversation message may remain committed. No automatic retry/idempotent-message guarantee was introduced. A lost write response remains uncertain: reopen persisted history before resending. Live session selection, RLS, transport failures and actual rendering need coordinated staging/browser acceptance. Native and paid-provider acceptance are outside this task.

## Source fingerprints (SHA-256)

| File | SHA-256 |
| --- | --- |
| `src/hooks/useAiChat.ts` | `2CBC540D3D5B8527587633C2A0DFD50B55798B8AD51EAC25743B24C345F8AE4B` |
| `tests/hooks/useAiChat.test.ts` | `11AA09CEF2E64AD0A9227042A5D0AEDD57B409F19D39629F34ABF10FB789326F` |
| `tests/hooks/aiChatHarness.ts` | `5B35DE51D05DDE9B217B2F505793767679C94D0843B9F1E7A97E4090D32F18A8` |

Full web tests/lint/build and documentation link checks remain pending the coordinator's combined verification slot. No aggregate suites, browser sessions, live messages, provider calls, commits, deployments or archive recapture were performed in Stage 1.
