-- Periodized training programs — Program contains weeks, each week has up
-- to 7 days, each day either assigns an existing workout_templates row or
-- is a rest day (workout_template_id null).
--
-- Owned by the trainee (owner_id), matching workout_folders' ownership
-- model — a program is a personal training plan, not a coach-assigned
-- template.

create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text,
  category text,
  split_type text not null default 'custom',
  total_weeks smallint not null check (total_weeks between 1 and 52),
  created_at timestamptz not null default now()
);

alter table public.workout_programs enable row level security;

create policy "workout_programs_owner_all"
  on public.workout_programs
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create table if not exists public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs(id) on delete cascade,
  week_number smallint not null check (week_number > 0),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  workout_template_id uuid references public.workout_templates(id) on delete set null,
  notes text,
  unique (program_id, week_number, day_of_week)
);

create index if not exists idx_program_days_program on public.program_days(program_id);

alter table public.program_days enable row level security;

create policy "program_days_owner_all"
  on public.program_days
  for all
  using (
    exists (
      select 1 from public.workout_programs p
      where p.id = program_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_programs p
      where p.id = program_id and p.owner_id = auth.uid()
    )
  );

create table if not exists public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  current_week smallint not null default 1,
  current_day smallint not null default 1
);

create index if not exists idx_program_enrollments_user on public.program_enrollments(user_id);

alter table public.program_enrollments enable row level security;

create policy "program_enrollments_owner_all"
  on public.program_enrollments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
