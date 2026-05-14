-- FanDirect investor-facing portal setup.
-- Keeps /admin/investors for admins and /investors for linked investors.

create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '')
$$;

create or replace function public.is_linked_investor()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.investors
    where lower(user_email) = lower(public.current_user_email())
      and coalesce(status, 'active') = 'active'
  )
$$;

create table if not exists public.investment_requests (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid references public.investors(id) on delete set null,
  user_email text not null,
  full_name text,
  current_amount_invested numeric default 0,
  current_equity_percent numeric default 0,
  requested_amount numeric not null default 0,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.investment_requests enable row level security;

drop policy if exists "Investors can read own investor profile" on public.investors;
create policy "Investors can read own investor profile"
on public.investors
for select
to authenticated
using (lower(user_email) = lower(public.current_user_email()));

drop policy if exists "Linked investors can read paid orders" on public.orders;
create policy "Linked investors can read paid orders"
on public.orders
for select
to authenticated
using (public.is_admin() or public.is_linked_investor());

drop policy if exists "Linked investors can read revenue entries" on public.revenue_entries;
create policy "Linked investors can read revenue entries"
on public.revenue_entries
for select
to authenticated
using (public.is_admin() or public.is_linked_investor());

drop policy if exists "Investors can create own stake requests" on public.investment_requests;
create policy "Investors can create own stake requests"
on public.investment_requests
for insert
to authenticated
with check (
  lower(user_email) = lower(public.current_user_email())
  and public.is_linked_investor()
);

drop policy if exists "Investors can read own stake requests" on public.investment_requests;
create policy "Investors can read own stake requests"
on public.investment_requests
for select
to authenticated
using (
  public.is_admin()
  or lower(user_email) = lower(public.current_user_email())
);

drop policy if exists "Admins can manage stake requests" on public.investment_requests;
create policy "Admins can manage stake requests"
on public.investment_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
