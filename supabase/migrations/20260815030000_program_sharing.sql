-- Program sharing — generate a link, others join and get their own
-- independent copy. Builds on 010_workout_programs.sql.
--
-- Scoped to authenticated users only, not truly public/no-account viewing
-- like Tracked's — TRACE requires sign-in app-wide already, so this
-- doesn't lose real capability, and it avoids opening an anonymous-access
-- hole into workout_templates (a table this repo doesn't own the RLS for
-- — see the coach dashboard repo). The share_token itself is the
-- capability: any signed-in user who has it can read the program via the
-- policies below, no ownership check.
--
-- Known limitation: join_program_by_token copies program_days rows
-- (including their workout_template_id) into the joiner's own program,
-- but does NOT copy the referenced workout_templates row itself. If a
-- program day points at a PRIVATE template the joiner has no read access
-- to under workout_templates' own RLS, that day will show as unresolved
-- for them until either the source template is more broadly visible or a
-- future migration also clones template content. Documented, not silent.

alter table public.workout_programs
  add column if not exists share_token uuid unique;

create policy "workout_programs_share_token_read"
  on public.workout_programs
  for select
  to authenticated
  using (share_token is not null);

create policy "program_days_share_token_read"
  on public.program_days
  for select
  to authenticated
  using (
    exists (
      select 1 from public.workout_programs p
      where p.id = program_id and p.share_token is not null
    )
  );

create or replace function public.join_program_by_token(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.workout_programs%rowtype;
  v_new_program_id uuid := gen_random_uuid();
begin
  select * into v_source from public.workout_programs where share_token = p_token;
  if not found then
    raise exception 'No program found for that share link.';
  end if;

  insert into public.workout_programs (id, owner_id, name, description, category, split_type, total_weeks)
  values (
    v_new_program_id, auth.uid(), v_source.name, v_source.description,
    v_source.category, v_source.split_type, v_source.total_weeks
  );

  insert into public.program_days (id, program_id, week_number, day_of_week, workout_template_id, notes)
  select gen_random_uuid(), v_new_program_id, week_number, day_of_week, workout_template_id, notes
  from public.program_days
  where program_id = v_source.id;

  return v_new_program_id;
end;
$$;

grant execute on function public.join_program_by_token(uuid) to authenticated;
