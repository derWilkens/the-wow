create type activity_type_enum as enum (
  'erstellen',
  'transformieren_aktualisieren',
  'pruefen_freigeben',
  'weiterleiten_ablegen'
);

alter table activities
  add column if not exists activity_type activity_type_enum,
  add column if not exists description text,
  add column if not exists notes text,
  add column if not exists duration_minutes integer;

create table if not exists canvas_objects (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_activity_id uuid references activities(id) on delete cascade,
  object_type text not null check (object_type in ('quelle', 'datenobjekt')),
  name text not null default '',
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists object_fields (
  id uuid primary key default uuid_generate_v4(),
  object_id uuid not null references canvas_objects(id) on delete cascade,
  name text not null,
  field_type text not null check (field_type in ('text', 'integer', 'decimal', 'date', 'boolean')),
  required boolean not null default false,
  sort_order integer not null default 0
);

create table if not exists canvas_edges (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  parent_activity_id uuid references activities(id) on delete cascade,
  from_node_type text not null check (from_node_type in ('activity', 'canvas_object')),
  from_node_id uuid not null,
  to_node_type text not null check (to_node_type in ('activity', 'canvas_object')),
  to_node_id uuid not null,
  label text
);

create table if not exists activity_check_sources (
  id uuid primary key default uuid_generate_v4(),
  activity_id uuid not null references activities(id) on delete cascade,
  canvas_object_id uuid not null references canvas_objects(id) on delete cascade,
  notes text
);

create table if not exists activity_tools (
  activity_id uuid not null references activities(id) on delete cascade,
  tool_name text not null,
  primary key (activity_id, tool_name)
);

alter table canvas_objects enable row level security;
alter table object_fields enable row level security;
alter table canvas_edges enable row level security;
alter table activity_check_sources enable row level security;
alter table activity_tools enable row level security;

create policy "canvas_objects workspace owner access"
  on canvas_objects for all
  using (
    exists (
      select 1 from workspaces
      where workspaces.id = canvas_objects.workspace_id
        and workspaces.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workspaces
      where workspaces.id = canvas_objects.workspace_id
        and workspaces.created_by = auth.uid()
    )
  );

create policy "object_fields via canvas_objects"
  on object_fields for all
  using (
    exists (
      select 1 from canvas_objects
      join workspaces on workspaces.id = canvas_objects.workspace_id
      where canvas_objects.id = object_fields.object_id
        and workspaces.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from canvas_objects
      join workspaces on workspaces.id = canvas_objects.workspace_id
      where canvas_objects.id = object_fields.object_id
        and workspaces.created_by = auth.uid()
    )
  );

create policy "canvas_edges workspace owner access"
  on canvas_edges for all
  using (
    exists (
      select 1 from workspaces
      where workspaces.id = canvas_edges.workspace_id
        and workspaces.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workspaces
      where workspaces.id = canvas_edges.workspace_id
        and workspaces.created_by = auth.uid()
    )
  );

create policy "check sources via activity owner"
  on activity_check_sources for all
  using (
    exists (
      select 1 from activities
      where activities.id = activity_check_sources.activity_id
        and activities.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from activities
      where activities.id = activity_check_sources.activity_id
        and activities.owner_id = auth.uid()
    )
  );

create policy "activity tools via activity owner"
  on activity_tools for all
  using (
    exists (
      select 1 from activities
      where activities.id = activity_tools.activity_id
        and activities.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from activities
      where activities.id = activity_tools.activity_id
        and activities.owner_id = auth.uid()
    )
  );

create trigger canvas_objects_updated_at
before update on canvas_objects
for each row execute function set_updated_at();
