do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'organization_role_enum'
  ) then
    create type organization_role_enum as enum ('owner', 'admin', 'member');
  end if;
end $$;

create table if not exists organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role organization_role_enum not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists organization_invitations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role organization_role_enum not null default 'member',
  invited_by uuid references auth.users(id) on delete set null,
  token uuid not null default uuid_generate_v4(),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists organization_invitations_token_unique
  on organization_invitations (token);

create unique index if not exists organization_invitations_pending_email_unique
  on organization_invitations (organization_id, lower(email))
  where accepted_at is null;

insert into organizations (id, name, created_by, created_at)
select
  uuid_generate_v4(),
  coalesce(nullif(trim(split_part(coalesce(u.email, ''), '@', 1)), ''), 'Organisation ' || substr(u.id::text, 1, 8)),
  u.id,
  now()
from auth.users u
where not exists (
  select 1
  from organizations o
  where o.created_by = u.id
);

insert into organization_members (organization_id, user_id, role, created_at)
select
  o.id,
  o.created_by,
  'owner',
  o.created_at
from organizations o
where o.created_by is not null
  and not exists (
    select 1
    from organization_members members
    where members.organization_id = o.id
      and members.user_id = o.created_by
  );

alter table workspaces
  add column if not exists organization_id uuid references organizations(id) on delete cascade;

update workspaces
set organization_id = organizations.id
from organizations
where workspaces.organization_id is null
  and organizations.created_by = workspaces.created_by;

alter table workspaces
  alter column organization_id set not null;

create index if not exists workspaces_organization_id_idx
  on workspaces (organization_id);

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'activity_it_tools') then
    alter table activity_it_tools rename to activity_it_tools_legacy;
  end if;
exception
  when duplicate_table then null;
end $$;

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'it_tools') then
    alter table it_tools rename to it_tools_legacy;
  end if;
exception
  when duplicate_table then null;
end $$;

create table if not exists it_tools (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists it_tools_org_name_lower_unique
  on it_tools (organization_id, lower(name));

create table if not exists activity_it_tools (
  activity_id uuid not null references activities(id) on delete cascade,
  tool_id uuid not null references it_tools(id) on delete cascade,
  primary key (activity_id, tool_id)
);

do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'it_tools_legacy') then
    create temporary table it_tool_migration_map (
      legacy_tool_id uuid not null,
      organization_id uuid not null,
      new_tool_id uuid not null,
      primary key (legacy_tool_id, organization_id)
    ) on commit drop;

    insert into it_tool_migration_map (legacy_tool_id, organization_id, new_tool_id)
    select distinct
      seed.legacy_tool_id,
      seed.organization_id,
      uuid_generate_v4()
    from (
      select
        tools.id as legacy_tool_id,
        workspaces.organization_id
      from it_tools_legacy tools
      join activity_it_tools_legacy links on links.tool_id = tools.id
      join activities on activities.id = links.activity_id
      join workspaces on workspaces.id = activities.workspace_id

      union

      select
        tools.id as legacy_tool_id,
        organizations.id as organization_id
      from it_tools_legacy tools
      join organizations on organizations.created_by = tools.created_by
      where not exists (
        select 1
        from activity_it_tools_legacy links
        where links.tool_id = tools.id
      )
    ) seed
    where seed.organization_id is not null;

    insert into it_tools (id, organization_id, name, description, created_by, created_at)
    select
      mapping.new_tool_id,
      mapping.organization_id,
      legacy.name,
      legacy.description,
      legacy.created_by,
      legacy.created_at
    from it_tool_migration_map mapping
    join it_tools_legacy legacy on legacy.id = mapping.legacy_tool_id
    on conflict do nothing;

    insert into activity_it_tools (activity_id, tool_id)
    select
      links.activity_id,
      mapping.new_tool_id
    from activity_it_tools_legacy links
    join activities on activities.id = links.activity_id
    join workspaces on workspaces.id = activities.workspace_id
    join it_tool_migration_map mapping
      on mapping.legacy_tool_id = links.tool_id
     and mapping.organization_id = workspaces.organization_id
    on conflict do nothing;

    drop table if exists activity_it_tools_legacy;
    drop table if exists it_tools_legacy;
  end if;
end $$;

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table organization_invitations enable row level security;
alter table it_tools enable row level security;
alter table activity_it_tools enable row level security;

drop policy if exists "organizations visible to members" on organizations;
create policy "organizations visible to members"
  on organizations for select
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = organizations.id
        and organization_members.user_id = auth.uid()
    )
  );

drop policy if exists "organizations insert by authenticated users" on organizations;
create policy "organizations insert by authenticated users"
  on organizations for insert
  with check (auth.uid() = created_by);

drop policy if exists "organization members visible to members" on organization_members;
create policy "organization members visible to members"
  on organization_members for select
  using (
    exists (
      select 1
      from organization_members current_membership
      where current_membership.organization_id = organization_members.organization_id
        and current_membership.user_id = auth.uid()
    )
  );

drop policy if exists "organization invites visible to invited or admins" on organization_invitations;
create policy "organization invites visible to invited or admins"
  on organization_invitations for select
  using (
    lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    or exists (
      select 1
      from organization_members
      where organization_members.organization_id = organization_invitations.organization_id
        and organization_members.user_id = auth.uid()
        and organization_members.role in ('owner', 'admin')
    )
  );

drop policy if exists "organization invites insert by admins" on organization_invitations;
create policy "organization invites insert by admins"
  on organization_invitations for insert
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = organization_invitations.organization_id
        and organization_members.user_id = auth.uid()
        and organization_members.role in ('owner', 'admin')
    )
  );

drop policy if exists "organization invites update by invited or admins" on organization_invitations;
create policy "organization invites update by invited or admins"
  on organization_invitations for update
  using (
    lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    or exists (
      select 1
      from organization_members
      where organization_members.organization_id = organization_invitations.organization_id
        and organization_members.user_id = auth.uid()
        and organization_members.role in ('owner', 'admin')
    )
  )
  with check (
    lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    or exists (
      select 1
      from organization_members
      where organization_members.organization_id = organization_invitations.organization_id
        and organization_members.user_id = auth.uid()
        and organization_members.role in ('owner', 'admin')
    )
  );

drop policy if exists "it tools visible within organization" on it_tools;
create policy "it tools visible within organization"
  on it_tools for select
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = it_tools.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

drop policy if exists "it tools insert within organization" on it_tools;
create policy "it tools insert within organization"
  on it_tools for insert
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = it_tools.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

drop policy if exists "activity it tools via organization workspace access" on activity_it_tools;
create policy "activity it tools via organization workspace access"
  on activity_it_tools for all
  using (
    exists (
      select 1
      from activities
      join workspaces on workspaces.id = activities.workspace_id
      join organization_members on organization_members.organization_id = workspaces.organization_id
      where activities.id = activity_it_tools.activity_id
        and organization_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from activities
      join workspaces on workspaces.id = activities.workspace_id
      join organization_members on organization_members.organization_id = workspaces.organization_id
      where activities.id = activity_it_tools.activity_id
        and organization_members.user_id = auth.uid()
    )
  );
