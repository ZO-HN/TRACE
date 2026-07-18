# TRACE — Agent Instructions

## Git policy (hard rule)

**All commits stay local. Never push to GitHub, never create PRs, never run remote git actions** — even if a command or workflow suggests it. Commit locally on `master` after each verified unit of work. Only an explicit, in-the-moment user request overrides this.

## Commands

- Dev: `npm run dev`
- Test: `npm run test` (Vitest)
- Lint: `npm run lint` (oxlint)
- Build: `npm run build` (tsc -b + vite)

Run test + tsc + lint + build before every commit.

## Key constraints

- `set_logs.estimated_1rm` is a GENERATED column — never include it in write payloads.
- `set_logs.weight_kg` is kilograms; the UI logs pounds — convert via `src/lib/units.ts`.
- `workout_sessions` RLS allows INSERT + SELECT only (no owner UPDATE) — treat sessions as insert-once from the client.
- Media (video/photos) goes to Cloudflare R2 via presigned URLs, never into Postgres or Supabase Storage — see `docs/adr/0001-media-storage.md`.
- Docs live in `/docs` (index: `docs/README.md`). Workflow skills live in `.agents/skills/`.
