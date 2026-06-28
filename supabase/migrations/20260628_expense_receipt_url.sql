-- Adds an optional receipt photo URL per expense (points to a file in the
-- existing trip-photos storage bucket under receipts/).
-- Run in the Supabase SQL editor.

alter table public.expenses
  add column if not exists receipt_url text not null default '';
