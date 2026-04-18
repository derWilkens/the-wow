alter table canvas_groups
  add column if not exists collapsed boolean not null default false;

comment on column canvas_groups.collapsed is 'Whether the group only shows its header and hides contained canvas items.';
