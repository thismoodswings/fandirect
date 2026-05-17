-- FanDirect interactive commerce, wishlists, private drops, richer orders, and lucky-wheel audit support.

create extension if not exists pgcrypto;

alter table public.products
  add column if not exists creator_base_price numeric default 0,
  add column if not exists platform_fee_rate numeric default 0.05,
  add column if not exists platform_fee_amount numeric default 0,
  add column if not exists fan_price numeric default 0,
  add column if not exists requires_subscription boolean default false,
  add column if not exists access_tier text default 'free',
  add column if not exists is_private_drop boolean default false,
  add column if not exists sku text,
  add column if not exists tags text[] default '{}',
  add column if not exists sizes text[] default '{}',
  add column if not exists colors text[] default '{}',
  add column if not exists shipping_required boolean default true,
  add column if not exists max_per_order integer default 10,
  add column if not exists like_count integer default 0,
  add column if not exists wishlist_count integer default 0,
  add column if not exists share_count integer default 0,
  add column if not exists view_count integer default 0,
  add column if not exists rating_average numeric default 0,
  add column if not exists review_count integer default 0,
  add column if not exists sales_count integer default 0;

alter table public.media_drops
  add column if not exists like_count integer default 0,
  add column if not exists wishlist_count integer default 0,
  add column if not exists share_count integer default 0,
  add column if not exists view_count integer default 0;

alter table public.orders
  add column if not exists subtotal_amount numeric default 0,
  add column if not exists platform_fee_total numeric default 0,
  add column if not exists creator_payout_total numeric default 0,
  add column if not exists shipping_phone text,
  add column if not exists shipping_city text,
  add column if not exists shipping_state text,
  add column if not exists shipping_country text,
  add column if not exists tracking_number text,
  add column if not exists carrier text,
  add column if not exists admin_notes text;

create table if not exists public.item_interactions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('product', 'media_drop')),
  target_id uuid not null,
  user_email text not null,
  interaction_type text not null check (interaction_type in ('view', 'like', 'wishlist', 'share', 'play')),
  share_platform text,
  points_awarded numeric default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists item_interactions_target_idx
  on public.item_interactions (target_type, target_id, interaction_type);

create index if not exists item_interactions_user_idx
  on public.item_interactions (lower(user_email), interaction_type, created_at desc);

create unique index if not exists item_interactions_unique_like
  on public.item_interactions (target_type, target_id, lower(user_email), interaction_type)
  where interaction_type in ('like', 'wishlist');

alter table public.item_interactions enable row level security;

drop policy if exists "Anyone can insert item interactions" on public.item_interactions;
create policy "Anyone can insert item interactions"
  on public.item_interactions
  for insert
  to anon, authenticated
  with check (
    user_email = 'anonymous'
    or lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
  );

drop policy if exists "Users can read own item interactions" on public.item_interactions;
create policy "Users can read own item interactions"
  on public.item_interactions
  for select
  to authenticated
  using (
    lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
  );

drop policy if exists "Users can delete own item interactions" on public.item_interactions;
create policy "Users can delete own item interactions"
  on public.item_interactions
  for delete
  to authenticated
  using (
    lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
  );

create or replace function public.refresh_item_interaction_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_type text;
  v_target_id uuid;
begin
  v_target_type := coalesce(new.target_type, old.target_type);
  v_target_id := coalesce(new.target_id, old.target_id);

  if v_target_type = 'product' then
    update public.products
    set
      like_count = (select count(*) from public.item_interactions where target_type = 'product' and target_id = v_target_id and interaction_type = 'like'),
      wishlist_count = (select count(*) from public.item_interactions where target_type = 'product' and target_id = v_target_id and interaction_type = 'wishlist'),
      share_count = (select count(*) from public.item_interactions where target_type = 'product' and target_id = v_target_id and interaction_type = 'share'),
      view_count = (select count(*) from public.item_interactions where target_type = 'product' and target_id = v_target_id and interaction_type = 'view')
    where id = v_target_id;
  elsif v_target_type = 'media_drop' then
    update public.media_drops
    set
      like_count = (select count(*) from public.item_interactions where target_type = 'media_drop' and target_id = v_target_id and interaction_type = 'like'),
      wishlist_count = (select count(*) from public.item_interactions where target_type = 'media_drop' and target_id = v_target_id and interaction_type = 'wishlist'),
      share_count = (select count(*) from public.item_interactions where target_type = 'media_drop' and target_id = v_target_id and interaction_type = 'share'),
      view_count = (select count(*) from public.item_interactions where target_type = 'media_drop' and target_id = v_target_id and interaction_type = 'view')
    where id = v_target_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_refresh_item_interaction_counters on public.item_interactions;
create trigger trg_refresh_item_interaction_counters
after insert or delete on public.item_interactions
for each row execute function public.refresh_item_interaction_counters();

create table if not exists public.spin_reward_logs (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  prize_type text not null,
  prize_label text not null,
  prize_value numeric default 0,
  ticket_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.spin_reward_logs enable row level security;

drop policy if exists "Users can read own spin logs" on public.spin_reward_logs;
create policy "Users can read own spin logs"
  on public.spin_reward_logs
  for select
  to authenticated
  using (
    lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'super_admin')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'super_admin')
  );

drop policy if exists "Users can insert own spin logs" on public.spin_reward_logs;
create policy "Users can insert own spin logs"
  on public.spin_reward_logs
  for insert
  to authenticated
  with check (lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create or replace function public.apply_product_platform_pricing()
returns trigger
language plpgsql
as $$
declare
  v_base numeric;
  v_rate numeric;
begin
  v_rate := coalesce(nullif(new.platform_fee_rate, 0), 0.05);
  v_base := coalesce(nullif(new.creator_base_price, 0), nullif(new.price, 0), 0);

  new.creator_base_price := round(v_base, 2);
  new.platform_fee_rate := v_rate;
  new.platform_fee_amount := round(v_base * v_rate, 2);
  new.fan_price := round(v_base + new.platform_fee_amount, 2);
  new.price := new.fan_price;

  if new.requires_subscription is true and coalesce(new.access_tier, 'free') = 'free' then
    new.access_tier := 'supporter';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_product_platform_pricing on public.products;
create trigger trg_apply_product_platform_pricing
before insert or update of creator_base_price, platform_fee_rate, price, requires_subscription, access_tier
on public.products
for each row execute function public.apply_product_platform_pricing();

notify pgrst, 'reload schema';
