create table if not exists user_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  preference_key text not null,
  preference_value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, preference_key)
);

create index if not exists user_preferences_user_id_idx
  on user_preferences (user_id);

alter table user_preferences enable row level security;

drop policy if exists "user preferences readable by owner" on user_preferences;
create policy "user preferences readable by owner"
  on user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "user preferences insertable by owner" on user_preferences;
create policy "user preferences insertable by owner"
  on user_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "user preferences updatable by owner" on user_preferences;
create policy "user preferences updatable by owner"
  on user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
