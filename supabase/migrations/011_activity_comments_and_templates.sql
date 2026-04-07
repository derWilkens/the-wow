alter table activities
  add column if not exists assignee_user_id uuid references auth.users(id) on delete set null;

update activities
set assignee_user_id = owner_id
where assignee_user_id is null;

create index if not exists activities_assignee_user_id_idx
  on activities (assignee_user_id);

create table if not exists activity_comments (
  id uuid primary key default uuid_generate_v4(),
  activity_id uuid not null references activities(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists activity_comments_updated_at on activity_comments;

create trigger activity_comments_updated_at
before update on activity_comments
for each row execute function set_updated_at();

create index if not exists activity_comments_activity_id_idx
  on activity_comments (activity_id, created_at);

create table if not exists workflow_templates (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  category text,
  source_workspace_id uuid references workspaces(id) on delete set null,
  is_system boolean not null default false,
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists workflow_templates_org_name_unique
  on workflow_templates (organization_id, name);

create index if not exists workflow_templates_organization_id_idx
  on workflow_templates (organization_id, created_at);

alter table activity_comments enable row level security;
alter table workflow_templates enable row level security;

drop policy if exists "activity comments visible within organization" on activity_comments;
create policy "activity comments visible within organization"
  on activity_comments for select
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = activity_comments.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

drop policy if exists "activity comments insert within organization" on activity_comments;
create policy "activity comments insert within organization"
  on activity_comments for insert
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = activity_comments.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

drop policy if exists "activity comments update own within organization" on activity_comments;
create policy "activity comments update own within organization"
  on activity_comments for update
  using (
    author_user_id = auth.uid()
    and exists (
      select 1
      from organization_members
      where organization_members.organization_id = activity_comments.organization_id
        and organization_members.user_id = auth.uid()
    )
  )
  with check (
    author_user_id = auth.uid()
    and exists (
      select 1
      from organization_members
      where organization_members.organization_id = activity_comments.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

drop policy if exists "activity comments delete own within organization" on activity_comments;
create policy "activity comments delete own within organization"
  on activity_comments for delete
  using (
    author_user_id = auth.uid()
    and exists (
      select 1
      from organization_members
      where organization_members.organization_id = activity_comments.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

drop policy if exists "workflow templates visible within organization" on workflow_templates;
create policy "workflow templates visible within organization"
  on workflow_templates for select
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = workflow_templates.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

drop policy if exists "workflow templates insert within organization" on workflow_templates;
create policy "workflow templates insert within organization"
  on workflow_templates for insert
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = workflow_templates.organization_id
        and organization_members.user_id = auth.uid()
    )
  );
