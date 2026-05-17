-- FanDirect production creator/social-commerce upgrade.
-- Safe to run more than once.

alter table public.creators
add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
add column if not exists owner_email text,
add column if not exists username text,
add column if not exists display_name text,
add column if not exists full_name text,
add column if not exists phone text,
add column if not exists business_type text,
add column if not exists country text default 'NG',
add column if not exists verification_status text default 'not_started',
add column if not exists onboarding_status text default 'profile_started',
add column if not exists payout_status text default 'not_started';

create unique index if not exists creators_username_unique
on public.creators (lower(username))
where username is not null;

alter table public.products
add column if not exists creator_base_price numeric default 0,
add column if not exists platform_fee_rate numeric default 0.05,
add column if not exists platform_fee_amount numeric default 0,
add column if not exists fan_price numeric default 0;

alter table public.orders
add column if not exists subtotal_amount numeric default 0,
add column if not exists platform_fee_total numeric default 0,
add column if not exists creator_payout_total numeric default 0;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
    or exists (
      select 1
      from jsonb_array_elements_text(
        coalesce(auth.jwt() -> 'user_metadata' -> 'roles', '[]'::jsonb)
      ) as role_name
      where role_name in ('admin', 'super_admin')
    )
    or exists (
      select 1
      from jsonb_array_elements_text(
        coalesce(auth.jwt() -> 'app_metadata' -> 'roles', '[]'::jsonb)
      ) as role_name
      where role_name in ('admin', 'super_admin')
    );
$$;

drop policy if exists "Creators can create own profile" on public.creators;
create policy "Creators can create own profile"
on public.creators
for insert
to authenticated
with check (auth.uid() = owner_user_id or public.is_admin());

drop policy if exists "Creators can update own profile" on public.creators;
create policy "Creators can update own profile"
on public.creators
for update
to authenticated
using (auth.uid() = owner_user_id or public.is_admin())
with check (auth.uid() = owner_user_id or public.is_admin());

drop policy if exists "Creators can read own profile" on public.creators;
create policy "Creators can read own profile"
on public.creators
for select
to authenticated
using (
  auth.uid() = owner_user_id
  or status in ('active', 'verified', 'pending_review')
  or public.is_admin()
);

notify pgrst, 'reload schema';
