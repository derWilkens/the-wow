create table if not exists transport_modes (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  key text not null,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create unique index if not exists transport_modes_org_key_unique
  on transport_modes (organization_id, key);

create unique index if not exists transport_modes_org_label_lower_unique
  on transport_modes (organization_id, lower(label));

create index if not exists transport_modes_org_sort_idx
  on transport_modes (organization_id, sort_order, created_at);

insert into transport_modes (organization_id, key, label, description, sort_order, is_active, is_default)
select
  organizations.id,
  defaults.key,
  defaults.label,
  defaults.description,
  defaults.sort_order,
  true,
  defaults.is_default
from organizations
cross join (
  values
    ('direkt', 'Direkt', 'Direkte Übergabe ohne Zwischenspeicherung.', 0, true),
    ('mail', 'Mail', 'Übergabe oder Benachrichtigung per E-Mail.', 1, false),
    ('im_datenspeicher_bereitgestellt', 'Im Datenspeicher bereitgestellt', 'Ergebnis wird in einem Datenspeicher bereitgestellt.', 2, false),
    ('zyklisch_abgeholt', 'Zyklisch abgeholt', 'Nachgelagerte Aktivität holt die Daten periodisch ab.', 3, false)
) as defaults(key, label, description, sort_order, is_default)
where not exists (
  select 1
  from transport_modes
  where transport_modes.organization_id = organizations.id
    and transport_modes.key = defaults.key
);

alter table canvas_edges
  add column if not exists transport_mode_id uuid references transport_modes(id) on delete set null;

update canvas_edges as edges
set transport_mode_id = transport_modes.id
from workspaces, transport_modes
where edges.workspace_id = workspaces.id
  and transport_modes.organization_id = workspaces.organization_id
  and transport_modes.key = edges.transport_mode
  and edges.transport_mode is not null
  and edges.transport_mode_id is null;

drop index if exists canvas_edges_transport_mode_check;

alter table canvas_edges
  drop constraint if exists canvas_edges_transport_mode_check;

alter table canvas_edges
  drop column if exists transport_mode;

create index if not exists canvas_edges_transport_mode_id_idx
  on canvas_edges (transport_mode_id);

alter table transport_modes enable row level security;

drop policy if exists "transport modes visible within organization" on transport_modes;
create policy "transport modes visible within organization"
  on transport_modes for select
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = transport_modes.organization_id
        and organization_members.user_id = auth.uid()
    )
  );

drop policy if exists "transport modes write by organization admins" on transport_modes;
create policy "transport modes write by organization admins"
  on transport_modes for all
  using (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = transport_modes.organization_id
        and organization_members.user_id = auth.uid()
        and organization_members.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from organization_members
      where organization_members.organization_id = transport_modes.organization_id
        and organization_members.user_id = auth.uid()
        and organization_members.role in ('owner', 'admin')
    )
  );
