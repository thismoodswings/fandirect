-- FanDirect admin CRUD policies.
-- Run this in the Supabase SQL Editor for the project used by .env.
--
-- The app reads the user's role from Supabase Auth user_metadata.role.
-- Admin users must have:
--   raw_user_meta_data ->> 'role' = 'admin'
--
-- In Supabase Dashboard:
-- Authentication -> Users -> select user -> Raw user meta data
-- Example:
--   { "role": "admin", "display_name": "Admin" }

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
      or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
$$;

alter table if exists public.creators enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.investors enable row level security;
alter table if exists public.revenue_entries enable row level security;

drop policy if exists "Admins can manage creators" on public.creators;
create policy "Admins can manage creators"
on public.creators
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage orders" on public.orders;
create policy "Admins can manage orders"
on public.orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage investors" on public.investors;
create policy "Admins can manage investors"
on public.investors
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage revenue entries" on public.revenue_entries;
create policy "Admins can manage revenue entries"
on public.revenue_entries
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
