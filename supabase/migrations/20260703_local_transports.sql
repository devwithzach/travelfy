CREATE TABLE IF NOT EXISTS local_transports (
  id text PRIMARY KEY,
  trip_id text NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'other' CHECK (type IN ('grab','tricycle','jeepney','habal-habal','uv-express','pedicab','taxi','fx','other')),
  from_place text NOT NULL DEFAULT '',
  to_place text NOT NULL DEFAULT '',
  fare numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PHP',
  notes text NOT NULL DEFAULT '',
  date text NOT NULL DEFAULT ''
);

ALTER TABLE local_transports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own local_transports"
  ON local_transports FOR ALL
  USING (auth.uid() = user_id);
