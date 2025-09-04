-- Add aliases column to foods table to support food name variations
-- This enables the nutrition system to recognize alternative names for foods

alter table foods
add column if not exists aliases text[] default '{}'::text[];

-- Add index for alias lookups (useful for searching)
create index if not exists idx_foods_aliases on foods using gin (aliases);

-- Update existing foods with aliases from seed data
-- This will populate aliases for foods that already exist in the database
-- Note: This is a one-time update; new foods should have aliases set during seeding
