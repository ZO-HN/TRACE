# TRACE — Implementation Audit & Technical Recommendations

A grounded assessment of what is actually built in this repository, scoped to what this repository actually is.

> **Scope note:** this repo (`TRACE`) is the **coach web dashboard only**. It's one of two apps — the trainee-facing mobile client (`GymLogger`, offline outbox, WebRTC calling, on-device set logging) lives in the separate `TRACE-client` repo (Expo/React Native), not here. Earlier drafts of this document described a single combined app; that architecture was split. Anything below that reads as "not built" refers to this repo's own scope — check `TRACE-client` separately for the mobile-side items.

---

## Stack

- **Vite 8 + React 19 + TypeScript**, client-rendered SPA, `react-router` for routing.
- `@supabase/supabase-js` against a shared Supabase project (`lfaxkrorjljdeefnafjb`) — same backend `TRACE-client` uses, independent auth sessions per device/app, RLS is what scopes visibility.
- Tailwind CSS v4, oxlint, Vitest.
- Media (video/photos) goes to Cloudflare R2 via presigned URLs, never Supabase Storage — see [ADR 0001](adr/0001-media-storage.md). This repo only *views* media (Form Checks video playback); uploading happens client-side in `TRACE-client`.

## Current state by area

| Area | Status | Reality |
| --- | --- | --- |
| Auth (email OTP + Google OAuth) | **Built** | `LoginPage.tsx`; role decided server-side by `handle_new_user()` against `coach_allowlist`, not trusted from client-supplied signup metadata. |
| Multi-coach, invite-only signup | **Built** | Any number of coaches can use this deployment, each with isolated clients (every coach-owned table scoped by `coach_id`/`created_by_coach_id`). Only allowlisted emails can become a coach account; a platform admin manages the allowlist via Settings → Coach access. |
| Dashboard gate (`AppShell`) | **Built** | Non-coach accounts get a "not authorized" screen instead of the dashboard — previously any authenticated user (including a trainee) could load it. |
| Clients roster | **Built** | List, churn status (auto: 21+ days no `workout_sessions`, or manual toggle), find/filter. |
| Client invite links | **Built** | Server-issued, revocable — `client_invites` table, one active link per coach, `rotate_invite_link`/`revoke_invite_link`/`get_invite_link` RPCs. Replaces an earlier client-side-only base64-encoded link that had no server record and couldn't be revoked. |
| Client invite emails | **Removed** | Was built (Resend integration), explicitly pulled by the user before deploy — not wanted for now. |
| Onboarding wizard (`/onboarding`) | **Built** | Public invite-link flow: sign in (email or Google) → answer questions → real write to `onboarding_responses`, attaches the trainee to the inviting coach via `claim_coach_by_id`. Previously collected answers into local state only and never persisted anything. |
| Check-ins | **Built** | Templates (author, schedule, starter picker), review queue, realtime + optimistic local state on review. |
| Form Checks | **Built** | Reviews `form_checks`, plays video via R2 signed URL. Nothing populates it until a trainee submits one from `TRACE-client` — not a bug on this side, just waiting on cross-repo activity. |
| Messaging | **Built** | 1:1 `direct_messages` + realtime, symmetric both directions. |
| Exercises / muscle groups / equipment | **Built** | Full CRUD, muscle-role tagging (primary/secondary) via `exercise_muscles`, 3D-ish muscle-model picker with hover feedback. Library shows the coach's own exercises plus any shared/seeded ones (`created_by_coach_id IS NULL`) — none seeded yet. |
| Programs / Roadmaps / Vault | **Built** | Full CRUD, coach-scoped. |
| Training Groups | **Built** | Create groups, add/remove members via a per-group dialog. |
| Foods / Meals / Meal Plans | **Built**, manual-entry only | TDEE calculator (Mifflin-St Jeor), per-meal food rows are a real search over the coach's own `foods` table with live-computed macros. No nutrition dataset import (e.g. USDA) — `foods` starts empty per coach; can be bulk-seeded later without UI changes. |
| Dashboard analytics | **Built** | Real 7-day new-signups/workouts counts, 21-day-inactive-or-manual churn count, weekly PR wins, per-client nutrition/steps/cardio summaries. Steps and cardio will read as real zeros until TRACE App writes `wearable_biometrics.step_count` / `workout_sessions.session_type` — schema and queries are both real now, just waiting on the other repo's data. |
| AI Copilot (TRACE Brain) | **Built**, RAG pending | `CopilotDrawer` now calls the real `useAiChat` hook (`ai_chat_sessions`/`ai_messages`, persisted, RLS'd) and the `trace-brain` edge function. The function returns a clear placeholder reply until the RAG pipeline (embedding → vector search → LLM) is wired — that's a documented TODO in the function itself, not a bug. Previously the UI used a localStorage-only fake "paste an API key" flow with hardcoded canned responses; that's been removed. |
| Solo-trainee analytics RPCs | **Built** | `get_personal_records`, `get_exercise_stats`, `get_muscle_analytics` — used by `TRACE-client`, not this dashboard directly. |

## Known gaps / deliberately out of scope here

1. **`docs/trace_architecture.md`'s Next.js references** — the architecture spec was written against a different framework assumption than what's actually built (Vite, not Next.js). Treat that doc as aspirational/target where it conflicts with this one.

**Resolved since last pass:**
- Meal plan builder now has real multi-day/multi-meal structure (day tabs, per-day meal lists, live macro rollups) — was a single hardcoded "Meal 1" with a dead add-day button.
- Every CRUD hook in `src/hooks` now guards against setState-after-unmount (a mounted-ref check before any post-mutation `fetch*()` refresh). No longer a known gap — closed out entirely, not just the worst offenders.
- Client steps / cardio dashboard panels — schema gap closed (`wearable_biometrics.step_count`, `workout_sessions.session_type` added), panels wired to real RPCs. Will show real zeros until TRACE App starts writing those columns — see `docs/trace-app-open-items.md` item 4, now the cross-repo ask instead of a coach-dashboard gap.

## For the mobile trainee app

Everything about `GymLogger`, the offline IndexedDB outbox, WebRTC/Jitsi calling, sweat-resistant logging UI, and on-device set persistence lives in the **`TRACE-client`** repo, not here. See [specs/offline-sync-outbox](specs/offline-sync-outbox.md) for that design (written before the repo split; still the reference for that work, just executed in the other repo now) and `docs/client-app-contract-check-ins-exercises.md` for the write-direction contract between the two apps.
