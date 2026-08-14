-- 009 — Tracked-parity Tier B
--
-- Backs: progress photos, training-phase "roadmap" goals, notification
-- quiet hours. Drafted from docs/feature-research/tracked-app-parity-gap.md
-- Tier B. Draft only — not applied. Check-in templates (also Tier B) are
-- already live via 391cc0f's checkin_templates/checkin_responses tables,
-- not part of this file.

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  taken_date date not null, -- may differ from created_at (the "date correction" affordance)
  photo_s3_key text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.progress_photos enable row level security;

create policy "progress_photos_owner_all"
  on public.progress_photos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Training-phase / goal roadmap. One trainee can have several phases
-- (e.g. "Cut — Jan-Mar", "Bulk — Apr-Jun"); at most one active at a time
-- is a UI convention, not enforced here.
create table if not exists public.training_phases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  start_date date not null,
  target_date date,
  target_metric text, -- free text: 'bodyweight_kg', 'squat_1rm_kg', etc. — no fixed enum yet
  target_value numeric,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.training_phases enable row level security;

create policy "training_phases_owner_all"
  on public.training_phases
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Notification quiet hours + per-group muting. NOTE: this table only
-- stores the preference — the send-push-on-message edge function (this
-- repo's dashboard-side counterpart) must be updated separately to read
-- and honor it before it actually suppresses anything. Until then this is
-- a client-side-only preference with no delivery-side effect, same
-- "stores the setting, doesn't yet enforce it" caveat noted elsewhere in
-- this codebase for not-yet-wired settings.
create table if not exists public.notification_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  mute_personal boolean not null default false,
  mute_coaching boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.notification_settings enable row level security;

create policy "notification_settings_owner_all"
  on public.notification_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
