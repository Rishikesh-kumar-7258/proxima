-- My Network — full database schema.
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query → paste → Run).
-- Source of truth: network-app-spec.md §9.

-- Enable PostGIS for GPS distance queries
create extension if not exists postgis;

-- Contacts
create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  role text,
  company text,
  city text,
  tags text[],
  notes text,
  how_met text,
  food_prefs text,
  warmth text default 'warm',
  last_interaction timestamptz,
  location geography(point, 4326),
  created_at timestamptz default now()
);

alter table contacts enable row level security;
create policy "own contacts" on contacts
  for all using (auth.uid() = user_id);

create index on contacts using gist(location);

-- Journal entries
create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  content text not null,
  date date default current_date,
  created_at timestamptz default now()
);

alter table journal_entries enable row level security;
create policy "own journals" on journal_entries
  for all using (auth.uid() = user_id);

-- Junction: journal <-> contacts
create table journal_contact_links (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid references journal_entries(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  extracted_note text,
  warmth text,
  location_mentioned text,
  created_at timestamptz default now()
);

alter table journal_contact_links enable row level security;
create policy "own links" on journal_contact_links
  for all using (
    journal_id in (
      select id from journal_entries where user_id = auth.uid()
    )
  );

create index on journal_contact_links(contact_id, created_at desc);

-- Location history view
create view contact_location_history as
  select
    jcl.contact_id,
    jcl.location_mentioned as city,
    je.date
  from journal_contact_links jcl
  join journal_entries je on je.id = jcl.journal_id
  where jcl.location_mentioned is not null
  order by je.date desc;

-- Per-person timeline view
create view contact_timeline as
  select
    jcl.contact_id,
    je.date,
    jcl.extracted_note,
    jcl.warmth,
    jcl.location_mentioned,
    jcl.created_at
  from journal_contact_links jcl
  join journal_entries je on je.id = jcl.journal_id
  order by je.date desc;

-- Nearby contacts function
create or replace function contacts_within_radius(
  user_lat float, user_lng float, radius_km float
)
returns table(
  id uuid, name text, role text, city text,
  tags text[], lat float, lng float, dist_km float
) as $$
  select id, name, role, city, tags,
    st_y(location::geometry) as lat,
    st_x(location::geometry) as lng,
    st_distance(location, st_point(user_lng, user_lat)::geography) / 1000 as dist_km
  from contacts
  where auth.uid() = user_id
    and st_distance(location, st_point(user_lng, user_lat)::geography) / 1000 <= radius_km
  order by dist_km;
$$ language sql security definer;
