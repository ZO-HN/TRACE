# TRACE — Feature Catalog

A product-level view of what TRACE does for each type of user. For the technical detail behind these features — responsive partitioning, sync, and the RAG pipeline — see the [Architecture Spec](trace_architecture.md).

TRACE is built around one principle: **lower the cognitive load on trainees, and maximize delivery speed for coaches.** Every feature below serves one of those two goals.

---

## Features by Role

TRACE resolves the active role from the user's profile at launch and exposes a tailored capability set.

| Capability | Coach | Coached Trainee | Solo Trainee |
| --- | --- | --- | --- |
| Workout plans | Write & assign plans | Read assigned plans | Load public templates |
| Video calling | Launch calls | Join incoming calls | Not available |
| Chat | Full roster + 1-on-1 | 1-on-1 with coach | Not available |
| Logging | Roster oversight | Sync assigned-session logs | Basic weight logs |
| Landing page | Serverless page builder | — | — |

- **Coach** — Full program builders, client rosters, diagnostic feedback, video-call launchers, and marketplace visibility controls.
- **Coached Trainee** (linked to a coach) — Follows custom schedules published by their coach, with media upload channels and live chat. Program editing is locked.
- **Solo Trainee** (no coach) — Self-directed logging against generic or baseline templates. Chat and video are hidden entirely to keep the experience lean.

---

## Trainee Experience — Reducing Gym Floor Friction

- **Sweat-Resistant Logging** — Large, accessible 48px touch targets minimize input errors. Screens pre-populate with values from previous sessions to eliminate guesswork:
  - Prepopulated Weight = Previous Weight
  - Prepopulated Reps = Previous Reps
- **Media-Lean Video Pipeline** — Form-check clips are downscaled on-device to 720p and capped under 50MB before uploading directly to object storage (Cloudflare R2), saving user bandwidth. See [ADR 0001](adr/0001-media-storage.md) for why media lives in R2 rather than Supabase Storage.
- **Automated Rest Alerts** — Checking off a set launches a floating timer. When it completes, progress notifications fire via audio and vibration.
- **Macro Quick-Logger** — Users type macro totals directly (e.g., "80g Protein") or snap a photo of their plate — no slow ingredient-search loops.

---

## Coach Experience — Administrative Speed

- **Keyboard-First Interface** — Program sheets support full Tab and Enter shortcut mapping. Coaches enter movements, sets, percentages, and RPE notes sequentially without leaving the keyboard.
- **Master Template Cascading** — Coaches write one core program block and cascade it across selected client calendars. Session dates are calculated per client from their target start date:

  ```text
  Session Date = Client Start Date + 7 × (Template Week − 1) + (Template Day − 1)
  ```

- **Automated Red-Flags Feed** — A single control board surfacing critical roster alerts:

  | Alert | Trigger |
  | --- | --- |
  | Missed Workouts | Client missed 2+ sessions back-to-back |
  | Strain Warning | Set inputs exceed a 10/10 RPE threshold |
  | Inactivity Warning | Zero logged biometrics or weight metrics for 7 consecutive days |

---

## Serverless Coach Pages

Each coach gets a dynamically rendered public landing page (`trace.com/[slug]`) driven by a stored JSON configuration — no static rebuilds or redeployment fees. See [Serverless Page Builder Architecture](trace_architecture.md#2-serverless-page-builder-architecture) for the configuration schema and rendering flow.

## The TRACE Brain (AI Assistant)

An on-device-refined RAG assistant delivers scientifically grounded, citation-backed answers to training and injury questions with sub-second response times. See [RAG AI Fact-Checking & Token Compression Flow](trace_architecture.md#4-rag-ai-fact-checking--token-compression-flow) for the pipeline.
