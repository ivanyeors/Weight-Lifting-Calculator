-- Nutrition recipes and ingredients metadata

create table if not exists nutrition_recipes (
  id uuid primary key default gen_random_uuid(),
  recipe_key text unique, -- stable key from app (e.g., r.id)
  name text not null,
  base_servings integer not null,
  diets text[] not null default '{}',
  category text,
  calories_per_serving numeric(10,2) not null default 0,
  macros_per_serving jsonb not null default '{}'::jsonb,
  micros_per_serving jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nutrition_recipes_key on nutrition_recipes (recipe_key);

create or replace function set_nutrition_recipes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_nutrition_recipes_updated_at on nutrition_recipes;
create trigger trg_nutrition_recipes_updated_at
before update on nutrition_recipes
for each row execute function set_nutrition_recipes_updated_at();

create table if not exists nutrition_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references nutrition_recipes(id) on delete cascade,
  food_id uuid references foods(id) on delete set null,
  name text not null,
  quantity_amount numeric(12,2) not null,
  quantity_unit text not null,
  unique (recipe_id, name)
);

-- permissions: reference data should be readable by all; writes allowed to authenticated
grant select on nutrition_recipes to anon, authenticated;
grant select on nutrition_recipe_ingredients to anon, authenticated;
grant insert, update, delete on nutrition_recipes to authenticated;
grant insert, update, delete on nutrition_recipe_ingredients to authenticated;

