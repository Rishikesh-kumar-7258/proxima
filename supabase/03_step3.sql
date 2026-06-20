-- Step 3 — Map View: store plain lat/lng for the client map, and keep the PostGIS
-- `location` column in sync so contacts_within_radius() still works server-side.
-- Run after 02_step2.sql. Idempotent.

alter table contacts
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Whenever lat/lng change, rebuild the geography point (lng, lat order for PostGIS).
create or replace function sync_contact_location() returns trigger as $$
begin
  if new.lat is not null and new.lng is not null then
    new.location := st_point(new.lng, new.lat)::geography;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sync_location on contacts;
create trigger trg_sync_location
  before insert or update on contacts
  for each row execute function sync_contact_location();
