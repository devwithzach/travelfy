-- Add gender, place_of_birth, mrz to passport_info
-- These are global per-user fields (not per-trip).

alter table passport_info
  add column if not exists gender text not null default '',
  add column if not exists place_of_birth text not null default '',
  add column if not exists mrz text not null default '';
