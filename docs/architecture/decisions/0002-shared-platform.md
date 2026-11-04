# ADR 0002: Two TypeScript clients and one authoritative PostgreSQL backend

Status: Accepted existing platform boundary; records current implementation. Owner: TRACE maintainers. Recorded: 2026-10-31. Sources: repository manifests, canonical SQL, [current architecture](../overview.md), and the architecture discussion consolidated in the [source register](../../sources.md).

## Context and decision

Coach and trainee workflows need shared identity/relationships and records, while web and device UX differ. Keep React/TypeScript for web, Expo/React Native/TypeScript for mobile, PostgreSQL/Supabase for synchronized records, and TypeScript/Deno for current server functions. TRACE owns backend/schema changes; mobile owns device persistence.

SQLite stores mobile pending changes and cached copies. PostgreSQL is authoritative for synchronized records. RLS/scoped RPCs enforce access regardless of client. Preserve separate planned/performed training data and coach-catalog/personal-program models.

## Consequences

Shared types/contracts reduce schema disagreement; release compatibility still requires coordinated checks. Offline writes need stable IDs, revision-aware delivery, and defined edit conflicts. Two repositories require explicit companion revisions and deployment order. Shared storage does not mean all users can read all records.

## Alternatives and revisit condition

A Go or Rust service can be introduced for a measured processing bottleneck or infrastructure need. A full language rewrite is not justified by an assumed API speed advantage. Microservices add network/operational boundaries; extract a module when measured scaling, isolation, or ownership needs justify it. Proposed caching/jobs/AI changes remain in [architecture evolution](../../planning/architecture-evolution.md).
