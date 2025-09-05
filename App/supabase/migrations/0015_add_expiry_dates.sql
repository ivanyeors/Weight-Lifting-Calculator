-- Add expiry date functionality to user food inventory
-- This allows users to track when their food items expire

-- Add expiry_date column to user_food_inventory
alter table user_food_inventory
add column if not exists expiry_date date;

-- Create index for efficient expiry date queries
create index if not exists idx_user_food_inventory_expiry_date
on user_food_inventory (user_id, expiry_date)
where expiry_date is not null;

-- Update the updated_at trigger to handle expiry_date changes
-- (the existing trigger should already handle this since it updates on any change)

-- Add comment for documentation
comment on column user_food_inventory.expiry_date is 'Optional expiry date for tracking food freshness. Used for "expiring soon" filtering.';
