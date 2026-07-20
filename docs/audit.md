# TRACE — Implementation Audit & Technical Recommendations

A grounded assessment of what is actually built in the repository versus what the [architecture spec](trace_architecture.md) describes, followed by the recommended technical path to a fully functional app. All findings are anchored to real files.

> **Scope note:** The architecture spec describes the *target* platform. This document describes the *current* build and the decisions needed to close the gap. Where the two diverge, this document reflects the repository.

---

## 1. Foundational Correction: Framework

The architecture spec repeatedly references **Next.js** (dynamic `/[slug]` routing, serverless page rendering). The repository is **not** a Next.js project.

- `package.json` has **no `next` dependency** and **no routing library** of any kind.
- The stack is **Vite 8 + React 19 + TypeScript**, a client-rendered PWA shell, with `@supabase/supabase-js`, Tailwind CSS v4, and oxlint.

Every plan must be built on the real stack. The Next.js serverless page model is aspirational and unimplemented.

## 2. Current State by Axiom

> **Status update (2026-07-19):** the build sequence in §4.6 has been executed. The table reflects the post-implementation state; the original findings below it are kept for history.

| Axiom | Status | Reality |
| --- | --- | --- |
| Single codebase, dual role | **Built** | One Vite app; roles resolved from Supabase profile. |
| Role-based resolution (coach / coached / solo) | **Built** | `useTraceUser.ts` derives role booleans from `role` + `coach_id`. |
| Viewport partition (≥1024 coach / <1024 trainee) | **Built** | `useDeviceSize` (`matchMedia` on the `lg` breakpoint) composed with role in `LayoutResolver`. |
| Mobile trainee logger | **Built** (mock template) | `GymLogger` mounted for trainees, queues real `set_logs`/`workout_sessions` payloads (lbs→kg, catalog ids). Workout content itself is still the mock template until template loading lands. |
| Offline outbox / IndexedDB sync | **Built** | Zustand + `idb` outbox; sessions flush before sets; idempotent upserts with backoff on the `online` event. |
| WebRTC (Jitsi) | **Built** (v1) | `JitsiCall` via meet.jit.si external API; per-coach room, coach hosts / coached trainee joins. Open-room limitation documented. |
| 1-on-1 chat | **Built** (migration pending) | `direct_messages` migration + realtime `ChatPanel`; wired for both sides (trainee panel + coach roster cards). |
| Media (video/photos) | **Built** (deploy pending) | Direct-to-R2 presigned upload; `GymLogger` form-clip capture writes the key to `set_logs.form_video_s3_key`. See [ADR 0001](adr/0001-media-storage.md). |
| Coach public pages (`/:slug`) | **Built** | `react-router` + `CoachPage` rendering validated `layout_config`. |
| Coach roster + telemetry | **Built** | `get_coach_roster_telemetry` RPC → readiness-banded cards with per-trainee chat. |
| Coach template builder | **Built** | Author `workout_templates` + `template_items` in-app; trainee logger loads real content. |
| TRACE Brain (AI chat) | **Built** (RAG pending) | Persisted chat + `trace-brain` function; RAG/LLM pipeline is a documented placeholder. |
| Deployment hardening | **Built** | Fail-fast env screen, error boundary, PWA manifest, SPA `_redirects`. |
| RLS coverage | **Built** | ai_* + biometrics RLS added (were unprotected); see migration `20260719000002`. |

### How routing works today

```
App.tsx  →  LayoutResolver  →  useTraceUser()  →  { isCoach, isCoachedTrainee, isSoloTrainee }
```

`LayoutResolver` branches on **role only**. The viewport axis from the spec does not exist in code, so the app renders identically at every width. The intended (viewport × role) matrix is currently one-dimensional (role).

## 3. Code Integrity Findings

1. **`src/hooks/useDeviceSize.ts` is empty** — the viewport dimension has no implementation. Axiom for the responsive partition cannot hold until this exists.
2. **`GymLogger` is orphaned + mock-driven** — `initialWorkout` is hardcoded; state is local `useState`; nothing reads or writes Supabase; the component is never mounted by `LayoutResolver`. The flagship mobile feature is unreachable at runtime.
3. **No offline persistence** — logs live in component state and vanish on reload. This is the single biggest gap against the "no data loss in gym basements" goal. See [specs/offline-sync-outbox](specs/offline-sync-outbox.md).
4. **e1RM write hazard** — `GymLogger.calculateE1RM` computes Epley client-side:
   ```
   e1RM = weight * (1 + reps / 30)
   ```
   `useTraceUser.ts` documents that `estimated_1rm` is a **generated column** in `set_logs` and must never be in a write payload. Persistence must send `weight`/`reps` only and treat client e1RM as display-only.
5. **Silent misconfiguration** — `src/lib/supabase.ts` falls back to `placeholder-project.supabase.co` when env vars are missing, so a broken build appears to work while talking to nothing.
6. **No test framework** — `package.json` declares no test runner; there is no automated verification surface.
7. **No error boundaries** — an auth/fetch failure in `LayoutResolver` degrades to a single generic error card.

---

## 4. Executive Technical Recommendations

These are the recommended paths to make TRACE fully functional, chosen for the stated "zero-budget, single-codebase PWA" intent.

### 4.1 Stay on Vite — do **not** migrate to Next.js

Migrating a working Vite SPA to Next.js is a large, high-risk change that the goals do not require. Keep Vite and add:

- **`react-router`** for client-side routing, including the coach public page route `/:slug`.
- Coach landing pages render **client-side** from the `landing_pages` JSONB config (already schematized in the architecture spec). If public-page SEO becomes a requirement later, add a Supabase Edge Function or a prerender step for just those routes — a targeted addition, not a framework migration.

**Tradeoff:** no server-side rendering for public coach pages out of the box. Acceptable at this stage; mitigable per-route later.

### 4.2 Implement the viewport × role matrix

- Fill `useDeviceSize.ts` with a `matchMedia('(min-width: 1024px)')` hook (with a resize/`change` listener and SSR-safe default).
- Compose it in `LayoutResolver`: role selects the feature set, viewport selects the density (desktop coach grid vs. mobile trainee logger). Mount `GymLogger` on the trainee/mobile path.

### 4.3 Offline outbox: Zustand + IndexedDB

Adopt **`zustand`** (client store) + **`idb`** (IndexedDB) for the durable outbox. On a web PWA the persistence layer is IndexedDB, not SQLite (SQLite in the spec is native-app language). Full design in [specs/offline-sync-outbox](specs/offline-sync-outbox.md).

### 4.4 WebRTC via the Jitsi external API

For zero infrastructure cost, embed **Jitsi Meet** (external `meet.jit.si` or self-host later) through its iframe/external API rather than building raw WebRTC signaling. Gate it to coach and coached-trainee roles.

### 4.5 Add Vitest + fail-fast config

- Add **Vitest** + `@testing-library/react` as the first test surface, targeting the outbox logic and role resolution first.
- Make `src/lib/supabase.ts` throw (or surface a visible banner) on missing env vars instead of silently using placeholders.

### 4.6 Recommended sequencing

1. `useDeviceSize` + mount `GymLogger` (makes the trainee path real).
2. Offline outbox (durability — highest user-facing risk).
3. Persistence wiring for `set_logs` (respecting the e1RM generated-column rule).
4. WebRTC + chat.
5. Coach public pages (`/:slug`).

Each step should land with a Vitest check and no regression to the role-resolution path that already works.
