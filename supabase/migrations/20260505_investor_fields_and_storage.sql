-- FanDirect investor fields and direct-upload storage setup.
-- Run in Supabase SQL Editor after the admin CRUD policy migration.

alter table if exists public.investors
  add column if not exists amount_invested numeric default 0,
  add column if not exists investment_stage text default 'mvp';

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('covers', 'covers', true),
  ('product-images', 'product-images', true),
  ('media-thumbnails', 'media-thumbnails', true),
  ('media-drops', 'media-drops', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Public can read FanDirect public media" on storage.objects;
create policy "Public can read FanDirect public media"
on storage.objects
for select
to public
using (
  bucket_id in ('avatars', 'covers', 'product-images', 'media-thumbnails')
);

drop policy if exists "Admins can upload FanDirect media" on storage.objects;
create policy "Admins can upload FanDirect media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('avatars', 'covers', 'product-images', 'media-thumbnails', 'media-drops')
  and public.is_admin()
);

drop policy if exists "Admins can update FanDirect media" on storage.objects;
create policy "Admins can update FanDirect media"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('avatars', 'covers', 'product-images', 'media-thumbnails', 'media-drops')
  and public.is_admin()
)
with check (
  bucket_id in ('avatars', 'covers', 'product-images', 'media-thumbnails', 'media-drops')
  and public.is_admin()
);

drop policy if exists "Admins can delete FanDirect media" on storage.objects;
create policy "Admins can delete FanDirect media"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('avatars', 'covers', 'product-images', 'media-thumbnails', 'media-drops')
  and public.is_admin()
);
