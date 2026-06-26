-- Adds a per-activity `done` flag so manual completion state syncs across devices.
-- Run this in the Supabase SQL editor.

alter table public.itinerary_activities
  add column if not exists done boolean not null default false;

-- Optional index if you ever filter on completion (cheap, low priority):
-- create index if not exists itinerary_activities_done_idx
--   on public.itinerary_activities (day_id, done);
