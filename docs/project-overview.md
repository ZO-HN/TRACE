# Project overview

Status: current implementation summary with known gaps. Owner: TRACE maintainers. Updated: 2026-10-31. Evidence: working-source inspection and the [dated diagnosis](qa/diagnosis-2026-10-31.md); no deployment is certified by this summary.

## Purpose

TRACE helps trainees log food, calories/macros, strength sessions, cardio, and progress, and helps coaches author plans, review submissions, and communicate with their trainees. AI assists interpretation and drafting; recorded totals and permission checks remain deterministic.

## Applications and ownership

| Component | Language/platform | Responsibility |
| --- | --- | --- |
| TRACE web | TypeScript, React, Vite | Coach dashboard, public coach pages, onboarding |
| TRACE-client | TypeScript, React Native, Expo | Trainee screens, local logging, device integrations |
| Shared backend, owned by TRACE | PostgreSQL SQL/RLS; TypeScript/Deno Edge Functions; Supabase Auth/Realtime | Authoritative shared records, identity, authorization, integrations |
| Mobile local storage | SQLite and account-scoped caches; Zustand UI mirror | Pending changes and previously downloaded data |
| Media | Cloudflare R2 via signed URLs | Private binary objects; database stores keys/metadata |

Both apps use one Supabase project with independent device sessions. They release independently and require compatible shared contracts. Read [architecture](architecture/overview.md) for data flows and [feature specifications](features/README.md) for expected behavior.

## Current limits

The routed coach workout builder/calendar are not durable end-to-end authoring/scheduling flows. Coach plans and trainee personal plans are separate; nutrition assignment and program delivery need explicit integration. Media entitlement/CORS and native release configuration have unresolved findings. The coach AI endpoint returns a placeholder; mobile has direct user-key provider code with no shared RAG service. Details and evidence boundaries live in the diagnosis rather than duplicate status tables.

## Direction

Keep TypeScript/PostgreSQL and the shared backend. Extend local-first interaction, query caching, efficient SQL, and asynchronous processing before considering a language rewrite. [Architecture evolution](planning/architecture-evolution.md) describes the recommended target and phased acceptance; those additions are not installed by documentation changes.
