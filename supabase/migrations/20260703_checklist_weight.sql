-- Add weight tracking to checklist items
alter table checklist_items
  add column if not exists weight_grams integer not null default 0;
