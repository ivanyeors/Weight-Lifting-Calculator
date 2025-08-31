-- Foods and user inventory for nutrition planner
-- System reference table: foods
create table if not exists foods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text,
  unit_kind text not null check (unit_kind in ('mass','volume','count')),
  -- macros per 100 base units (g/ml or per piece when unit_kind='count')
  carbs_per_100 numeric(7,2) not null default 0,
  fats_per_100 numeric(7,2) not null default 0,
  protein_per_100 numeric(7,2) not null default 0,
  micros jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_foods_name_trgm on foods using gin (name gin_trgm_ops);

create or replace function set_foods_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_foods_updated_at on foods;
create trigger trg_foods_updated_at
before update on foods
for each row execute function set_foods_updated_at();

-- User-owned pantry/inventory
create table if not exists user_food_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid not null references foods(id) on delete cascade,
  std_remaining numeric(12,2) not null default 0, -- base units: g/ml or pieces
  price_per_base numeric(12,4), -- price per 1 base unit
  package_size_base numeric(12,2), -- optional pack size in base units
  package_price numeric(12,2),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, food_id)
);

create or replace function set_user_food_inventory_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_user_food_inventory_updated_at on user_food_inventory;
create trigger trg_user_food_inventory_updated_at
before update on user_food_inventory
for each row execute function set_user_food_inventory_updated_at();

-- Enable RLS and policies
alter table user_food_inventory enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_food_inventory' and policyname='select_own_pantry'
  ) then
    create policy "select_own_pantry" on user_food_inventory
      for select using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_food_inventory' and policyname='insert_own_pantry'
  ) then
    create policy "insert_own_pantry" on user_food_inventory
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_food_inventory' and policyname='update_own_pantry'
  ) then
    create policy "update_own_pantry" on user_food_inventory
      for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_food_inventory' and policyname='delete_own_pantry'
  ) then
    create policy "delete_own_pantry" on user_food_inventory
      for delete using (auth.uid() = user_id);
  end if;
end $$;

-- read permissions: foods is reference data → readable by anon/authenticated
grant select on foods to anon, authenticated;
-- user pantry is protected by RLS but allow operations for authenticated role
grant select, insert, update, delete on user_food_inventory to authenticated;
