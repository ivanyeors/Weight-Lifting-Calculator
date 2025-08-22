-- Managed users (athlete profiles) owned by an authenticated user
-- Includes personal details used across calculators and planners

create table if not exists managed_users (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id) on delete cascade,
    name text not null,

    -- Personal metrics
    body_weight_kg numeric(6,2),
    height_cm smallint,
    age smallint,
    skeletal_muscle_mass_kg numeric(6,2),
    body_fat_mass_kg numeric(6,2),

    gender text check (gender in ('male','female')),
    experience text check (experience in ('cat1','cat2','cat3','cat4','cat5')),

    -- Health and preferences
    medical_conditions text[] not null default '{}'::text[],
    food_allergies text[] not null default '{}'::text[],
    goals text,
    note text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Injuries: link to canonical muscles table
create table if not exists managed_user_injuries (
    user_id uuid not null references managed_users(id) on delete cascade,
    muscle_id uuid not null references muscles(id) on delete cascade,
    primary key (user_id, muscle_id)
);

-- Indexes
create index if not exists idx_managed_users_owner on managed_users(owner_id);
create index if not exists idx_mui_user on managed_user_injuries(user_id);
create index if not exists idx_mui_muscle on managed_user_injuries(muscle_id);

-- Trigger to maintain updated_at
create or replace function set_mu_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_managed_users_updated_at on managed_users;
create trigger trg_managed_users_updated_at
before update on managed_users
for each row execute function set_mu_updated_at();

-- RLS policies: only owners can read/write their profiles
alter table managed_users enable row level security;
alter table managed_user_injuries enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='managed_users' and policyname='select_own_managed_users'
  ) then
    create policy "select_own_managed_users" on managed_users
      for select using (auth.uid() = owner_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='managed_users' and policyname='insert_own_managed_users'
  ) then
    create policy "insert_own_managed_users" on managed_users
      for insert with check (auth.uid() = owner_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='managed_users' and policyname='update_own_managed_users'
  ) then
    create policy "update_own_managed_users" on managed_users
      for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='managed_users' and policyname='delete_own_managed_users'
  ) then
    create policy "delete_own_managed_users" on managed_users
      for delete using (auth.uid() = owner_id);
  end if;
end $$;

-- Injuries policies via ownership of parent managed_users row
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='managed_user_injuries' and policyname='select_own_mui'
  ) then
    create policy "select_own_mui" on managed_user_injuries
      for select using (
        exists (
          select 1 from managed_users mu
          where mu.id = managed_user_injuries.user_id and mu.owner_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='managed_user_injuries' and policyname='insert_own_mui'
  ) then
    create policy "insert_own_mui" on managed_user_injuries
      for insert with check (
        exists (
          select 1 from managed_users mu
          where mu.id = managed_user_injuries.user_id and mu.owner_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='managed_user_injuries' and policyname='delete_own_mui'
  ) then
    create policy "delete_own_mui" on managed_user_injuries
      for delete using (
        exists (
          select 1 from managed_users mu
          where mu.id = managed_user_injuries.user_id and mu.owner_id = auth.uid()
        )
      );
  end if;
end $$;

-- Grants for authenticated clients (RLS enforces ownership)
grant select, insert, update, delete on managed_users to authenticated;
grant select, insert, delete on managed_user_injuries to authenticated;


