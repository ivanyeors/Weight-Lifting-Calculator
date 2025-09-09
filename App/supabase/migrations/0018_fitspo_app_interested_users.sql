-- Table for storing emails of users interested in the Fitspo App launch
-- This allows anonymous users to register interest without authentication

create table if not exists fitspo_app_interested_users (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    registered_at timestamptz not null default now(),
    user_agent text,
    ip_address inet,
    source text default 'landing_page' -- where they registered from
);

-- Indexes
create index if not exists idx_fitspo_app_interested_users_email on fitspo_app_interested_users(email);
create index if not exists idx_fitspo_app_interested_users_registered_at on fitspo_app_interested_users(registered_at);

-- RLS: Allow anonymous inserts but restrict reads
alter table fitspo_app_interested_users enable row level security;

-- Allow anonymous users to insert (register interest)
create policy "allow_anonymous_insert" on fitspo_app_interested_users
    for insert with check (true);

-- Only allow authenticated users with service role to read (for admin purposes)
-- This prevents scraping of emails by unauthorized users
create policy "allow_service_role_read" on fitspo_app_interested_users
    for select using (auth.jwt() ->> 'role' = 'service_role');

create policy "allow_service_role_update" on fitspo_app_interested_users
    for update using (auth.jwt() ->> 'role' = 'service_role');

create policy "allow_service_role_delete" on fitspo_app_interested_users
    for delete using (auth.jwt() ->> 'role' = 'service_role');

-- Grants: allow anonymous inserts, but only service role for other operations
grant insert on fitspo_app_interested_users to anon;
grant select, update, delete on fitspo_app_interested_users to service_role;
