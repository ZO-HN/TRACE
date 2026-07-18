# TRACE

**A single-codebase, dual-role fitness coaching platform.** TRACE adapts to both the coach and the trainee from one unified app — reshaping its layout and permissions based on screen size and profile role, and staying fast and reliable even on the gym floor with no signal.

---

## Overview

TRACE removes the traditional friction of fitness-tracking software: it lowers cognitive load for trainees and maximizes delivery speed for coaches. A single application dynamically transforms based on two signals resolved at launch:

- **Viewport size** — a mobile/PWA experience for on-the-go logging, and an expanded desktop workspace for deep programming work.
- **Profile role** — Coach, Coached Trainee, or Solo Trainee, each exposed to a different set of capabilities.

This repository currently contains the early **PWA scaffold**: role-based layout resolution, Supabase-backed authentication, and the core client hooks. The full target platform — serverless coach pages, offline-first sync, and the RAG assistant pipeline — is described in the architecture spec below.

## Documentation

Full index: [docs/README.md](docs/README.md).

| Document | Purpose |
| --- | --- |
| [Architecture Spec](docs/trace_architecture.md) | Technical architecture: responsive partitioning, serverless page builder, offline sync, and the RAG pipeline. |
| [Feature Catalog](docs/trace_features.md) | Product-level view of what each role can do and the core UX features. |
| [Implementation Audit](docs/audit.md) | Built-vs-spec gap analysis and the executive technical recommendations to reach a functional build. |
| [Offline Sync Spec](docs/specs/offline-sync-outbox.md) | Draft spec for the offline session-logging outbox. |

## Tech Stack

| Layer | Technology |
| --- | --- |
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| Backend / Auth / Storage | Supabase |
| Linting | oxlint |

## Getting Started

### Prerequisites

- **Node.js** 20 or later
- A **Supabase** project (for authentication and data)

### Installation

```bash
# Install dependencies (repository-scoped)
npm install
```

### Environment

The Supabase client reads its credentials from Vite environment variables. Create a `.env.local` file in the project root:

```bash
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> Without these, the client falls back to non-functional placeholder values, so real auth and data calls require them.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR. |
| `npm run build` | Type-check (`tsc -b`) and produce a production build. |
| `npm run lint` | Run oxlint across the project. |
| `npm run preview` | Serve the production build locally. |

## Project Structure

```
TRACE/
├── docs/                     # Architecture spec and feature catalog
├── public/                   # Static assets (icons, favicon)
├── src/
│   ├── components/pwa/        # Role-aware PWA views (LayoutResolver, GymLogger)
│   ├── hooks/                # Client hooks (useTraceUser, useDeviceSize)
│   ├── lib/                  # Supabase client and shared libraries
│   ├── App.tsx               # Mounts the LayoutResolver
│   └── main.tsx              # Application entry point
├── supabase/
│   └── migrations/           # Database DDL, RLS policies, and schema patches
└── index.html                # Vite HTML entry
```

## Database

SQL schema, row-level security policies, and schema patches live in [`supabase/migrations/`](supabase/migrations/) and are applied through the Supabase migration workflow.
