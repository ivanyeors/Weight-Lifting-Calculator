-- Create a SECURITY DEFINER RPC that exposes public exercise data with involvement
-- This function returns only non-sensitive fields and bypasses RLS safely.

create or replace function public.get_public_exercises()
returns table (
  id text,
  name text,
  description text,
  base_weight_factor numeric,
  muscle_involvement jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    e.id::text,
    e.name,
    coalesce(e.description, ''),
    coalesce(e.base_weight_factor, 1.0),
    coalesce(
      jsonb_object_agg(m.name, em.involvement) filter (where m.name is not null),
      '{}'::jsonb
    ) as muscle_involvement
  from public.exercises e
  left join public.exercise_muscles em on em.exercise_id = e.id
  left join public.muscles m on m.id = em.muscle_id
  group by e.id, e.name, e.description, e.base_weight_factor
  order by e.name;
$$;

-- Ensure only intended roles can execute the function
revoke all on function public.get_public_exercises() from public;
grant execute on function public.get_public_exercises() to anon, authenticated;


