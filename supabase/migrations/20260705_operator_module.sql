-- ============================================================
-- Operator Module: user profiles, tour packages, bookings
-- ============================================================

-- User profiles (role management)
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'traveler',  -- 'traveler' | 'operator' | 'admin'
  full_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

-- Users can read and update their own profile
create policy "Users manage own profile"
  on user_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Admins can read all profiles (needed for admin dashboard)
create policy "Admins read all profiles"
  on user_profiles for select
  using (
    exists (
      select 1 from user_profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admins can update all profiles (role changes)
create policy "Admins update all profiles"
  on user_profiles for update
  using (
    exists (
      select 1 from user_profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Auto-create profile on signup via trigger
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'traveler'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- Tour Packages
-- ============================================================
create table if not exists tour_packages (
  id text primary key,
  operator_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  destination text not null default '',
  description text not null default '',
  duration_days integer not null default 1,
  price numeric not null default 0,
  currency text not null default 'PHP',
  max_slots integer not null default 10,
  cover_image text not null default '',
  status text not null default 'draft',  -- 'draft' | 'published' | 'closed'
  created_at timestamptz not null default now()
);

alter table tour_packages enable row level security;

-- Operators manage their own packages
create policy "Operators manage own packages"
  on tour_packages for all
  using (auth.uid() = operator_id)
  with check (auth.uid() = operator_id);

-- Admins can manage all packages
create policy "Admins manage all packages"
  on tour_packages for all
  using (
    exists (select 1 from user_profiles where id = auth.uid() and role = 'admin')
  );

-- Anyone authenticated can browse published packages
create policy "Anyone can browse published packages"
  on tour_packages for select
  using (status = 'published' or auth.uid() = operator_id);

create index if not exists tour_packages_operator_idx on tour_packages(operator_id);
create index if not exists tour_packages_status_idx on tour_packages(status);

-- ============================================================
-- Tour Bookings
-- ============================================================
create table if not exists tour_bookings (
  id text primary key,
  package_id text not null references tour_packages(id) on delete cascade,
  traveler_id uuid not null references auth.users(id) on delete cascade,
  operator_id uuid not null references auth.users(id) on delete cascade,
  traveler_name text not null default '',
  traveler_email text not null default '',
  status text not null default 'pending',  -- 'pending' | 'confirmed' | 'cancelled'
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table tour_bookings enable row level security;

-- Travelers see their own bookings
create policy "Travelers see own bookings"
  on tour_bookings for select
  using (auth.uid() = traveler_id);

-- Travelers can create bookings
create policy "Travelers can book"
  on tour_bookings for insert
  with check (auth.uid() = traveler_id);

-- Operators see bookings for their packages
create policy "Operators see their bookings"
  on tour_bookings for select
  using (auth.uid() = operator_id);

-- Operators can update booking status
create policy "Operators update booking status"
  on tour_bookings for update
  using (auth.uid() = operator_id);

-- Admins see all bookings
create policy "Admins see all bookings"
  on tour_bookings for all
  using (
    exists (select 1 from user_profiles where id = auth.uid() and role = 'admin')
  );

create index if not exists tour_bookings_traveler_idx on tour_bookings(traveler_id);
create index if not exists tour_bookings_operator_idx on tour_bookings(operator_id);
create index if not exists tour_bookings_package_idx on tour_bookings(package_id);
