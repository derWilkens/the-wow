create table if not exists canvas_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_activity_id uuid null references activities(id) on delete cascade,
  label text not null,
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  width double precision not null default 320,
  height double precision not null default 220,
  locked boolean not null default false,
  z_index integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid null
);

alter table activities
  add column if not exists group_id uuid null references canvas_groups(id) on delete set null;

alter table canvas_objects
  add column if not exists group_id uuid null references canvas_groups(id) on delete set null;

create index if not exists idx_canvas_groups_workspace_parent
  on canvas_groups(workspace_id, parent_activity_id);

create index if not exists idx_activities_workspace_group_id
  on activities(workspace_id, group_id);

create index if not exists idx_canvas_objects_workspace_group_id
  on canvas_objects(workspace_id, group_id);

comment on table canvas_groups is 'Persistent visual grouping containers for workflow nodes.';
comment on column activities.group_id is 'Optional visual group membership for the activity on the canvas.';
comment on column canvas_objects.group_id is 'Optional visual group membership for the canvas object on the canvas.';
