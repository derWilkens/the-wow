alter table public.canvas_objects
  add column if not exists z_index integer not null default 0;

update public.canvas_objects
set z_index = 0
where z_index is null;

create index if not exists canvas_objects_workspace_parent_z_index_idx
  on public.canvas_objects (workspace_id, parent_activity_id, z_index);
