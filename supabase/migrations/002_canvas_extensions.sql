alter table activities
  add column if not exists status_icon text check (status_icon in ('unclear', 'ok', 'in_progress', 'blocked'));
