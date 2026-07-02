-- Add trip_type to distinguish domestic PH trips from international ones.
-- Existing trips default to 'international' so nothing breaks.
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS trip_type text NOT NULL DEFAULT 'international'
  CHECK (trip_type IN ('international', 'domestic'));
