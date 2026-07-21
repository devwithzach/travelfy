alter table user_profiles
  add column if not exists bio text not null default '',
  add column if not exists logo_url text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists website text not null default '';

-- Allow anyone to read operator profiles (for public profile page)
create policy if not exists "Public read user profiles"
  on user_profiles for select
  to anon
  using (true);

create policy if not exists "Auth read user profiles"
  on user_profiles for select
  to authenticated
  using (true);
