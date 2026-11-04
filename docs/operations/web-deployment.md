# Web deployment

Status: maintained procedure; production configuration unverified. Owner: TRACE maintainers. Updated: 2026-10-31. Sources: Vite config, deployment assets, existing scripts and diagnosis.

## Build and host

Use the intended revision and CI-compatible Node version, `npm ci`, then `npm test`, `npm run lint`, `npm run build`. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at build time. Missing configuration must surface an error; never substitute credentials from another environment.

Deploy `dist/` to the chosen static host with a fallback to `/index.html` for SPA routes. The checked-in `public/_redirects` supports compatible hosts; configure equivalent rewrites on other hosts. Verify a direct nested-route reload, asset caching, and HTTPS. Keep server credentials out of the bundle.

## Preflight and acceptance

- Verify [backend rollout](cross-app-rollout.md), Auth redirects/providers, required migrations/functions, private bucket configuration, Edge/browser preflight, and intended public URLs.
- Load login/public coach pages and actual coach routes. Complete an authorized staging flow for affected features and deny unrelated account access.
- Verify console/network errors, failed-request UX, media upload/playback and cache behavior. Current media entitlement/CORS and routed builder gaps remain diagnosed; do not mark them passed from static deployment alone.
- Record build revision, target environment, deployment identifier and smoke results using [release evidence](../templates/release.md). Returning to the previous static release is a frontend rollback, not a database rollback.

Coach AI remains placeholder behavior; native/offline/push checks belong to mobile/shared acceptance. See [diagnosis](../qa/diagnosis-2026-10-31.md) for unresolved release gates.
