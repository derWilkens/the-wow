alter table activities
  add column if not exists is_locked boolean not null default false;

alter table canvas_objects
  add column if not exists is_locked boolean not null default false;

create index if not exists idx_activities_workspace_id_is_locked
  on activities(workspace_id, is_locked);

create index if not exists idx_canvas_objects_workspace_id_is_locked
  on canvas_objects(workspace_id, is_locked);

comment on column activities.is_locked is 'Prevents manual drag repositioning on the canvas when true.';
comment on column canvas_objects.is_locked is 'Prevents manual drag repositioning on the canvas when true.';
