TRACE: Platform Architecture & Product Feature Specs

This document defines the functional features, screen partitions, state patterns, and custom algorithmic pipelines that govern the single-app, dual-role TRACE ecosystem.

1. Frontend View Division & Responsive Layouts

TRACE uses a single, unified codebase that dynamically transforms based on screen size (device break criteria) and profile metadata retrieved during the authentication lifecycle.

                      ┌─────────────────────────────────────────┐
                      │      TRACE App Launch & Auth            │
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


A. Screen Size Split

The viewport split optimizes the application layout to prevent clutter on mobile screens while utilizing expanded real estate on desktop systems:

Desktop View (Deep Work - $\ge 1024\text{px}$ viewport width):

Macrocycle Grid Workspace: Optimized multi-pane spreadsheets mapped for desktop operations. Allows rapid population of workout schedules and progressions.

Interactive Roster Telemetry Dashboard: Aggregated data view detailing client workout compliance, baseline biometrics tracking, and visual stress markers.

Flexible Page Layout Editor: WYSIWYG profile builder interface allowing coaches to update their serverless landing pages with live preview tracking.

Mobile & PWA View (On-The-Go Gym Floor - $< 1024\text{px}$ viewport width):

Frictionless Lift Logger: Touch targets, numerical keyboards, and sliding set selectors designed for high-stress training environments.

In-App Messaging & Notifications: Integrated messaging workspace with immediate audio alerts and push tracking.

Embedded WebRTC Call Container: Compact call viewport utilizing the open Jitsi core to connect coaches and clients instantly on-device.

B. Access Level Access Matrix

Dynamic application boundaries lock or expose views to keep users in their context and prevent platform leakage.

                             [ Dynamic Permission Gate ]
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        ▼                                 ▼                                 ▼
   [ Role: Coach ]               [ Role: Coached Trainee ]          [ Role: Solo Trainee ]
   • Write Workout Plans         • Read Assigned Plans              • Load Public Templates
   • Launch Video Call           • Join Incoming Call               • Hide Chat & Video
   • Full Roster Insights        • 1-on-1 Chat Interface            • Basic Weight Logs Only


Coach Profile Mode:

Displays full program builders, client rosters, diagnostic feedback interfaces, active video-calling launchers, and marketplace visibility configs.

Coached Trainee Profile Mode (Active coach_id):

Restricts program modification. Replaces template builders with custom schedules published by their coach. Exposes media upload channels and live chat components.

Solo Trainee Profile Mode (coach_id is NULL):

Restricts access to coaches. Enables workout builders for logging generic workouts or accessing baseline templates. Completely hides chat systems and WebRTC call features to prevent resource waste.

2. Core UX Strategy & Features

TRACE designs out the traditional pain points of fitness tracking software by lowering cognitive load on trainees and maximizing delivery speeds for coaches.

A. Trainee Interface (Reducing Gym Floor Friction)

Sweat-Resistant Logging: Large, accessible $48\text{px}$ touch targets minimize input errors. Input screens automatically pre-populate with values logged in previous sessions to eliminate guesswork:

Prepopulated Weight = Previous Weight
Prepopulated Reps = Previous Reps

Media-Lean Video Pipeline: Devices downscale captured form check clips locally to $720\text{p}$, capping files under $50\text{MB}$ before uploading directly to Supabase storage to save user bandwidth.

Automated Rest Alerts: Checking off a set launches a floating timer window. Progress notifications update via audio and vibrations when the timer completes.

Macro Quick-Logger: Users type macro totals directly (e.g., "80g Protein") or snap a photo of their plate, keeping logging fast and simple compared to traditional ingredient search loops.

B. Coach Web Portal (Administrative Speed)

Keyboard-First Interface: Program sheets support complete Tab and Enter shortcut mapping. Coaches can write movements, sets, percentages, and RPE notes sequentially without taking their hands off the keyboard.

Master Template Cascading: Coaches write one core workout program block and cascade it across selected client calendars, dynamically calculating dates based on each user's target start date:


Session Date = Client Start Date + 7 * (Template Week - 1) + (Template Day - 1)

Automated Red-Flags Feed: A singular control board displaying critical notifications for roster management:

Missed Workouts: Client missed $2+$ sessions back-to-back.

Strain Warning: Exceeding $10/10$ RPE thresholds on set inputs.

Inactivity Warning: Zero logged biometrics or weight metrics for 7 consecutive days.

3. Serverless Page Builder Architecture

To enable zero-budget operations, TRACE uses a serverless dynamic page model for coach profiles, bypassing static builds and avoiding redeployment fees.

                    [ Request: [app.com/coach-alpha](https://app.com/coach-alpha) ]
                                  │
                                  ▼
                [ Next.js Dynamic Router: /[slug] ]
                                  │
                                  ▼
           [ Fetch Row from Supabase: slug = 'coach-alpha' ]
                                  │
                                  ▼
             [ Parse and Render layout_config JSON ]


A. Static Layout Configuration Schema

A coach’s page setup is stored as a single JSONB document inside the landing_pages table, configuration schema defined as:

{
  "$schema": "[http://json-schema.org/draft-07/schema#](http://json-schema.org/draft-07/schema#)",
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


B. Dynamic Component Rendering

When users visit trace.com/[slug], Next.js reads the requested dynamic parameter, queries the schema matching slug, parses the JSON object on-the-fly, and mounts styled React blocks using zero additional server processing.

4. Sync & Client State Architectures

TRACE utilizes a decoupled state sync mechanism to ensure reliable operation in offline environments like gym basements, while maintaining fast, high-throughput interfaces on desktop views.

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


Local Outbox Synchronization Queue:

Mobile apps store workout sessions locally within device memory caches (SQLite / Room / CoreData) when offline.

Background queue services continuously check connectivity parameters. Once active internet is confirmed, the queue initiates a sync operation with Supabase.

Desktop Grid Optimization:

To prevent layout delay, sheet variables are isolated using lightweight memoization wrappers. Changes to single reps or weights resolve within isolated component nodes without refreshing the global program tree.

SSE Wearable Monitoring:

Coach portals utilize Server-Sent Events (SSE) to display client wearable data updates in real-time, flashing alert status lines without page refreshes.

5. RAG AI Fact-Checking & Token Compression Flow

The TRACE Brain uses a localized prompt refiner alongside its RAG pipeline to ensure highly detailed, scientifically grounded responses with sub-second delivery times.

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


A. Semantic Information Density Preservation

Before passing research excerpts to the core LLM, the raw text is parsed using a local LLMLingua compression layer. The engine evaluates conditional perplexity across context strings: segments with low informational density are removed, while core numbers, variables, and clinical findings are retained.

B. Context Sizing Algorithms
To manage API latency and operational costs, the compression engine targets a minimum 50% Compression Ratio (CR):

CR = (N_raw - N_compressed) / N_raw >= 0.50

The overall prompt composition budget ensures that citation tokens are strictly managed to optimize speed and efficiency:

T_citations <= T_limit

(where T_limit = 800 tokens, resulting in significant resource savings and keeping response times sub-second).

The total dynamic token budget model is calculated on the fly as follows:

T_total = T_system + T_user + T_citations + T_response