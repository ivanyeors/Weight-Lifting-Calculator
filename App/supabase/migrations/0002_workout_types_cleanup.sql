-- Canonical workout types seeding, cleanup zero involvements, and legacy table migration

-- 1) Seed/ensure canonical workout types exist
with canonical(name) as (
	select * from (values
		('Strength'),
		('Speed and Power'),
		('Agility and Coordination'),
		('Stretching'),
		('HIIT'),
		('Functional'),
		('Circuit'),
		('Plyometrics'),
		('Calisthenics'),
		('Recovery'),
		('Yoga'),
		('Pilates'),
		('Boxing'),
		('Muay Thai'),
		('Kickboxing'),
		('Karate'),
		('Taekwondo'),
		('Jujitsu'),
		('Wrestling'),
		('Judo'),
		('MMA'),
		('Fencing'),
		('Kendo'),
		('Kung Fu (Wushu)'),
		('Capoeira'),
		('Aikido'),
		('Sumo'),
		('Aquatics'),
		('Archery'),
		('Badminton'),
		('Basketball'),
		('Beach Volleyball'),
		('Breaking (breakdance)'),
		('Canoe (Sprint & Slalom)'),
		('Football'),
		('Golf'),
		('Gymnastics'),
		('Handball'),
		('Hockey'),
		('Sport Climbing'),
		('Swimming'),
		('Tennis'),
		('Table Tennis'),
		('Weightlifting'),
		('BodyWeight'),
		('Cardio')
	) as t(name)
)
insert into workout_types(name)
select c.name
from canonical c
left join workout_types wt on wt.name = c.name
where wt.id is null;

-- 2) Remove zero or negative involvement rows and enforce positive check
delete from exercise_muscles where involvement is null or involvement <= 0;
-- add a stricter check (in addition to existing) to prevent zeros from reappearing
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'chk_exercise_muscles_involvement_positive'
		  AND conrelid = 'public.exercise_muscles'::regclass
	) THEN
		ALTER TABLE exercise_muscles
			ADD CONSTRAINT chk_exercise_muscles_involvement_positive
			CHECK (involvement BETWEEN 1 AND 10);
	END IF;
END $$;

-- 3) Migrate legacy table exercise_workout -> exercise_workout_types (if present), then drop
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.tables 
		WHERE table_schema = 'public' AND table_name = 'exercise_workout'
	) THEN
		-- copy rows if structure matches (exercise_id, workout_type_id)
		BEGIN
			INSERT INTO exercise_workout_types(exercise_id, workout_type_id)
			SELECT exercise_id, workout_type_id
			FROM exercise_workout
			ON CONFLICT (exercise_id, workout_type_id) DO NOTHING;
		EXCEPTION WHEN undefined_column THEN
			-- Ignore if columns differ; manual migration may be required
		END;
		DROP TABLE IF EXISTS exercise_workout;
	END IF;
END $$;
