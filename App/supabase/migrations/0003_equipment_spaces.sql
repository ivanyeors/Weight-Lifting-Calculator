-- Equipment and workout spaces schema + availability view

create table if not exists equipment (
	id uuid primary key default gen_random_uuid(),
	name text not null unique,
	category text,
	aliases text[] default '{}'::text[]
);

create table if not exists exercise_equipment (
	exercise_id text not null references exercises(id) on delete cascade,
	equipment_id uuid not null references equipment(id) on delete cascade,
	is_required boolean not null default true,
	notes text,
	primary key (exercise_id, equipment_id)
);

create table if not exists workout_spaces (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	name text not null,
	description text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists space_equipment (
	space_id uuid not null references workout_spaces(id) on delete cascade,
	equipment_id uuid not null references equipment(id) on delete cascade,
	primary key (space_id, equipment_id)
);

-- Indexes
create index if not exists idx_exercise_equipment_ex on exercise_equipment(exercise_id);
create index if not exists idx_exercise_equipment_eq on exercise_equipment(equipment_id);
create index if not exists idx_space_equipment_space on space_equipment(space_id);
create index if not exists idx_space_equipment_eq on space_equipment(equipment_id);
create index if not exists idx_workout_spaces_user on workout_spaces(user_id);

-- Triggers for timestamps
create or replace function set_ws_updated_at()
returns trigger as $$
begin
	new.updated_at = now();
	return new;
end;$$ language plpgsql;

create trigger trg_workout_spaces_updated_at
before update on workout_spaces
for each row execute function set_ws_updated_at();

-- RLS for user-owned spaces
alter table workout_spaces enable row level security;
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_spaces' AND policyname = 'select_own_spaces'
	) THEN
		CREATE POLICY "select_own_spaces" ON workout_spaces FOR SELECT USING (auth.uid() = user_id);
	END IF;
END $$;
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_spaces' AND policyname = 'insert_own_spaces'
	) THEN
		CREATE POLICY "insert_own_spaces" ON workout_spaces FOR INSERT WITH CHECK (auth.uid() = user_id);
	END IF;
END $$;
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_spaces' AND policyname = 'update_own_spaces'
	) THEN
		CREATE POLICY "update_own_spaces" ON workout_spaces FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
	END IF;
END $$;
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workout_spaces' AND policyname = 'delete_own_spaces'
	) THEN
		CREATE POLICY "delete_own_spaces" ON workout_spaces FOR DELETE USING (auth.uid() = user_id);
	END IF;
END $$;

grant select on equipment to anon, authenticated;
grant select on exercise_equipment to anon, authenticated;

-- View: available_exercises_for_space
create or replace view available_exercises_for_space as
select
	ws.id as space_id,
	e.id as exercise_id
from workout_spaces ws
join exercises e on true
where not exists (
	select 1
	from exercise_equipment ee
	where ee.exercise_id = e.id
		and ee.is_required = true
		and not exists (
			select 1 from space_equipment se
			where se.space_id = ws.id and se.equipment_id = ee.equipment_id
		)
);

-- Optional: separate schema for catalog tables for cleaner public schema
-- create schema if not exists catalog;
-- alter table if exists exercises set schema catalog;
-- alter table if exists muscles set schema catalog;
-- alter table if exists workout_types set schema catalog;
-- alter table if exists exercise_muscles set schema catalog;
-- alter table if exists exercise_workout_types set schema catalog;
-- Note: moving schemas requires updating RLS grants and any code referring to public schema.
