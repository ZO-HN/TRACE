-- 008 — Tracked-parity Tier A
--
-- Backs: warm-up set exclusion from muscle volume, set failure marking,
-- isometric hold (duration) sets, net-carbs/sugar nutrition fields, water
-- logging. Drafted from docs/feature-research/tracked-app-parity-gap.md
-- Tier A. None of this is applied yet — same "draft only" status as
-- 001-007 in APPLY_ALL.md.
--
-- CAUTION: the set_logs and nutrition_logs columns below touch tables the
-- dashboard repo owns and that are already live in production — verify
-- these columns don't already exist under different names before applying,
-- same caveat APPLY_ALL.md gives 002/004/007.

-- set_logs: warm-up flag, failure flag, set type (reps vs. duration)
alter table public.set_logs
  add column if not exists is_warmup boolean not null default false;

alter table public.set_logs
  add column if not exists is_failure boolean not null default false;

alter table public.set_logs
  add column if not exists set_type text not null default 'reps'
    check (set_type in ('reps', 'duration'));

alter table public.set_logs
  add column if not exists duration_seconds integer;

-- nutrition_logs: sugar + fiber, for a net-carbs toggle
alter table public.nutrition_logs
  add column if not exists fiber_g numeric;

alter table public.nutrition_logs
  add column if not exists sugar_g numeric;

-- water_logs: new table, one row per user per day (mirrors bodyweight_logs'
-- upsert-by-day shape)
create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  logged_date date not null,
  amount_ml integer not null check (amount_ml >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, logged_date)
);

alter table public.water_logs enable row level security;

create policy "water_logs_owner_all"
  on public.water_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
