-- Workout templates for planning sessions

create table if not exists workout_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  workout_space_id uuid references workout_spaces(id) on delete set null,
  exercises jsonb not null default '[]'::jsonb, -- array of {exerciseId, sets, reps, restTime}
  estimated_calories integer,
  estimated_time integer,
  usage_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workout_templates_owner on workout_templates(owner_id);

-- Trigger to maintain updated_at
create or replace function set_wt_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_workout_templates_updated_at on workout_templates;
create trigger trg_workout_templates_updated_at
before update on workout_templates
for each row execute function set_wt_updated_at();

-- RLS
alter table workout_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='workout_templates' and policyname='select_own_workout_templates'
  ) then
    create policy "select_own_workout_templates" on workout_templates
      for select using (auth.uid() = owner_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='workout_templates' and policyname='insert_own_workout_templates'
  ) then
    create policy "insert_own_workout_templates" on workout_templates
      for insert with check (auth.uid() = owner_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='workout_templates' and policyname='update_own_workout_templates'
  ) then
    create policy "update_own_workout_templates" on workout_templates
      for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='workout_templates' and policyname='delete_own_workout_templates'
  ) then
    create policy "delete_own_workout_templates" on workout_templates
      for delete using (auth.uid() = owner_id);
  end if;
end $$;

grant select, insert, update, delete on workout_templates to authenticated;


