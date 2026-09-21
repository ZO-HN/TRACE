-- Canonical reconciliation of mobile schema previously applied from client drafts.
-- Existing tables, data and matching policies are retained.


create table if not exists public.bodyweight_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  moving_average_window smallint not null default 7
    check (moving_average_window in (7, 14)),
  weigh_in_reminder_enabled boolean not null default false,
  weigh_in_reminder_time time,
  updated_at timestamptz not null default now()
);

alter table public.bodyweight_settings enable row level security;

DO $policy$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bodyweight_settings' AND policyname = 'bodyweight_settings_owner_all') THEN
create policy "bodyweight_settings_owner_all"
  on public.bodyweight_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
END IF; END $policy$;


create table if not exists public.workout_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.workout_folders enable row level security;

DO $policy$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_folders' AND policyname = 'workout_folders_owner_all') THEN
create policy "workout_folders_owner_all"
  on public.workout_folders
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
END IF; END $policy$;

alter table public.workout_templates
  add column if not exists folder_id uuid references public.workout_folders(id) on delete set null;


create table if not exists public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  calories integer,
  created_at timestamptz not null default now()
);

alter table public.custom_foods enable row level security;
DO $policy$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'custom_foods' AND policyname = 'custom_foods_owner_all') THEN
create policy "custom_foods_owner_all" on public.custom_foods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
END IF; END $policy$;

create table if not exists public.favorite_foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  calories integer,
  created_at timestamptz not null default now()
);

alter table public.favorite_foods enable row level security;
DO $policy$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'favorite_foods' AND policyname = 'favorite_foods_owner_all') THEN
create policy "favorite_foods_owner_all" on public.favorite_foods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
END IF; END $policy$;

create table if not exists public.supplements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  calories integer,
  created_at timestamptz not null default now()
);

alter table public.supplements enable row level security;
DO $policy$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'supplements' AND policyname = 'supplements_read_all') THEN
create policy "supplements_read_all" on public.supplements
  for select using (auth.role() = 'authenticated');
END IF; END $policy$;

create table if not exists public.meal_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.meal_templates enable row level security;
DO $policy$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'meal_templates' AND policyname = 'meal_templates_owner_all') THEN
create policy "meal_templates_owner_all" on public.meal_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
END IF; END $policy$;

create table if not exists public.meal_template_items (
  id uuid primary key default gen_random_uuid(),
  meal_template_id uuid not null references public.meal_templates(id) on delete cascade,
  "order" smallint not null default 0,
  name text not null,
  protein_g numeric(6,2),
  carbs_g numeric(6,2),
  fat_g numeric(6,2),
  calories integer
);

alter table public.meal_template_items enable row level security;
DO $policy$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'meal_template_items' AND policyname = 'meal_template_items_owner_all') THEN
create policy "meal_template_items_owner_all" on public.meal_template_items
  for all
  using (exists (
    select 1 from public.meal_templates t
    where t.id = meal_template_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.meal_templates t
    where t.id = meal_template_id and t.user_id = auth.uid()
  ));
END IF; END $policy$;


create table if not exists public.cardio_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.cardio_exercises enable row level security;
DO $policy$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cardio_exercises' AND policyname = 'cardio_exercises_owner_all') THEN
create policy "cardio_exercises_owner_all" on public.cardio_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
END IF; END $policy$;

create table if not exists public.cardio_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cardio_exercise_id uuid not null references public.cardio_exercises(id) on delete cascade,
  entry_date date not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  created_at timestamptz not null default now()
);

alter table public.cardio_entries enable row level security;
DO $policy$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cardio_entries' AND policyname = 'cardio_entries_owner_all') THEN
create policy "cardio_entries_owner_all" on public.cardio_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
END IF; END $policy$;

create index if not exists cardio_entries_user_date_idx
  on public.cardio_entries (user_id, entry_date desc);


create table if not exists public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sleep_date date not null, -- the wake-up date; one row per night, like bodyweight_logs
  bedtime timestamptz not null,
  wake_time timestamptz not null,
  quality smallint not null check (quality between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, sleep_date)
);

alter table public.sleep_logs enable row level security;
DO $policy$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sleep_logs' AND policyname = 'sleep_logs_owner_all') THEN
create policy "sleep_logs_owner_all" on public.sleep_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
END IF; END $policy$;

create index if not exists sleep_logs_user_date_idx
  on public.sleep_logs (user_id, sleep_date desc);

create or replace function public.list_coach_roster()
returns table (id uuid, display_name text)
language sql
security definer
set search_path = public
as $$
  select p.id, coalesce(p.first_name || ' ' || p.last_name, 'Athlete')
  from public.profiles p
  where p.coach_id = (select coach_id from public.profiles where id = auth.uid())
    and p.id <> auth.uid()
    and p.role = 'trainee'
  order by p.first_name
  limit 200;
$$;

grant execute on function public.list_coach_roster() to authenticated;


create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

alter table public.follows enable row level security;

DO $policy$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'follows' AND policyname = 'follows_owner_all') THEN
create policy "follows_owner_all"
  on public.follows
  for all
  using (auth.uid() = follower_id)
  with check (auth.uid() = follower_id);
END IF; END $policy$;


create or replace function public.get_exercise_leaderboard(p_exercise_id uuid)
returns table (
  user_id uuid,
  display_name text,
  weight_lbs numeric,
  reps integer,
  rpe numeric,
  volume numeric,
  sets integer
)
language sql
security definer
set search_path = public
as $$
  with scope as (
    select auth.uid() as uid
    union
    select followee_id from public.follows where follower_id = auth.uid()
  ),
  best_set as (
    select
      ws.user_id,
      sl.weight_kg,
      sl.reps,
      sl.rpe,
      row_number() over (
        partition by ws.user_id
        order by sl.weight_kg * sl.reps desc
      ) as rn
    from public.set_logs sl
    join public.workout_sessions ws on ws.id = sl.session_id
    join scope on scope.uid = ws.user_id
    where sl.exercise_id = p_exercise_id
      and ws.completed_at >= now() - interval '30 days'
  ),
  agg as (
    select
      ws.user_id,
      sum(sl.weight_kg * sl.reps) as volume,
      count(*) as sets
    from public.set_logs sl
    join public.workout_sessions ws on ws.id = sl.session_id
    join scope on scope.uid = ws.user_id
    where sl.exercise_id = p_exercise_id
      and ws.completed_at >= now() - interval '30 days'
    group by ws.user_id
  )
  select
    p.id,
    coalesce(p.first_name || ' ' || p.last_name, 'Athlete'),
    round(best_set.weight_kg / 0.45359237, 1),
    best_set.reps,
    best_set.rpe,
    agg.volume,
    agg.sets
  from best_set
  join agg on agg.user_id = best_set.user_id
  join public.profiles p on p.id = best_set.user_id
  where best_set.rn = 1
  order by (best_set.weight_kg * best_set.reps) desc
  limit 50;
$$;

grant execute on function public.get_exercise_leaderboard(uuid) to authenticated;
