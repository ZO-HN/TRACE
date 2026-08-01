# Provisioning — one-shot remote setup

Run these once from the repo root. Everything below is idempotent. As of 2026-07-19 the project (`lfaxkrorjljdeefnafjb`) is live but has **no schema applied** and **no edge function deployed**.

```powershell
# 1. Authenticate the CLI (opens browser)
npx supabase login

# 2. Link this repo to the project
npx supabase link --project-ref lfaxkrorjljdeefnafjb

# 3. Apply ALL migrations (init, schema-gaps patch, direct_messages, template_items)
npx supabase db push

# 4. Seed exercises + the /john coach landing page
#    (db push does not run seed.sql; use the SQL editor or:)
npx supabase db push --include-seed

# 5. Set the R2 secrets for the edge functions (reads supabase/functions/.env)
npx supabase secrets set --env-file supabase/functions/.env

# 6. Deploy the edge functions
npx supabase functions deploy r2-presign
npx supabase functions deploy r2-get-url
npx supabase functions deploy trace-brain
```

`r2-get-url` signs short-lived GET URLs for viewing private media; it shares the
same `R2_*` secrets as `r2-presign` and authorizes via set_logs RLS.

`trace-brain` uses `SUPABASE_SERVICE_ROLE_KEY` (auto-injected) to write ASSISTANT
turns; no extra secret is needed until the RAG/LLM pipeline is wired.

### Migrations applied by `db push`

1. `20260717000000_init_trace.sql` — core schema, trigger, base RLS
2. `20260717000001_patch_schema_gaps.sql` — relations, template scope, set_logs RLS, RPCs
3. `20260719000000_direct_messages.sql` — 1-on-1 chat + realtime
4. `20260719000001_template_items.sql` — template → exercise items
5. `20260719000002_ai_biometrics_rls.sql` — **security**: RLS for ai_* + biometrics

Then configure the **R2 bucket CORS** (dashboard → R2 → bucket → Settings → CORS):

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

## Verify

Ask the agent to re-run its readiness probe, or check manually:

- `npm run dev` → log in → trainee sees the logger; `/john` renders the seeded coach page.
- The probe expects: exercises rows, `landing_pages` `/john` published, `direct_messages` table present, `r2-presign` returning HTTP 200 on OPTIONS.

## Notes

- `supabase/functions/.env` and `.env.local` are secret-bearing and must stay untracked (gitignored via `*.local`; add `supabase/functions/.env` to `.gitignore` if git ever lists it).
- Migrations `20260719000000_direct_messages.sql` and `20260719000001_template_items.sql` were drafted by the agent — review them before step 3 if you haven't.
