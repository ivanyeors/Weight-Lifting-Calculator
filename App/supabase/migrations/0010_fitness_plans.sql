-- Fitness plans table
create table if not exists fitness_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, -- managed_users.id this plan belongs to
  owner_id uuid,         -- auth user who created the plan
  title text not null,
  status text not null default 'active',
  duration_days int,
  pillars jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fitness_plans_user on fitness_plans(user_id);

-- Optional: simple updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_fitness_plans_updated on fitness_plans;
create trigger trg_fitness_plans_updated
before update on fitness_plans
for each row execute function set_updated_at();
