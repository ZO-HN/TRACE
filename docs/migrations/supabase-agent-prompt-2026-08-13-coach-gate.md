# Prompt for the Supabase/migrations agent — coach referral + signup gate

One migration to apply against the live TRACE Supabase project
(`lfaxkrorjljdeefnafjb`). This changes live signup behavior for
TRACE-client, so treat it with more care than a purely additive migration.

## Revision note (read this first)

The original draft here (`20260813000000_coach_referral_and_signup_gate.sql`)
was caught by a previous agent run's sanity check before anything was
pushed — good catch, nothing was ever applied to the live DB. Two problems
were found and are both fixed in the replacement file below:

1. **Timestamp collision** — `20260813000000_coach_dashboard_analytics.sql`
   already existed at that same timestamp (unrelated migration, doesn't
   touch `handle_new_user`/`coach_allowlist`/`coach_code` — no logic
   conflict, just a filename collision). Renumbered to `20260813000001`.
2. **Stale `handle_new_user()` base** — the draft was written against an
   older copy of that function and would have silently dropped the
   invite-only `coach_allowlist` check added by
   `20260812010000_coach_allowlist.sql` (email on the allowlist → role
   `coach`, else `trainee`). The replacement file merges both: allowlist
   check preserved, only the `default_coach_id` auto-enroll is removed.

The old `.sql.cancelled` file has been deleted. Use the file below instead.

## What to apply

File already exists in the repo, not yet pushed:
`C:\Users\imint\TRACE\supabase\migrations\20260813000001_coach_referral_and_signup_gate.sql`

Apply it with the linked Supabase CLI:

```
cd C:\Users\imint\TRACE
npx supabase db push --linked
```

Then confirm it registered:

```
npx supabase migration list --linked
```

`20260813000001` should show matching `local`/`remote` timestamps.

## What the migration does (context, not instructions — don't re-derive this, just verify it matches)

1. Adds `profiles.coach_code` (unique short code, auto-generated via trigger
   for `role = 'coach'` rows) and backfills existing coaches.
2. Rewrites `handle_new_user()` — **keeps the `coach_allowlist` invite-only
   role check as-is**, but new trainee signups no longer get `coach_id`
   auto-set from `platform_settings.default_coach_id`. Every new trainee
   now starts with `coach_id = NULL`. `platform_settings` is left in place
   (unused, harmless) rather than dropped.
3. Adds three `SECURITY DEFINER` RPCs, granted to `authenticated`:
   - `list_available_coaches()` — returns id/first_name/last_name/coach_code
     for all coaches. Safe: doesn't expose anything beyond what a coach
     picker screen needs.
   - `claim_coach_by_id(p_coach_id uuid)` — sets the caller's own
     `coach_id`, only if caller is `role = 'trainee'` and currently
     `coach_id IS NULL`. Raises if already claimed or coach doesn't exist.
   - `claim_coach_by_code(p_code text)` — same guard, looks up the coach by
     `coach_code` instead of id.

This is the backend half of a feature where TRACE-client now blocks new
trainees behind a "Choose your coach" screen until they pick a coach or
enter a referral code — the client-side code (`ChooseCoachScreen.tsx`,
`useCoachSelection.ts`, the gate in `app/_layout.tsx`) is already built and
typechecked/tested in that repo, just waiting on this migration to be live.

## Before applying — sanity checks

1. **Confirm the live `handle_new_user()` still matches what this migration
   expects to replace** (the allowlist-checking version from
   `20260812010000_coach_allowlist.sql`). Run:
   ```
   npx supabase db query --linked "SELECT pg_get_functiondef('public.handle_new_user'::regproc);"
   ```
   and confirm it's the `coach_allowlist`-checking version already found
   during the previous check, not something newer. If it's changed again
   since, stop and re-diff before applying.

2. **Check `platform_settings.default_coach_id` isn't relied on elsewhere**
   (it was confirmed empty on the live DB as of the last QA pass, so this
   should be a no-op in practice, but worth a quick grep of the dashboard
   repo for any other read of it before removing the write path).

3. **This is a live auth-flow change** — after applying, do one real signup
   test end-to-end in TRACE-client (or ask the user to) to confirm:
   - New trainee signup lands with `coach_id = NULL`.
   - `list_available_coaches()` returns the expected coach roster.
   - Claiming via `claim_coach_by_id` and separately via
     `claim_coach_by_code` both correctly set `coach_id` and can't be
     called a second time on the same account.

## If anything looks off

Stop and report back rather than pushing further changes — this touches the
`handle_new_user()` trigger, which runs on every single signup. A bad state
here blocks new users platform-wide, not just this feature.
