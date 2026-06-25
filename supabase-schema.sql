-- ============================================================
-- TRAVELFY – Full Relational Schema
-- Run this in Supabase → SQL Editor
-- ============================================================

-- Drop old JSONB trips table if it exists
drop table if exists public.trips cascade;

-- ── TRIPS ──────────────────────────────────────────────────
create table public.trips (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default '',
  destination text default '',
  start_date text default '',
  end_date text default '',
  description text default '',
  cover_image text default '',
  status text default 'upcoming',
  total_budget numeric default 0,
  home_currency text default 'PHP',
  traveler_name text default '',
  profile_picture text default '',
  language text default 'en',
  tour_notes jsonb default '[]',
  restrictions jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── FLIGHTS ────────────────────────────────────────────────
create table public.flights (
  id text primary key,
  trip_id text references public.trips(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  flight_number text default '',
  airline text default '',
  from_city text default '',
  from_code text default '',
  from_airport text default '',
  from_terminal text default '',
  to_city text default '',
  to_code text default '',
  to_airport text default '',
  to_terminal text default '',
  departure_date text default '',
  departure_time text default '',
  arrival_date text default '',
  arrival_time text default '',
  arrival_date_offset text default '',
  seat text default '',
  booking_reference text default '',
  gate text default '',
  status text default 'upcoming',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ── HOTELS ─────────────────────────────────────────────────
create table public.hotels (
  id text primary key,
  trip_id text references public.trips(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text default '',
  address text default '',
  phone text default '',
  website text default '',
  check_in text default '',
  check_out text default '',
  room_type text default '',
  booking_reference text default '',
  nights int default 1,
  maps_url text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- ── ITINERARY DAYS ─────────────────────────────────────────
create table public.itinerary_days (
  id text primary key,
  trip_id text references public.trips(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  date text default '',
  day_number int default 1,
  title text default '',
  subtitle text default '',
  meals jsonb default '[]',
  hotel text default '',
  created_at timestamptz default now()
);

-- ── ITINERARY ACTIVITIES ───────────────────────────────────
create table public.itinerary_activities (
  id text primary key,
  day_id text references public.itinerary_days(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  time text default '',
  title text default '',
  description text default '',
  type text default 'other',
  location text default '',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ── CHECKLIST ITEMS ────────────────────────────────────────
create table public.checklist_items (
  id text primary key,
  trip_id text references public.trips(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null default '',
  checked boolean default false,
  category text default 'custom',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ── EXPENSES ───────────────────────────────────────────────
create table public.expenses (
  id text primary key,
  trip_id text references public.trips(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default '',
  amount numeric not null default 0,
  currency text default 'PHP',
  category text default 'other',
  date text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- ── DOCUMENTS ──────────────────────────────────────────────
create table public.documents (
  id text primary key,
  trip_id text references public.trips(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text default '',
  type text default 'other',
  file_name text default '',
  file_type text default '',
  file_size bigint default 0,
  data_url text default '',
  uploaded_at text default ''
);

-- ── EMERGENCY CONTACTS ─────────────────────────────────────
create table public.emergency_contacts (
  id text primary key,
  trip_id text references public.trips(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text default '',
  role text default '',
  phone text default '',
  type text default 'personal',
  country text default '',
  address text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- ── QUICK LINKS ────────────────────────────────────────────
create table public.quick_links (
  id text primary key,
  trip_id text references public.trips(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default '',
  url text default '',
  icon text default 'link',
  category text default 'other',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- ── NOTES ──────────────────────────────────────────────────
create table public.notes (
  id text primary key,
  trip_id text references public.trips(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text default '',
  content text default '',
  color text default '#2563EB',
  created_at text default '',
  updated_at text default ''
);

-- ── PASSPORT INFO ──────────────────────────────────────────
create table public.passport_info (
  user_id uuid references auth.users(id) on delete cascade primary key,
  full_name text default '',
  passport_number text default '',
  nationality text default '',
  date_of_birth text default '',
  issue_date text default '',
  expiry_date text default '',
  issuing_country text default '',
  updated_at timestamptz default now()
);

-- ── VISAS ──────────────────────────────────────────────────
create table public.visas (
  id text primary key,
  trip_id text references public.trips(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  country text default '',
  visa_type text default '',
  visa_number text default '',
  issue_date text default '',
  expiry_date text default '',
  status text default 'valid',
  notes text default '',
  created_at timestamptz default now()
);

-- ── CURRENCY RATES ─────────────────────────────────────────
create table public.currency_rates (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  from_currency text not null,
  to_currency text not null,
  rate numeric not null default 1,
  updated_at text default ''
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.trips enable row level security;
alter table public.flights enable row level security;
alter table public.hotels enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.itinerary_activities enable row level security;
alter table public.checklist_items enable row level security;
alter table public.expenses enable row level security;
alter table public.documents enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.quick_links enable row level security;
alter table public.notes enable row level security;
alter table public.passport_info enable row level security;
alter table public.visas enable row level security;
alter table public.currency_rates enable row level security;

-- Trips
create policy "trips_user" on public.trips for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Flights
create policy "flights_user" on public.flights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Hotels
create policy "hotels_user" on public.hotels for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Itinerary days
create policy "itin_days_user" on public.itinerary_days for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Itinerary activities
create policy "itin_acts_user" on public.itinerary_activities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Checklist
create policy "checklist_user" on public.checklist_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Expenses
create policy "expenses_user" on public.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Documents
create policy "documents_user" on public.documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Emergency contacts
create policy "emergency_user" on public.emergency_contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Quick links
create policy "links_user" on public.quick_links for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Notes
create policy "notes_user" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Passport
create policy "passport_user" on public.passport_info for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Visas
create policy "visas_user" on public.visas for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Currency rates
create policy "currency_user" on public.currency_rates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
