create table if not exists organization_roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  label text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (organization_id, label)
);

create index if not exists organization_roles_organization_sort_idx
  on organization_roles (organization_id, sort_order, created_at);

alter table activities
  add column if not exists assignee_label text,
  add column if not exists role_id uuid references organization_roles(id) on delete set null;

create index if not exists activities_role_id_idx on activities (role_id);
