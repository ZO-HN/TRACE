# Deployment

TRACE is a static Vite SPA (frontend) plus Supabase (Postgres, Auth, Edge Functions) and Cloudflare R2 (media). This covers shipping the frontend; backend setup is in [provisioning.md](provisioning.md).

## Pre-deploy checklist

- [ ] Backend provisioned end-to-end ([provisioning.md](provisioning.md)) — all 5 migrations applied, both edge functions deployed, R2 bucket + CORS configured.
- [ ] `npm run test` · `npm run build` · `npm run lint` all green.
- [ ] Production Supabase **anon** key + URL ready (never ship the service-role key to the client).
- [ ] R2 bucket CORS `AllowedOrigins` includes the production domain (not just `localhost`).
- [ ] Auth redirect / Site URL in the Supabase dashboard set to the production domain.

## Build

```bash
npm run build      # tsc -b + vite build → dist/
```

The `dist/` output is fully static. `public/_redirects` (`/* /index.html 200`) ships with it so client-side routes like `/john` resolve on reload.

## Host (static — pick one)

Any static host works. Set the two env vars at build time and point the host at `dist/`.

**Cloudflare Pages** (keeps everything on one platform as R2):
- Build command: `npm run build`
- Output directory: `dist`
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- SPA fallback: `_redirects` is honored automatically.

**Netlify:** same build/output; `_redirects` is native.

**Vercel:** add a rewrite of all paths to `/index.html` (or a `vercel.json`), since `_redirects` is Netlify/Pages-specific.

## Environment variables (client)

Only two, both public-safe (the anon key is designed to be shipped; RLS is the real guard):

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Server-side secrets (R2 keys, service-role key) live **only** as Supabase function secrets — never in the frontend build. `supabase/functions/.env` is gitignored.

## Post-deploy smoke test

1. Load the site → sign up → confirm the profile row is created (auth trigger).
2. As a trainee: log a set offline (DevTools → offline), reload, go online → the "queued" badge drains and rows appear in `set_logs`.
3. Visit `/<coach-slug>` → the published landing page renders.
4. As a coach: create a template, see a connected trainee in the roster, exchange a chat message.
5. Attach a form clip → confirm the object lands in the R2 bucket and the key is on the set row.

## Known limitations at launch

- **TRACE Brain** returns a placeholder until the RAG pipeline (embedding → Pinecone → LLM) is wired into `trace-brain`.
- **Jitsi** rooms are open-by-name (v1); add a lobby/password or self-hosted JWT Jitsi before untrusted use.
- **Media read-back** is wired end-to-end (`r2-get-url` presigned GET, authorized by set_logs RLS). A dedicated coach set-history/review screen for browsing past clips is still a future UI.
