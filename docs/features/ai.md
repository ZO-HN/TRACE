# AI assistance

Status: current direct mobile integration; coach placeholder; shared service proposed. Owner: TRACE maintainers. Updated: 2026-11-01. Sources: `trace-brain`, mobile AI modules, diagnosis D07/D19/D23, prior BYO-key decision, and the architecture discussion recorded in [sources](../sources.md).

## Current implementation

Coach Brain persists sessions/messages but always returns a placeholder; setting a key alone does not implement inference or retrieval. Unmounted simulated commands/citations are not operational AI. Mobile supports user-configured provider requests, photo estimate parsing, and transcription for supported compatible endpoints. Native configuration currently uses one device-global SecureStore key; web configuration is memory-only. Mobile chat is session-local. Real provider/model/camera/microphone round trips remain unverified.

Coach `trace-brain` accepts a JSON object with non-blank string `sessionId` and `content`. Invalid JSON, other body shapes, missing fields and wrong field types return 400 before session queries or reply creation. Whitespace-only values are rejected as unusable; otherwise strings are preserved, extra fields remain compatible, and this repair introduces no length limit or UUID-format restriction. Missing/invalid authentication remains 401; an invisible session remains 403. The caller-scoped session check precedes service-role reply creation. Configuration failures, rejected dependencies and database errors return bounded JSON errors with the shared CORS policy, without internal exception details. See [D23 Brain runtime evidence and remaining gates](../qa/brain-runtime-2026-11-01.md). This local repair does not close D23 for other handlers or establish deployed behavior.

## Coach chat conversation lifecycle

Coach chat state is tagged to the active owner and hook setup. StrictMode replay, owner replacement and unmount invalidate older results before they can update a newer conversation. A successful empty latest-session lookup may create a session; lookup/history failures remain visible failures, and a canceled lookup does not initiate a later insert. Existing history fields, latest-session selection and ascending-history reads are preserved; this does not repair D18 pagination.

New conversation coalesces overlapping requests. It supersedes unfinished initialization, or waits for already accepted sends in the current conversation before creating the next session. Distinct sends run in call order; repeated pending text coalesces to one send. New disables readiness while pending. A failed New preserves the prior usable conversation; message-insert/function failures settle thinking and preserve acknowledged messages. No automatic message retry is added: after an uncertain write result, reopen persisted history before resending, since a lost response can follow a committed write. Owner/setup/conversation guards prevent late results from restoring old display state. They cannot roll back a server write that has already started; unused sessions or messages can remain persisted.

The [local lifecycle evidence](../qa/ai-chat-lifecycle-2026-11-01.md) records targeted actual-hook tests and their controlled-runtime limits. The placeholder reply and authenticated session/message API remain unchanged; no inference, retrieval, tools or live-provider acceptance is added.

## Behavior required for acceptance

- Make availability and provider/data routing explicit. Preserve the existing BYO-key product decision until its replacement is accepted; choose funding, limits, consent, credential ownership, and retention before shared-service rollout.
- Isolate or deliberately clear credentials on account changes; test revoke/clear behavior. Keep TRACE-owned provider secrets on the server.
- Validate request types/lengths, generated structures, finite non-negative food values, and failure bodies. Handle model/quota/network errors and camera/mic permission/prepare/stop/upload failures without losing user input.
- A generated food/program is a proposal. Show assumptions/uncertainty and permit review/correction before committing through authorized normal writes. Deterministic code/SQL calculates totals and metrics.
- Scoped context retrieval grants no broader permissions than the user. Stream chat where supported; long work uses durable jobs with idempotent retries, cancellation policy and visible failed state.
- Claim citations only when retrieved sources actually support the output. No vector provider/corpus is selected; a shared RAG pipeline is not current behavior.

## Acceptance

- [ ] Configured supported provider/model responds under an authorized live test; no-key/invalid-model/quota/offline cases show clear recovery.
- [ ] Account A's saved credentials/history/context are not silently inherited by B; clear/revoke behavior is verified on native and web.
- [ ] Invalid/negative/malformed photo estimates are rejected; a corrected reviewed estimate logs exactly once through the outbox.
- [ ] Unsupported transcription is explained; supported transcription handles permission denial and timeout on a real device.
- [ ] Coach AI remains honestly unavailable until inference is wired; no simulated research/action is reported as real.
- [ ] Before shared-AI release, test context isolation, streaming disconnects, duplicate jobs, provider failure, cancellation, and reviewed action persistence.

## Proposed design

One authenticated TypeScript gateway with provider adapters can serve both apps; durable workers handle long scans/reports/program generation. See [architecture evolution](../planning/architecture-evolution.md) for phases and [mobile provider setup](../../../TRACE-client/docs/development/ai-copilot.md) for the current mode. This spec does not install the gateway or change billing policy.
