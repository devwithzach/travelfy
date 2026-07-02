CREATE TABLE IF NOT EXISTS ferries (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operator text NOT NULL DEFAULT '',
  vessel_name text NOT NULL DEFAULT '',
  from_port text NOT NULL DEFAULT '',
  from_terminal text NOT NULL DEFAULT '',
  to_port text NOT NULL DEFAULT '',
  to_terminal text NOT NULL DEFAULT '',
  departure_date text NOT NULL DEFAULT '',
  departure_time text NOT NULL DEFAULT '',
  arrival_date text NOT NULL DEFAULT '',
  arrival_time text NOT NULL DEFAULT '',
  accommodation text NOT NULL DEFAULT '',
  booking_reference text NOT NULL DEFAULT '',
  ticket_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','boarding','in-transit','arrived')),
  notes text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE ferries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ferries"
  ON ferries FOR ALL
  USING (auth.uid() = user_id);
