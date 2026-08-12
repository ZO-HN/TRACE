# Handoff: apply the coach_allowlist migration

For whichever agent/session has direct Supabase access. One job: apply `supabase/migrations/20260812010000_coach_allowlist.sql` to the live project and run the two bootstrap steps after it. This repo's coding agent wrote the migration but does not have permission to push schema changes to the live DB itself — that's why this is a separate handoff.

## Project

- Supabase project ref: `lfaxkrorjljdeefnafjb`
- Repo: `C:\Users\imint\TRACE` (coach dashboard). Migration file already exists at `supabase/migrations/20260812010000_coach_allowlist.sql` — do not recreate it, just apply it.
- CLI is already linked in this repo (confirmed via `npx supabase migration list`, which showed all prior migrations as applied and this one as pending — `"remote":""`).

## What the migration does (read before applying)

1. Adds `profiles.is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE`.
2. Creates `public.coach_allowlist` (email, note, invited_by, created_at) with RLS restricted to platform admins (SELECT/INSERT/DELETE all gated on `is_platform_admin = TRUE`).
3. **Replaces** `public.handle_new_user()` (the trigger function that runs on every new `auth.users` row) so that the new `role` is decided by allowlist membership (case-insensitive email match against `coach_allowlist`) instead of trusting `raw_user_meta_data->>'role'` from the client. Allowlisted email → `role = 'coach'`, `coach_id = NULL`. Everyone else → `role = 'trainee'`, `coach_id` = whatever `platform_settings.default_coach_id` currently holds (unchanged behavior from before this migration).

This is backward compatible for existing rows — the trigger only fires on new `auth.users` inserts, so no existing profile is touched by applying it. The risk is purely in the trigger logic being correct for *future* signups, since it's now the single gate for who becomes a coach.

## Step 1 — Apply the migration

```bash
cd "C:\Users\imint\TRACE"
npx supabase migration list
```

Confirm `20260812010000` shows `"remote":""` (not yet applied) before proceeding. Then:

```bash
npx supabase db push
```

This applies all pending local migrations against the linked remote project — should just be this one, given the earlier `migration list` output showed everything else already synced.

**Verify:**

```bash
npx supabase migration list
```

`20260812010000` should now show a non-empty `remote` timestamp matching `local`.

## Step 2 — Bootstrap: find the coach's profile id

The coach dashboard's owner (the human running this deployment) needs `is_platform_admin = TRUE` set on their own profile row so they can see the new Settings → "Coach access" tab. Their coach account email is `iminthemoodlol@gmail.com`. Find their `profiles.id`:

```sql
SELECT id, email, role, is_platform_admin FROM public.profiles WHERE email = 'iminthemoodlol@gmail.com';
```

Confirm `role = 'coach'` on the row you find. **Do not guess or use a placeholder UUID — confirm the row first, then act on the real id.**

## Step 3 — Set the platform admin flag

Using the `id` confirmed in Step 2:

```sql
UPDATE public.profiles SET is_platform_admin = TRUE WHERE id = '<confirmed-profile-id>';
```

## Step 4 — Optional: seed the coach's own email into the allowlist

Not required for their own dashboard access (their profile row already exists and predates this migration), but keeps the allowlist UI/audit trail consistent with reality:

```sql
INSERT INTO public.coach_allowlist (email) VALUES ('iminthemoodlol@gmail.com')
ON CONFLICT (email) DO NOTHING;
```

## Step 5 — Report back

Confirm to the user:
- Migration applied (`migration list` shows it synced).
- `is_platform_admin` set on their row (re-run the Step 2 SELECT to show `is_platform_admin = TRUE` now).
- They should refresh the coach dashboard and check Settings → "Coach access" appears and loads without an RLS error.

## Out of scope for this handoff

- `platform_settings.default_coach_id` is a **separate**, still-open bootstrap step (unrelated table, controls which coach new TRACE-client trainee signups fall under when they don't pick one explicitly). It's currently empty on the live DB. If the user wants it set in the same sitting, ask for confirmation first — it's a different concern from this migration, covered in `docs/handoff-todo.md` and the original migration file `supabase/migrations/20260803000000_platform_settings_and_rls_fix.sql`.
- Do not add any coach emails to `coach_allowlist` beyond the deploying coach's own (Step 4) unless the user explicitly asks — that's a product decision for them to make via the Settings UI, not something to do proactively here.
