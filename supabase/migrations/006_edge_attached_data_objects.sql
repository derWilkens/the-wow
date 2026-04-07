alter table canvas_objects
  add column if not exists edge_id uuid references canvas_edges(id) on delete cascade,
  add column if not exists edge_sort_order integer;

alter table canvas_objects
  alter column position_x drop not null,
  alter column position_y drop not null,
  alter column edge_sort_order set default 0;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'canvas_objects_object_type_check'
      and conrelid = 'canvas_objects'::regclass
  ) then
    alter table canvas_objects drop constraint canvas_objects_object_type_check;
  end if;
end $$;

alter table canvas_objects
  add constraint canvas_objects_shape_check
  check (
    (
      object_type = 'quelle'
      and edge_id is null
      and edge_sort_order is null
      and position_x is not null
      and position_y is not null
    )
    or
    (
      object_type = 'datenobjekt'
      and edge_id is not null
      and edge_sort_order is not null
      and position_x is null
      and position_y is null
    )
  );

create index if not exists canvas_objects_edge_id_sort_order_idx
  on canvas_objects(edge_id, edge_sort_order);
