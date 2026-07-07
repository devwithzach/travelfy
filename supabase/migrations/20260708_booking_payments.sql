alter table tour_bookings
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists paymongo_session_id text not null default '';
