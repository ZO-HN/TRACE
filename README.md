# TRACE: coach web dashboard

TRACE is a fitness-coaching platform with a React/TypeScript/Vite coach dashboard and an Expo/React Native trainee app. Both use one Supabase/PostgreSQL backend; TRACE owns canonical SQL migrations and Edge Functions. R2 stores private media. Maintained by TRACE maintainers; documentation updated 2026-10-31.

[Project documentation](docs/README.md) · [Agent instructions](AGENTS.md) · [Current diagnosis](docs/qa/diagnosis-2026-10-31.md) · [Mobile repository](https://github.com/ZO-HN/TRACE-app)

## Run locally

Use CI-compatible Node (currently 24) and `npm ci`. Create git-ignored `.env.local` with the public configuration:

```dotenv
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Run `npm run dev`. Missing configuration surfaces an error; never place server credentials in frontend variables. Use [backend provisioning](docs/operations/backend-provisioning.md) for migrations, authorized coach/admin bootstrap, Auth, media and push setup. Use the existing scripts in `package.json` for build/test/lint commands; [AGENTS.md](AGENTS.md) defines checks by change type.

## Working across both apps

Keep the mobile checkout as sibling `TRACE-client`, or configure `TRACE_CLIENT_PATH` for shared type/contract scripts. Canonical SQL is only in [supabase/migrations](supabase/migrations); types are generated into both apps. [Shared contract](docs/architecture/client-contract.md) and [rollout](docs/operations/cross-app-rollout.md) govern compatibility with independently released phones.

## Product and verification status

Food/workout logging and shared relational paths exist, but the [diagnosis](docs/qa/diagnosis-2026-10-31.md) identifies authorization, persistence and delivery gaps. Coach Brain is a placeholder; mobile BYO-key AI is separate. [Feature specifications](docs/features/README.md) describe acceptance; [architecture evolution](docs/planning/architecture-evolution.md) describes proposed improvements. Neither documentation nor a build certifies production readiness.

Run `node scripts/check-documentation.mjs` for documentation links/navigation. Use [workflow](docs/development/workflow.md) for task/review/evidence management. TRACE is licensed under [MIT](LICENSE).
