-- Tighten RLS and grants for spaces + equipment linkage and view usability

-- Ensure RLS + policies for space_equipment so rows are user-owned via the parent space
alter table space_equipment enable row level security;

do $$
begin
	if not exists (
		select 1 from pg_policies where schemaname='public' and tablename='space_equipment' and policyname='select_own_space_equipment'
	) then
		create policy "select_own_space_equipment" on space_equipment
		for select using (
			exists (
				select 1 from workout_spaces ws
				where ws.id = space_equipment.space_id and ws.user_id = auth.uid()
			)
		);
	end if;
end $$;

do $$
begin
	if not exists (
		select 1 from pg_policies where schemaname='public' and tablename='space_equipment' and policyname='insert_own_space_equipment'
	) then
		create policy "insert_own_space_equipment" on space_equipment
		for insert with check (
			exists (
				select 1 from workout_spaces ws
				where ws.id = space_equipment.space_id and ws.user_id = auth.uid()
			)
		);
	end if;
end $$;

do $$
begin
	if not exists (
		select 1 from pg_policies where schemaname='public' and tablename='space_equipment' and policyname='delete_own_space_equipment'
	) then
		create policy "delete_own_space_equipment" on space_equipment
		for delete using (
			exists (
				select 1 from workout_spaces ws
				where ws.id = space_equipment.space_id and ws.user_id = auth.uid()
			)
		);
	end if;
end $$;

-- Grants: allow authenticated users to read/write their own spaces (RLS enforces ownership)
grant select on workout_spaces to authenticated;
grant insert, update, delete on workout_spaces to authenticated;

grant select, insert, delete on space_equipment to authenticated;

-- Allow selecting the availability view
grant select on available_exercises_for_space to authenticated;