# TRACE — Coach Dashboard

**Open source.** The coach-facing half of TRACE, a two-repo fitness coaching platform. This repo is a web dashboard coaches use to run their business — clients, programs, check-ins, messaging, nutrition, and analytics. It talks to the same Supabase backend as the trainee-facing mobile app, but ships and runs independently.

---

## How this fits together

TRACE is split across two repositories that share one Supabase project:

| Repo | What it is | Where |
| --- | --- | --- |
| **TRACE** (this repo) | Coach web dashboard — Vite + React, desktop-oriented | You're looking at it |
| **TRACE App** | Trainee-facing mobile app — Expo/React Native, on-device workout logging, offline sync | Not yet published — architecturally connected (same Supabase project, shared RLS/data contracts) but doesn't have a public repo link yet. Add it here once it does. |

Neither repo can write into the other's exclusive tables — Row Level Security is what enforces the boundary, not app-level trust. See [docs/qa-testing-cross-repo.md](docs/qa-testing-cross-repo.md) for the exact table-by-table write-direction contract between the two apps, and [docs/client-app-contract-check-ins-exercises.md](docs/client-app-contract-check-ins-exercises.md) for what TRACE App specifically needs to implement to interoperate.

## Preview

**Login** — email OTP or Google/Apple OAuth. Only allowlisted emails ever become a coach account; everyone else gets a harmless trainee account with no dashboard access.

![Login](docs/assets/login.png)

**Dashboard** — real 7-day signup/workout counts, churn tracking, and a needs-attention queue for check-ins and form checks awaiting review. Client steps stays an honest "not tracked yet" rather than a fabricated number — the underlying schema has no step-count column yet.

![Dashboard](docs/assets/dashboard.png)

**Workouts** — the building blocks coaches assemble into programs, sourced from the exercise library.

![Workouts](docs/assets/workouts.png)

**Settings → Client onboarding screens** — pick which of the 22 available onboarding questions a new client sees, drag to reorder, then generate a server-issued, revocable invite link from here.

![Client onboarding screens](docs/assets/settings-onboarding.png)

## What's built here

- **Multi-coach, invite-only auth** — any number of coaches can run on one deployment, each with an isolated client roster. Only allowlisted emails can ever become a coach account (enforced server-side, not just in the UI); everyone else who signs in gets a harmless trainee account with no dashboard access.
- **Client management** — roster, churn tracking (automatic + manual), server-issued revocable invite links, an onboarding wizard that writes real trainee-answer data.
- **Coaching tools** — check-in templates + review queue, form-check video review (Cloudflare R2 playback), 1:1 messaging, training groups, programs, roadmaps, a resource vault.
- **Exercise library** — full CRUD with muscle-group tagging (primary/secondary) and an interactive muscle-model picker.
- **Nutrition** — TDEE calculator, food library, meal plan builder with live-computed macros.
- **Dashboard analytics** — real 7-day signup/workout counts, churn, weekly PR highlights, nutrition logging summary.
- **AI Copilot ("TRACE Brain")** — persisted chat backed by a Supabase Edge Function; the research/RAG pipeline is a documented placeholder pending an LLM key.

Full status detail (what's built vs. not, and why) lives in [docs/audit.md](docs/audit.md).

## Tech stack

| Layer | Technology |
| --- | --- |
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Routing | react-router |
| Styling | Tailwind CSS v4 |
| Backend / Auth / DB | Supabase (Postgres + RLS + Edge Functions) |
| Media storage | Cloudflare R2 (presigned URLs — never Supabase Storage; see [ADR 0001](docs/adr/0001-media-storage.md)) |
| Testing | Vitest |
| Linting | oxlint |

## Getting started

### Prerequisites

- **Node.js** 20+
- A **Supabase** project (free tier is fine) — you'll need the [Supabase CLI](https://supabase.com/docs/guides/cli) linked to it to apply migrations
- (Optional, for media features) A **Cloudflare R2** bucket — only needed if you're exercising the Edge Functions that presign/read media

### 1. Clone and install

```bash
git clone https://github.com/ZO-HN/TRACE.git
cd TRACE
npm install
```

### 2. Configure environment

Create `.env.local` in the project root:

```bash
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Without these, the Supabase client falls back to a non-functional placeholder — auth and data calls will silently fail.

### 3. Apply the database schema

All schema, RLS policies, and Postgres functions live in [`supabase/migrations/`](supabase/migrations/) as plain, ordered SQL files — no seed data included.

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### 4. Bootstrap your first coach account

This platform is invite-only by design — nobody can become a coach until an email is allowlisted, and nobody can manage the allowlist until at least one platform admin exists. Chicken-and-egg, so the very first coach needs one manual step:

1. Sign in once through the running app (`/login`) with the email you want as your coach account — this creates a `profiles` row with `role = 'trainee'` (expected, nothing's allowlisted yet).
2. Against your Supabase project, run:
   ```sql
   INSERT INTO public.coach_allowlist (email) VALUES ('you@example.com');
   UPDATE public.profiles SET role = 'coach', is_platform_admin = TRUE WHERE email = 'you@example.com';
   ```
3. Sign out and back in. You're now a coach and a platform admin — future allowlist entries can be managed from Settings → Coach access in the app itself.

### 5. Run it

```bash
npm run dev       # dev server with HMR, http://localhost:5173
npm run test      # Vitest
npm run lint      # oxlint
npm run build     # type-check (tsc -b) + production build
npm run preview   # serve the production build locally
```

Run `test`, `lint`, and `build` before any commit — this repo treats all three as required, not optional.

### 6. (Optional) Edge Functions

Media viewing/upload and the AI Copilot are backed by Supabase Edge Functions in [`supabase/functions/`](supabase/functions/) (`r2-get-url`, `r2-presign`, `send-push-on-message`, `trace-brain`). Deploy with:

```bash
npx supabase functions deploy <function-name>
```

Each function's header comment documents which secrets it needs (`npx supabase secrets set KEY=value`) — R2 credentials, an LLM key for `trace-brain`, etc. None of these are required to run the dashboard itself; they gate specific features.

## Project structure

```
TRACE/
├── docs/                    # Architecture, feature catalog, audit, ADRs, QA guides — start at docs/README.md
├── public/                  # Static assets
├── src/
│   ├── components/
│   │   ├── auth/            # Login/OAuth UI
│   │   ├── chat/            # 1:1 messaging
│   │   ├── coach/            # Roster + template builder
│   │   ├── copilot/          # AI Copilot drawer
│   │   ├── dashboard/        # Coach dashboard + analytics
│   │   ├── exercises/        # Muscle model, exercise dialogs
│   │   ├── layout/            # AppShell, Header, Dock (nav)
│   │   ├── media/              # R2 media viewer
│   │   ├── pages/               # One file per route (Clients, Programs, Meal Plans, ...)
│   │   └── ui/                   # Design-system primitives
│   ├── config/                # Onboarding screen definitions
│   ├── hooks/                  # One hook per feature area — see docs/audit.md for the full table→hook map
│   ├── lib/                    # Supabase client, storage helpers, shared utils
│   ├── router.tsx
│   └── main.tsx
├── supabase/
│   ├── migrations/           # Ordered SQL — schema, RLS, functions (apply with `supabase db push`)
│   └── functions/            # Edge Functions (Deno)
└── tests/                    # Vitest suite
```

## Documentation

Full index: [docs/README.md](docs/README.md).

| Document | Purpose |
| --- | --- |
| [Architecture](docs/trace_architecture.md) | Technical architecture — responsive partitioning, the coach page builder, offline sync, RAG pipeline. |
| [Feature Catalog](docs/trace_features.md) | Product-level view of what each role can do. |
| [Implementation Audit](docs/audit.md) | What's actually built vs. not, scoped to this repo, kept current. |
| [Cross-repo QA guide](docs/qa-testing-cross-repo.md) | End-to-end test flows spanning this repo and TRACE App. |
| [Client-app contract](docs/client-app-contract-check-ins-exercises.md) | What TRACE App must implement to interoperate. |
| [Media storage ADR](docs/adr/0001-media-storage.md) | Why media lives in R2, not Supabase Storage. |
| [Provisioning runbook](docs/provisioning.md) | One-shot backend setup: migrations, edge functions, secrets. |
| [Deployment runbook](docs/deployment.md) | Frontend build + static hosting checklist. |

## Contributing

Issues and PRs welcome. Run `npm run test && npm run lint && npm run build` before opening a PR — CI (if configured) will require all three green.

## License

[MIT](LICENSE).
