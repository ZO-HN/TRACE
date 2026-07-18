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

# 5. Set the R2 secrets for the edge function (reads supabase/functions/.env)
npx supabase secrets set --env-file supabase/functions/.env

# 6. Deploy the presign function
npx supabase functions deploy r2-presign
```

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
