# TRACE — Platform Architecture

This document defines the screen partitions, state patterns, and custom algorithmic pipelines that govern the single-app, dual-role TRACE ecosystem. For a product-level view of what each role can do, see the [Feature Catalog](trace_features.md).

---

## 1. Frontend View Division & Responsive Layouts

TRACE uses a single, unified codebase that dynamically transforms based on screen size (device break criteria) and profile metadata retrieved during the authentication lifecycle.

```text
                      ┌─────────────────────────────────────────┐
                      │        TRACE App Launch & Auth          │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼
                            ┌─────────────────────────────┐
                            │ Dynamic Platform Partition  │
                            └──────────────┬──────────────┘
                                           │
                ┌──────────────────────────┴──────────────────────────┐
                ▼                                                     ▼
    [ Viewport Size Check ]                                 [ Access Level Routing ]
  ┌───────────────────────────────┐                       ┌──────────────────────────┐
  │ • Desktop View (lg Break)     │                       │ • Coach Panel: Read/Write│
  │ • Mobile/PWA View             │                       │ • Coached: Sync Logs     │
  └───────────────────────────────┘                       │ • Solo: Template Logs    │
                                                          └──────────────────────────┘
```

### 1.A. Screen Size Split

The viewport split optimizes the application layout to prevent clutter on mobile screens while utilizing expanded real estate on desktop systems.

**Desktop View** — Deep Work (viewport width ≥ 1024px):

- **Macrocycle Grid Workspace** — Optimized multi-pane spreadsheets mapped for desktop operations. Allows rapid population of workout schedules and progressions.
- **Interactive Roster Telemetry Dashboard** — Aggregated data view detailing client workout compliance, baseline biometrics tracking, and visual stress markers.
- **Flexible Page Layout Editor** — WYSIWYG profile builder interface allowing coaches to update their serverless landing pages with live preview tracking.

**Mobile & PWA View** — On-The-Go Gym Floor (viewport width < 1024px):

- **Frictionless Lift Logger** — Touch targets, numerical keyboards, and sliding set selectors designed for high-stress training environments.
- **In-App Messaging & Notifications** — Integrated messaging workspace with immediate audio alerts and push tracking.
- **Embedded WebRTC Call Container** — Compact call viewport utilizing the open Jitsi core to connect coaches and clients instantly on-device.

### 1.B. Access Level Matrix

Dynamic application boundaries lock or expose views to keep users in their context and prevent platform leakage.

```text
                             [ Dynamic Permission Gate ]
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        ▼                                 ▼                                 ▼
   [ Role: Coach ]               [ Role: Coached Trainee ]          [ Role: Solo Trainee ]
```

| Capability | Coach | Coached Trainee | Solo Trainee |
| --- | --- | --- | --- |
| Workout plans | Write plans | Read assigned plans | Load public templates |
| Video calling | Launch video call | Join incoming call | Hidden |
| Chat | Full roster insights | 1-on-1 chat interface | Hidden |
| Logging | — | — | Basic weight logs only |

**Profile modes:**

- **Coach Profile Mode** — Displays full program builders, client rosters, diagnostic feedback interfaces, active video-calling launchers, and marketplace visibility configs.
- **Coached Trainee Profile Mode** (active `coach_id`) — Restricts program modification. Replaces template builders with custom schedules published by their coach. Exposes media upload channels and live chat components.
- **Solo Trainee Profile Mode** (`coach_id` is `NULL`) — Restricts access to coaches. Enables workout builders for logging generic workouts or accessing baseline templates. Completely hides chat systems and WebRTC call features to prevent resource waste.

---

## 2. Serverless Page Builder Architecture

To enable zero-budget operations, TRACE uses a serverless dynamic page model for coach profiles, bypassing static builds and avoiding redeployment fees.

```text
                    [ Request: app.com/coach-alpha ]
                                  │
                                  ▼
                [ Next.js Dynamic Router: /[slug] ]
                                  │
                                  ▼
           [ Fetch Row from Supabase: slug = 'coach-alpha' ]
                                  │
                                  ▼
             [ Parse and Render layout_config JSON ]
```

### 2.A. Static Layout Configuration Schema

A coach's page setup is stored as a single JSONB document inside the `landing_pages` table. The configuration schema is defined as:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "LandingPageConfig",
  "type": "object",
  "required": ["theme", "hero", "links"],
  "properties": {
    "theme": {
      "type": "object",
      "required": ["primary", "surface", "font"],
      "properties": {
        "primary": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "surface": { "type": "string", "pattern": "^#[0-9A-Fa-f]{6}$" },
        "font": { "type": "string", "enum": ["Inter", "Montserrat", "Geist"] }
      }
    },
    "hero": {
      "type": "object",
      "required": ["headline", "subheadline", "avatar"],
      "properties": {
        "headline": { "type": "string", "maxLength": 120 },
        "subheadline": { "type": "string", "maxLength": 300 },
        "avatar": { "type": "string", "format": "uri" }
      }
    },
    "links": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["label", "url", "highlight"],
        "properties": {
          "label": { "type": "string", "maxLength": 50 },
          "url": { "type": "string", "format": "uri" },
          "highlight": { "type": "boolean" }
        }
      }
    }
  }
}
```

### 2.B. Dynamic Component Rendering

When users visit `trace.com/[slug]`, Next.js reads the requested dynamic parameter, queries the schema matching the slug, parses the JSON object on-the-fly, and mounts styled React blocks using zero additional server processing.

---

## 3. Sync & Client State Architecture

TRACE utilizes a decoupled state sync mechanism to ensure reliable operation in offline environments like gym basements, while maintaining fast, high-throughput interfaces on desktop views.

```text
                      [ Log Session Offline ]
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │  Zustand Local Store  │
                     └───────────┬───────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ SQLite Local Cache DB │
                     └───────────┬───────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Outbox Sync Priority  │
                     └───────────┬───────────┘
                                 │
                        [ Online Signal ]
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Supabase Remote Sync  │
                     └───────────────────────┘
```

- **Local Outbox Synchronization Queue** — Mobile apps store workout sessions locally within device memory caches (SQLite / Room / CoreData) when offline. Background queue services continuously check connectivity parameters; once active internet is confirmed, the queue initiates a sync operation with Supabase.
- **Desktop Grid Optimization** — To prevent layout delay, sheet variables are isolated using lightweight memoization wrappers. Changes to single reps or weights resolve within isolated component nodes without refreshing the global program tree.
- **SSE Wearable Monitoring** — Coach portals utilize Server-Sent Events (SSE) to display client wearable data updates in real-time, flashing alert status lines without page refreshes.

---

## 4. RAG AI Fact-Checking & Token Compression Flow

The TRACE Brain uses a localized prompt refiner alongside its RAG pipeline to ensure highly detailed, scientifically grounded responses with sub-second delivery times.

```text
                 [ User Prompt / Injury Flare ]
                               │
                               ▼
            [ Calculate Vector via Embedding Model ]
                               │
                               ▼
           [ Pinecone Semantic Document Fetch (Top 3) ]
                               │
                               ▼
          ┌─────────────────────────────────────────┐
          │      Asynchronous Token Refiner         │
          │  • Run conditional perplexity logic     │
          │  • Compress research text by ≥ 50%      │
          │  • Budget allocations to < 800 tokens   │
          └────────────────────┬────────────────────┘
                               │
                               ▼
             [ Context-Packed Factual Response ]
```

### 4.A. Semantic Information Density Preservation

Before passing research excerpts to the core LLM, the raw text is parsed using a local LLMLingua compression layer. The engine evaluates conditional perplexity across context strings: segments with low informational density are removed, while core numbers, variables, and clinical findings are retained.

### 4.B. Context Sizing Algorithms

To manage API latency and operational costs, the compression engine targets a minimum **50% Compression Ratio (CR)**:

```text
CR = (N_raw − N_compressed) / N_raw  ≥  0.50
```

The overall prompt composition budget ensures that citation tokens are strictly managed to optimize speed and efficiency:

```text
T_citations ≤ T_limit        (T_limit = 800 tokens)
```

Keeping citations within this budget yields significant resource savings and sub-second response times. The total dynamic token budget is calculated on the fly as follows:

```text
T_total = T_system + T_user + T_citations + T_response
```
