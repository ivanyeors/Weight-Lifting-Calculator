-- Initial exercise taxonomy and reference schema
-- System reference tables are globally readable; user-owned tables are protected by RLS.

-- Extensions required (must be before usage)
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create table if not exists muscles (
	id uuid primary key default gen_random_uuid(),
	name text not null unique,
	category text
);

create table if not exists workout_types (
	id uuid primary key default gen_random_uuid(),
	name text not null unique
);

create table if not exists exercises (
	id text primary key,
	name text not null,
	description text,
	base_weight_factor numeric(4,2) not null default 1.00,
	source text not null default 'system', -- 'system'|'user'
	created_by uuid null references auth.users(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create table if not exists exercise_muscles (
	exercise_id text not null references exercises(id) on delete cascade,
	muscle_id uuid not null references muscles(id) on delete cascade,
	involvement smallint not null check (involvement between 0 and 10),
	primary key (exercise_id, muscle_id)
);

create table if not exists exercise_workout_types (
	exercise_id text not null references exercises(id) on delete cascade,
	workout_type_id uuid not null references workout_types(id) on delete cascade,
	primary key (exercise_id, workout_type_id)
);

-- Indexes
create index if not exists idx_exercises_name on exercises using gin (name gin_trgm_ops);
create index if not exists idx_exercise_muscles_ex on exercise_muscles(exercise_id);
create index if not exists idx_exercise_muscles_muscle on exercise_muscles(muscle_id);
create index if not exists idx_exercise_workout_types_ex on exercise_workout_types(exercise_id);
create index if not exists idx_exercise_workout_types_wt on exercise_workout_types(workout_type_id);

-- Triggers
create or replace function set_updated_at()
returns trigger as $$
begin
	new.updated_at = now();
	return new;
end;$$ language plpgsql;

create trigger trg_exercises_updated_at
before update on exercises
for each row execute function set_updated_at();

-- Permissions
alter table exercises enable row level security;

-- Public read for reference data
grant select on exercises to anon, authenticated;
grant select on exercise_muscles to anon, authenticated;
grant select on workout_types to anon, authenticated;
grant select on exercise_workout_types to anon, authenticated;
grant select on muscles to anon, authenticated;

-- RLS: allow inserts/updates for user-created exercises only by owner
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exercises' AND policyname = 'select_all_exercises'
	) THEN
		CREATE POLICY "select_all_exercises" ON exercises FOR SELECT USING (true);
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exercises' AND policyname = 'insert_user_exercise'
	) THEN
		CREATE POLICY "insert_user_exercise" ON exercises FOR INSERT WITH CHECK (
			coalesce(source, 'system') = 'user' AND created_by = auth.uid()
		);
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exercises' AND policyname = 'update_own_user_exercise'
	) THEN
		CREATE POLICY "update_own_user_exercise" ON exercises FOR UPDATE USING (
			coalesce(source, 'system') = 'user' AND created_by = auth.uid()
		) WITH CHECK (
			coalesce(source, 'system') = 'user' AND created_by = auth.uid()
		);
	END IF;
END $$;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'exercises' AND policyname = 'delete_own_user_exercise'
	) THEN
		CREATE POLICY "delete_own_user_exercise" ON exercises FOR DELETE USING (
			coalesce(source, 'system') = 'user' AND created_by = auth.uid()
		);
	END IF;
END $$;

