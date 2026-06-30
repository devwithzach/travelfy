-- Add passport_type and issuing_authority to passport_info
alter table passport_info
  add column if not exists issuing_authority text not null default '',
  add column if not exists passport_type text not null default '';
