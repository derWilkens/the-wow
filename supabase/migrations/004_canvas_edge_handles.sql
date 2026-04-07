alter table canvas_edges
  add column if not exists from_handle_id text,
  add column if not exists to_handle_id text;
