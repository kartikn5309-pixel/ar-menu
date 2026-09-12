-- Owner-scoped policies for the restaurant orders dashboard.
-- Run this migration in Supabase SQL Editor before using /dashboard/orders.
-- It does not grant anon access and does not modify the guest-order RPCs.

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Restaurant owners can view their orders" on public.orders;
drop policy if exists "Restaurant owners can update their orders" on public.orders;
drop policy if exists "Restaurant owners can view their order items" on public.order_items;

create policy "Restaurant owners can view their orders"
on public.orders
for select
to authenticated
using (
  exists (
    select 1
    from public.restaurants
    where public.restaurants.id = public.orders.restaurant_id
      and public.restaurants.owner_id = auth.uid()
  )
);

create policy "Restaurant owners can update their orders"
on public.orders
for update
to authenticated
using (
  exists (
    select 1
    from public.restaurants
    where public.restaurants.id = public.orders.restaurant_id
      and public.restaurants.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.restaurants
    where public.restaurants.id = public.orders.restaurant_id
      and public.restaurants.owner_id = auth.uid()
  )
);

create policy "Restaurant owners can view their order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    join public.restaurants
      on public.restaurants.id = public.orders.restaurant_id
    where public.orders.id = public.order_items.order_id
      and public.restaurants.owner_id = auth.uid()
  )
);
