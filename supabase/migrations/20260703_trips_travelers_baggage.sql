-- Add group travelers list and baggage limit to trips
alter table trips
  add column if not exists baggage_limit_kg numeric not null default 0,
  add column if not exists travelers text[] not null default '{}';
