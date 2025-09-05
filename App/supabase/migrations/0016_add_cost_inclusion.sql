-- Add cost inclusion functionality to user food inventory
-- This allows users to toggle whether cost affects inventory management

-- Add include_cost column to user_food_inventory
alter table user_food_inventory
add column if not exists include_cost boolean not null default true;

-- Update existing records based on whether they have price data
-- If price_per_base exists, assume cost inclusion was intended
-- If no price_per_base, set include_cost to false (exclude cost)
update user_food_inventory
set include_cost = case
  when price_per_base is not null and price_per_base > 0 then true
  else false
end;

-- Create index for efficient cost inclusion queries
create index if not exists idx_user_food_inventory_include_cost
on user_food_inventory (user_id, include_cost)
where include_cost = true;

-- Add comment for documentation
comment on column user_food_inventory.include_cost is 'Whether to include cost in inventory management logic. When true, quantity input requires non-zero cost. When false, quantity can be set without cost.';

-- Optional: Clean up inconsistent data
-- Remove inventory amounts where include_cost is true but no price is set
-- (This prevents orphaned inventory that can't be edited due to cost gating)
/*
update user_food_inventory
set std_remaining = 0
where include_cost = true
  and (price_per_base is null or price_per_base <= 0)
  and std_remaining > 0;
*/
