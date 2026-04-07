create extension if not exists "uuid-ossp";

create type trigger_type_enum as enum ('email', 'schedule', 'manual', 'webhook', 'file_drop');
create type activity_status_enum as enum ('draft', 'ready_for_review', 'reviewed');
create type node_type_enum as enum ('activity', 'start_event', 'end_event');
create type permission_level_enum as enum ('read', 'edit', 'delegate');

create table if not exists workspaces (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_id uuid references activities(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  node_type node_type_enum not null default 'activity',
  label text not null default '',
  trigger_type trigger_type_enum,
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  status activity_status_enum not null default 'draft',
  updated_at timestamptz not null default now()
);

create table if not exists activity_roles (
  activity_id uuid not null references activities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  permission permission_level_enum not null,
  primary key (activity_id, user_id)
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger activities_updated_at
before update on activities
for each row execute function set_updated_at();

alter table workspaces enable row level security;
alter table activities enable row level security;
alter table activity_roles enable row level security;

create policy "workspace owner access"
  on workspaces for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "activity owner or member access"
  on activities for all
  using (
    owner_id = auth.uid() or exists (
      select 1 from activity_roles
      where activity_roles.activity_id = activities.id
        and activity_roles.user_id = auth.uid()
    )
  )
  with check (owner_id = auth.uid());

create policy "activity roles visible to owner"
  on activity_roles for all
  using (
    exists (
      select 1 from activities
      where activities.id = activity_roles.activity_id
        and activities.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from activities
      where activities.id = activity_roles.activity_id
        and activities.owner_id = auth.uid()
    )
  );
