-- Add share token to trips
alter table trips
  add column if not exists share_token text unique;

-- Generate a share token for a trip (called on demand, not on creation)
-- The app will generate a UUID client-side and store it here.

-- Allow unauthenticated reads of shared trips
create policy if not exists "Public read shared trip"
  on trips for select
  to anon
  using (share_token is not null);

-- Allow unauthenticated reads of itinerary days for shared trips
create policy if not exists "Public read shared itinerary days"
  on itinerary_days for select
  to anon
  using (
    trip_id in (select id from trips where share_token is not null)
  );

create policy if not exists "Public read shared itinerary activities"
  on itinerary_activities for select
  to anon
  using (
    day_id in (
      select id from itinerary_days where trip_id in (
        select id from trips where share_token is not null
      )
    )
  );

-- Also allow reading hotels and flights for shared trips
create policy if not exists "Public read shared hotels"
  on hotels for select
  to anon
  using (trip_id in (select id from trips where share_token is not null));

create policy if not exists "Public read shared flights"
  on flights for select
  to anon
  using (trip_id in (select id from trips where share_token is not null));
