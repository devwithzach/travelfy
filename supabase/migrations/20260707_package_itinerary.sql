-- Add itinerary JSON to tour packages
alter table tour_packages
  add column if not exists itinerary jsonb not null default '[]';
