-- Step 2 — Contacts CRUD: extra profile columns + avatar storage.
-- Run after schema.sql in the Supabase SQL editor. Idempotent — safe to re-run.

-- Profile fields from spec §6.2 that the base schema didn't include.
alter table contacts
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists industry text,
  add column if not exists photo_url text;

-- Public bucket for contact photos.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Photos are world-readable (public bucket); a user may only write under their own /<uid>/ folder.
drop policy if exists "avatars are public" on storage.objects;
create policy "avatars are public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "users upload own avatars" on storage.objects;
create policy "users upload own avatars" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update own avatars" on storage.objects;
create policy "users update own avatars" on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
