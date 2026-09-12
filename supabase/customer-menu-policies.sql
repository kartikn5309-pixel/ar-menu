-- Run this in the Supabase SQL editor.
-- These policies expose only active customer-menu rows to anonymous visitors.
-- They do not grant INSERT, UPDATE, or DELETE access and do not alter owner policies.

create policy "Public can view active restaurant tables"
on public.restaurant_tables
for select
to anon
using (is_active = true);

create policy "Public can view restaurants with active tables"
on public.restaurants
for select
to anon
using (
  exists (
    select 1
    from public.restaurant_tables
    where restaurant_tables.restaurant_id = restaurants.id
      and restaurant_tables.is_active = true
  )
);

create policy "Public can view active menu categories"
on public.categories
for select
to anon
using (
  is_active = true
  and exists (
    select 1
    from public.restaurant_tables
    where restaurant_tables.restaurant_id = categories.restaurant_id
      and restaurant_tables.is_active = true
  )
);

create policy "Public can view available menu items"
on public.menu_items
for select
to anon
using (
  is_available = true
  and exists (
    select 1
    from public.restaurant_tables
    where restaurant_tables.restaurant_id = menu_items.restaurant_id
      and restaurant_tables.is_active = true
  )
);