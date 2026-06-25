-- Step 4 — Multiple addresses per contact (JSONB approach).
-- Each element: { label: text, city: text, lat: float, lng: float }
-- Run after 03_step3.sql.

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS addresses jsonb DEFAULT '[]'::jsonb;

-- Migrate existing city/lat/lng into the addresses array.
UPDATE contacts
SET addresses = jsonb_build_array(
  jsonb_build_object('label', 'Home', 'city', city, 'lat', lat, 'lng', lng)
)
WHERE city IS NOT NULL AND city != '';

-- Drop the old function first — return type changed (added address_label column).
DROP FUNCTION IF EXISTS contacts_within_radius(float, float, float);

CREATE OR REPLACE FUNCTION contacts_within_radius(
  user_lat float, user_lng float, radius_km float
)
RETURNS TABLE(
  id uuid, name text, role text, city text,
  tags text[], lat float, lng float, dist_km float,
  address_label text
) AS $$
  SELECT c.id, c.name, c.role, addr->>'city' AS city,
    c.tags,
    (addr->>'lat')::float AS lat,
    (addr->>'lng')::float AS lng,
    ST_Distance(
      ST_Point((addr->>'lng')::float, (addr->>'lat')::float)::geography,
      ST_Point(user_lng, user_lat)::geography
    ) / 1000 AS dist_km,
    addr->>'label' AS address_label
  FROM contacts c,
    jsonb_array_elements(c.addresses) AS addr
  WHERE auth.uid() = c.user_id
    AND (addr->>'lat') IS NOT NULL
    AND ST_Distance(
      ST_Point((addr->>'lng')::float, (addr->>'lat')::float)::geography,
      ST_Point(user_lng, user_lat)::geography
    ) / 1000 <= radius_km
  ORDER BY dist_km;
$$ LANGUAGE SQL SECURITY DEFINER;
