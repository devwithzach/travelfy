-- Admin read/delete access to all tables
-- Uses a helper function to avoid recursive RLS lookups

create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from user_profiles where id = auth.uid() and role = 'admin'
  )
$$;

-- trips
create policy "Admins manage all trips"
  on trips for all using (is_admin());

-- flights
create policy "Admins manage all flights"
  on flights for all using (is_admin());

-- ferries
create policy "Admins manage all ferries"
  on ferries for all using (is_admin());

-- buses
create policy "Admins manage all buses"
  on buses for all using (is_admin());

-- local_transports
create policy "Admins manage all local_transports"
  on local_transports for all using (is_admin());

-- hotels
create policy "Admins manage all hotels"
  on hotels for all using (is_admin());

-- itinerary_days
create policy "Admins manage all itinerary_days"
  on itinerary_days for all using (is_admin());

-- itinerary_activities
create policy "Admins manage all itinerary_activities"
  on itinerary_activities for all using (is_admin());

-- checklist_items
create policy "Admins manage all checklist_items"
  on checklist_items for all using (is_admin());

-- expenses
create policy "Admins manage all expenses"
  on expenses for all using (is_admin());

-- documents
create policy "Admins manage all documents"
  on documents for all using (is_admin());

-- emergency_contacts
create policy "Admins manage all emergency_contacts"
  on emergency_contacts for all using (is_admin());

-- quick_links
create policy "Admins manage all quick_links"
  on quick_links for all using (is_admin());

-- notes
create policy "Admins manage all notes"
  on notes for all using (is_admin());

-- visas
create policy "Admins manage all visas"
  on visas for all using (is_admin());

-- journal_entries
create policy "Admins manage all journal_entries"
  on journal_entries for all using (is_admin());

-- passport_info
create policy "Admins manage all passport_info"
  on passport_info for all using (is_admin());

-- tour_packages already has admin policy from previous migration
-- tour_bookings already has admin policy from previous migration
