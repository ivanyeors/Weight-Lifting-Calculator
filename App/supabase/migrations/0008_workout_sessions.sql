-- Platform workout sessions (calendar events) with participants and Google linkage

create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  description text,
  workout_space_id uuid references workout_spaces(id) on delete set null,
  workout_template_id uuid references workout_templates(id) on delete set null,
  location text,
  -- ui colors (optional)
  background_color text,
  border_color text,
  -- google linkage per accountId -> googleEventId
  google_linked jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_workout_sessions_owner on workout_sessions(owner_id);
create index if not exists idx_workout_sessions_time on workout_sessions(start_at, end_at);

-- Participants (managed users)
create table if not exists workout_session_participants (
  session_id uuid not null references workout_sessions(id) on delete cascade,
  user_id uuid not null references managed_users(id) on delete cascade,
  status text not null default 'active',
  attendance text check (attendance in ('present','absent','late','cancelled')),
  primary key (session_id, user_id)
);

create index if not exists idx_wsp_session on workout_session_participants(session_id);
create index if not exists idx_wsp_user on workout_session_participants(user_id);

-- Trigger to maintain updated_at
create or replace function set_ws_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;$$ language plpgsql;

drop trigger if exists trg_workout_sessions_updated_at on workout_sessions;
create trigger trg_workout_sessions_updated_at
before update on workout_sessions
for each row execute function set_ws_updated_at();

-- RLS
alter table workout_sessions enable row level security;
alter table workout_session_participants enable row level security;

-- Policies for sessions (owner-based)
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='workout_sessions' and policyname='select_own_workout_sessions'
  ) then
    create policy "select_own_workout_sessions" on workout_sessions
      for select using (auth.uid() = owner_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='workout_sessions' and policyname='insert_own_workout_sessions'
  ) then
    create policy "insert_own_workout_sessions" on workout_sessions
      for insert with check (auth.uid() = owner_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='workout_sessions' and policyname='update_own_workout_sessions'
  ) then
    create policy "update_own_workout_sessions" on workout_sessions
      for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='workout_sessions' and policyname='delete_own_workout_sessions'
  ) then
    create policy "delete_own_workout_sessions" on workout_sessions
      for delete using (auth.uid() = owner_id);
  end if;
end $$;

-- Policies for participants by ownership of parent session
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='workout_session_participants' and policyname='select_own_wsp'
  ) then
    create policy "select_own_wsp" on workout_session_participants
      for select using (
        exists (
          select 1 from workout_sessions s
          where s.id = workout_session_participants.session_id and s.owner_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='workout_session_participants' and policyname='insert_own_wsp'
  ) then
    create policy "insert_own_wsp" on workout_session_participants
      for insert with check (
        exists (
          select 1 from workout_sessions s
          where s.id = workout_session_participants.session_id and s.owner_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='workout_session_participants' and policyname='delete_own_wsp'
  ) then
    create policy "delete_own_wsp" on workout_session_participants
      for delete using (
        exists (
          select 1 from workout_sessions s
          where s.id = workout_session_participants.session_id and s.owner_id = auth.uid()
        )
      );
  end if;
end $$;

grant select, insert, update, delete on workout_sessions to authenticated;
grant select, insert, delete on workout_session_participants to authenticated;


