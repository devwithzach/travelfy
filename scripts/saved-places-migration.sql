CREATE TABLE IF NOT EXISTS saved_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trip_id TEXT NOT NULL,
  osm_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT '',
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  tags JSONB DEFAULT '{}',
  rating INT DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  notes TEXT DEFAULT '',
  saved_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own saved places"
  ON saved_places FOR ALL USING (auth.uid() = user_id);
GRANT ALL ON saved_places TO authenticated;
