# ADR 0001: Separate structured data and private media

Status: Accepted storage boundary; security/operational completion remains open. Owner: TRACE maintainers. Original decision: 2026-07-19. Revised: 2026-10-31. Sources: current R2 functions and the prior media decision, credited in the [source register](../../sources.md).

## Context

Workout clips, progress/meal images, and documents have different size, delivery, and retention needs from relational fitness records. Database ownership policies do not automatically protect externally stored objects. The decision must include an explicit entitlement boundary.

## Decision

Supabase owns structured records, Auth, RLS, and Realtime. R2 holds private binary media. PostgreSQL stores object keys/metadata. Clients upload directly with short-lived signed URLs; credentials stay in backend secrets. URL issuance must validate the permitted relationship to trustworthy ownership records. A client-writable reference or an unpredictable key alone does not establish entitlement.

## Consequences

Direct upload avoids proxying large payloads through the API and separates media scaling from relational workloads. It adds a second service to provision, monitor, and secure. Costs depend on current vendor terms and workload; historical price tables and free-tier capacity promises are removed.

Compression, actual object validation, cleanup, retention, deletion, and private playback require explicit implementation and acceptance. No live lifecycle policy, resolution limit, or content verification is claimed here. See the [function contract](../../../supabase/functions/r2-presign/README.md), [coaching/media specification](../../features/coaching.md), and diagnosis findings D01/D02/D05/D06/D22.

## Alternatives and revisit condition

Integrated Supabase Storage simplifies ownership integration; another object store can meet similar needs. Revisit if operational cost, access-control complexity, data residency, or measured media-delivery needs outweigh the current split. Provider choice does not waive entitlement tests.
