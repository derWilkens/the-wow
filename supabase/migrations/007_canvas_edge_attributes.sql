alter table canvas_edges
  add column if not exists transport_mode text,
  add column if not exists notes text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'canvas_edges_transport_mode_check'
      and conrelid = 'canvas_edges'::regclass
  ) then
    alter table canvas_edges drop constraint canvas_edges_transport_mode_check;
  end if;
end $$;

alter table canvas_edges
  add constraint canvas_edges_transport_mode_check
  check (
    transport_mode is null
    or transport_mode in ('direkt', 'mail', 'im_datenspeicher_bereitgestellt', 'zyklisch_abgeholt')
  );
