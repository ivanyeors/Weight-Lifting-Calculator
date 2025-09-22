-- Enforce tier-based limits (Free vs Personal/Trainer) at the DB level
-- - Free: max 2 managed_users and max 2 workout_spaces
-- - Personal/Trainer: unlimited

-- Helper to read current plan from JWT (falls back to 'Free')
create or replace function current_plan()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'plan', ''),
    coalesce(auth.jwt() -> 'user_metadata' ->> 'plan', 'Free')
  );
$$;

-- workout_templates: tighten INSERT policy to include tier-based limit for Free
do $$
begin
  if exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'workout_templates' and policyname = 'insert_own_workout_templates'
  ) then
    drop policy "insert_own_workout_templates" on workout_templates;
  end if;
end $$;

create policy "insert_own_workout_templates" on workout_templates
  for insert
  with check (
    auth.uid() = owner_id
    and (
      current_plan() <> 'Free'
      or (
        select count(1) from workout_templates wt where wt.owner_id = auth.uid()
      ) < 10
    )
  );

-- managed_users: tighten INSERT policy to include tier-based limit
do $$
begin
  if exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'managed_users' and policyname = 'insert_own_managed_users'
  ) then
    drop policy "insert_own_managed_users" on managed_users;
  end if;
end $$;

create policy "insert_own_managed_users" on managed_users
  for insert
  with check (
    auth.uid() = owner_id
    and (
      current_plan() <> 'Free'
      or (
        select count(1) from managed_users mu where mu.owner_id = auth.uid()
      ) < 2
    )
  );

-- workout_spaces: tighten INSERT policy to include tier-based limit
do $$
begin
  if exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'workout_spaces' and policyname = 'insert_own_spaces'
  ) then
    drop policy "insert_own_spaces" on workout_spaces;
  end if;
end $$;

create policy "insert_own_spaces" on workout_spaces
  for insert
  with check (
    auth.uid() = user_id
    and (
      current_plan() <> 'Free'
      or (
        select count(1) from workout_spaces ws where ws.user_id = auth.uid()
      ) < 2
    )
  );

-- Notes:
-- * This relies on `plan` being present in the JWT (either top-level or under user_metadata.plan).
-- * If not present, users default to 'Free'.
-- * Existing SELECT/UPDATE/DELETE policies remain unchanged.


