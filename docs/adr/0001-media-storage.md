# ADR 0001 — Media Storage: Supabase + Cloudflare R2 (Hybrid)

- **Status:** Accepted
- **Date:** 2026-07-19
- **Deciders:** TRACE maintainers

## Context

TRACE stores two very different kinds of data:

1. **Structured data** — profiles, workout templates, sessions, set logs, chat. Small, relational, text/numeric.
2. **Heavy binary media** — form-check videos, meal photos, images sent to a coach, and other user files. Large, and growing with every user.

The original spec said form-check clips upload "directly to Supabase storage." That conflicts with the database schema, which already stores an **`form_video_s3_key VARCHAR(500)`** on `set_logs` — i.e. an external object-storage key, not a Supabase Storage path. This ADR resolves that contradiction.

### The binding constraint is egress, not storage

For media, the cost that scales with usage is **egress** (every view/download), not stored bytes. Current limits (verified 2026-07-19):

| | Supabase Free | Supabase Pro ($25/mo) | Cloudflare R2 |
| --- | --- | --- | --- |
| File storage | 1 GB | 100 GB (+$0.021/GB) | 10 GB free (+$0.015/GB) |
| Egress / month | 5 GB | 250 GB (+$0.09/GB) | **$0 (free egress)** |
| Max upload | 50 MB | 500 GB | multipart |

At the spec's target of ~20 MB per 720p clip, the Supabase **Free** egress budget (5 GB/mo) is ~250 total video views per month across all users — exhausted almost immediately. Storage (1 GB ≈ 50 clips) fills nearly as fast. Postgres, by contrast, holds millions of set-log rows within the 500 MB free database.

## Decision

Adopt a **hybrid** storage architecture:

- **Supabase** owns **Postgres, Auth, Row-Level Security, and Realtime.** The free tier is sufficient for structured data well past prototype.
- **Cloudflare R2** owns **all heavy binary media** (videos, meal photos, coach images, misc. files). R2's **zero egress fees** make it the right home for video, where playback bandwidth would otherwise dominate cost.
- The database stores **only the R2 object key + metadata** (as `form_video_s3_key` already anticipates), never the binary itself.

### Implementation rules

- **Direct-to-storage uploads** — the client uploads straight to R2 via a presigned URL. Media never proxies through an app server (avoids paying bandwidth twice).
- **Compress on-device before upload** — 720p, capped under 50 MB, per the existing spec.
- **Private buckets + signed URLs** for meal photos and coach-directed images — this is personal content and must never be public-read.
- **Lifecycle auto-delete** for ephemeral form-check clips (e.g. purge after 30–60 days) to cap storage growth.
- **Never store binary blobs in Postgres.**

## Consequences

**Positive**
- Stays effectively free far longer: video playback incurs no egress bill.
- Future-proof; matches the existing `form_video_s3_key` schema.
- Clean separation of concerns (relational vs. blob).

**Negative / costs**
- A second vendor (R2) to provision and secure, plus presigned-URL issuance (a Supabase Edge Function or small backend endpoint).
- RLS does not extend to R2 — access control for media is enforced via signed URLs, a separate mechanism to get right.

## Alternatives considered

- **Supabase Storage only (Free):** rejected — 1 GB storage / 5 GB egress caps make video non-viable beyond a handful of test users.
- **Supabase Pro only ($25):** viable and simplest (one vendor, integrated RLS), but 250 GB egress is still consumed by video and billed at $0.09/GB beyond. Reasonable as a data-tier upgrade; not the best home for video. Adopt Pro when data-tier needs (no pausing, >500 MB DB, backups) demand it — independent of the media decision.
- **AWS S3 / Backblaze B2:** workable, but S3 charges egress (the exact cost R2 avoids); B2 is cheaper than S3 but R2's $0 egress is the strongest fit for a video-heavy client.
