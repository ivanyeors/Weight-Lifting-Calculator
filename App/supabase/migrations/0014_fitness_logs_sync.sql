-- Fitness logs table for syncing daily logs from fitness-goal to database
create table if not exists fitness_logs (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references fitness_plans(id) on delete cascade,
  user_id uuid not null references managed_users(id) on delete cascade,
  date date not null,
  food_kcals decimal,
  water_liters decimal,
  sleep_hours decimal,
  exercise_kcals decimal,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id, date)
);

create index if not exists idx_fitness_logs_plan_date on fitness_logs(plan_id, date);
create index if not exists idx_fitness_logs_user_date on fitness_logs(user_id, date);

-- Trigger to maintain updated_at
drop trigger if exists trg_fitness_logs_updated_at on fitness_logs;
create trigger trg_fitness_logs_updated_at
before update on fitness_logs
for each row execute function set_updated_at();

-- RLS
alter table fitness_logs enable row level security;

-- Policies (owner of the plan can manage logs)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='fitness_logs' and policyname='select_own_fitness_logs'
  ) then
    create policy "select_own_fitness_logs" on fitness_logs
      for select using (
        exists (
          select 1 from fitness_plans p
          where p.id = fitness_logs.plan_id and p.owner_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='fitness_logs' and policyname='insert_own_fitness_logs'
  ) then
    create policy "insert_own_fitness_logs" on fitness_logs
      for insert with check (
        exists (
          select 1 from fitness_plans p
          where p.id = fitness_logs.plan_id and p.owner_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='fitness_logs' and policyname='update_own_fitness_logs'
  ) then
    create policy "update_own_fitness_logs" on fitness_logs
      for update using (
        exists (
          select 1 from fitness_plans p
          where p.id = fitness_logs.plan_id and p.owner_id = auth.uid()
        )
      ) with check (
        exists (
          select 1 from fitness_plans p
          where p.id = fitness_logs.plan_id and p.owner_id = auth.uid()
        )
      );
  end if;
end $$;

grant select, insert, update on fitness_logs to authenticated;
