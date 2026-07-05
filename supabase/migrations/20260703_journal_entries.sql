-- Travel journal entries
create table if not exists journal_entries (
  id text primary key,
  trip_id text not null references trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null default '',
  title text not null default '',
  body text not null default '',
  mood text not null default 'good',
  weather text not null default '',
  created_at text not null default '',
  updated_at text not null default '',
  inserted_at timestamptz not null default now()
);

alter table journal_entries enable row level security;

create policy "Users own their journal entries"
  on journal_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists journal_entries_trip_id_idx on journal_entries(trip_id);
