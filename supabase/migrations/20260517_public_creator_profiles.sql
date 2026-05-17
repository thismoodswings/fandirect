-- Make public creator profiles resolve correctly for anon users and old seeded creator records.
-- Safe to run more than once.

alter table public.creators
add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
add column if not exists owner_email text,
add column if not exists username text,
add column if not exists display_name text,
add column if not exists full_name text,
add column if not exists business_type text,
add column if not exists country text default 'NG',
add column if not exists verification_status text default 'not_started',
add column if not exists onboarding_status text default 'profile_started',
add column if not exists payout_status text default 'not_started';

alter table public.creators
drop constraint if exists creators_category_check;

alter table public.creators
add constraint creators_category_check
check (
  category is null
  or lower(category) = any (
    array[
      'entertainment',
      'music',
      'comedy',
      'fashion',
      'beauty',
      'tech',
      'technology',
      'gaming',
      'sports',
      'fitness',
      'food',
      'lifestyle',
      'education',
      'film',
      'podcast',
      'art',
      'dance',
      'photography',
      'creator',
      'influencer',
      'artist',
      'actor',
      'musician',
      'comedian',
      'athlete',
      'other'
    ]
  )
) not valid;

create unique index if not exists creators_username_unique
on public.creators (lower(username))
where username is not null;

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

alter table public.creators enable row level security;

drop policy if exists "Public can read live creators" on public.creators;
create policy "Public can read live creators"
on public.creators
for select
to anon, authenticated
using (status in ('active', 'verified') or verified = true);

drop policy if exists "Creators can read own profile" on public.creators;
create policy "Creators can read own profile"
on public.creators
for select
to authenticated
using (
  auth.uid() = owner_user_id
  or lower(owner_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or public.is_admin()
);

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

-- Public storefront products should be readable even when no fan is logged in.
alter table public.products enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products
for select
to anon, authenticated
using (status = 'active');

-- Some projects may not have media_drops yet. Create public-read policy only when it exists.
do $$
begin
  if to_regclass('public.media_drops') is not null then
    execute 'alter table public.media_drops enable row level security';
    execute 'drop policy if exists "Public can read published media drops" on public.media_drops';
    execute 'create policy "Public can read published media drops" on public.media_drops for select to anon, authenticated using (status = ''published'')';
  end if;
end $$;

notify pgrst, 'reload schema';
