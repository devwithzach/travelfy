create table if not exists package_reviews (
  id uuid primary key default gen_random_uuid(),
  package_id text not null,
  booking_id text not null unique,
  traveler_id uuid references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);
alter table package_reviews enable row level security;
create policy "traveler_write_own_review" on package_reviews
  for all to authenticated
  using (traveler_id = auth.uid())
  with check (traveler_id = auth.uid());
create policy "read_all_reviews" on package_reviews
  for select to authenticated using (true);
create policy "read_anon_reviews" on package_reviews
  for select to anon using (true);
