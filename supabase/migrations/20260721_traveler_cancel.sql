-- Allow travelers to cancel their own pending bookings
create policy if not exists "Travelers cancel own pending bookings"
  on tour_bookings for update
  to authenticated
  using (auth.uid() = traveler_id and status = 'pending')
  with check (status = 'cancelled');
