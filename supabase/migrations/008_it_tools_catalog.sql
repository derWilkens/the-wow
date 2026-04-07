create table if not exists it_tools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists it_tools_name_lower_unique
  on it_tools (lower(name));

create table if not exists activity_it_tools (
  activity_id uuid not null references activities(id) on delete cascade,
  tool_id uuid not null references it_tools(id) on delete cascade,
  primary key (activity_id, tool_id)
);

insert into it_tools (id, name, description, created_by, created_at)
select
  uuid_generate_v4(),
  seeded.tool_name,
  null,
  null,
  now()
from (
  select distinct trim(tool_name) as tool_name
  from activity_tools
  where trim(tool_name) <> ''
) seeded
where not exists (
  select 1
  from it_tools
  where lower(it_tools.name) = lower(seeded.tool_name)
);

insert into activity_it_tools (activity_id, tool_id)
select
  activity_tools.activity_id,
  it_tools.id
from activity_tools
join it_tools
  on lower(it_tools.name) = lower(trim(activity_tools.tool_name))
on conflict do nothing;

alter table it_tools enable row level security;
alter table activity_it_tools enable row level security;

create policy "it tools readable by authenticated users"
  on it_tools for select
  using (auth.uid() is not null);

create policy "it tools insert by authenticated users"
  on it_tools for insert
  with check (auth.uid() is not null);

create policy "activity it tools via activity owner"
  on activity_it_tools for all
  using (
    exists (
      select 1 from activities
      where activities.id = activity_it_tools.activity_id
        and activities.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from activities
      where activities.id = activity_it_tools.activity_id
        and activities.owner_id = auth.uid()
    )
  );

drop policy if exists "activity tools via activity owner" on activity_tools;
drop table if exists activity_tools;
