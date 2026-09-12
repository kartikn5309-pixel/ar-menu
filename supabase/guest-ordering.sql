-- Guest ordering security migration.
-- Run this in Supabase SQL Editor before enabling the customer checkout UI.
-- This script does not change orders/order_items columns.

create extension if not exists pgcrypto;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create table if not exists public.order_access_tokens (
  order_id uuid primary key references public.orders(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

alter table public.order_access_tokens enable row level security;
revoke all on table public.order_access_tokens from anon, authenticated;

revoke all on table public.orders from anon;
revoke all on table public.order_items from anon;

create or replace function public.place_guest_order(
  p_restaurant_id uuid,
  p_table_id uuid,
  p_items jsonb,
  p_customer_name text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  restaurant_exists boolean;
  table_exists boolean;
  order_id uuid;
  order_number text;
  access_token text;
  item jsonb;
  menu_item record;
  requested_quantity integer;
  requested_notes text;
  calculated_subtotal numeric(12, 2) := 0;
  line_total numeric(12, 2);
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one menu item is required';
  end if;

  select exists(
    select 1 from public.restaurants
    where id = p_restaurant_id
  ) into restaurant_exists;
  if not restaurant_exists then
    raise exception 'Restaurant not found';
  end if;

  select exists(
    select 1 from public.restaurant_tables
    where id = p_table_id
      and restaurant_id = p_restaurant_id
      and is_active = true
  ) into table_exists;
  if not table_exists then
    raise exception 'Table is invalid or inactive';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    if (item->>'menu_item_id') is null then
      raise exception 'Every cart item needs a menu item id';
    end if;

    requested_quantity := (item->>'quantity')::integer;
    if requested_quantity is null or requested_quantity < 1 or requested_quantity > 99 then
      raise exception 'Menu item quantities must be between 1 and 99';
    end if;

    select id, name, price
    into menu_item
    from public.menu_items
    where id = (item->>'menu_item_id')::uuid
      and restaurant_id = p_restaurant_id
      and is_available = true
    for share;

    if not found then
      raise exception 'A menu item is unavailable';
    end if;

    line_total := round(menu_item.price * requested_quantity, 2);
    calculated_subtotal := calculated_subtotal + line_total;
  end loop;

  order_number := 'ORD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
  insert into public.orders (
    restaurant_id, table_id, order_number, customer_name, notes, subtotal, total, status
  ) values (
    p_restaurant_id,
    p_table_id,
    order_number,
    nullif(trim(p_customer_name), ''),
    nullif(trim(p_notes), ''),
    calculated_subtotal,
    calculated_subtotal,
    'pending'
  ) returning id into order_id;

  for item in select value from jsonb_array_elements(p_items)
  loop
    requested_quantity := (item->>'quantity')::integer;
    requested_notes := nullif(trim(item->>'notes'), '');

    select id, name, price
    into menu_item
    from public.menu_items
    where id = (item->>'menu_item_id')::uuid
      and restaurant_id = p_restaurant_id
      and is_available = true
    for share;

    line_total := round(menu_item.price * requested_quantity, 2);
    insert into public.order_items (
      order_id, menu_item_id, item_name, unit_price, quantity, notes, line_total
    ) values (
      order_id, menu_item.id, menu_item.name, menu_item.price, requested_quantity, requested_notes, line_total
    );
  end loop;

  access_token := encode(gen_random_bytes(32), 'hex');
  insert into public.order_access_tokens (order_id, token_hash)
  values (order_id, encode(digest(access_token, 'sha256'), 'hex'));

  return jsonb_build_object(
    'order_id', order_id,
    'order_number', order_number,
    'access_token', access_token,
    'subtotal', calculated_subtotal,
    'total', calculated_subtotal,
    'status', 'pending'
  );
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Invalid order item data';
end;
$$;

create or replace function public.get_guest_order(
  p_order_id uuid,
  p_access_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'order_id', order_row.id,
    'order_number', order_row.order_number,
    'restaurant_id', order_row.restaurant_id,
    'table_id', order_row.table_id,
    'restaurant_name', restaurant.name,
    'table_name', coalesce(restaurant_table.name, 'Table ' || restaurant_table.table_number::text),
    'customer_name', order_row.customer_name,
    'notes', order_row.notes,
    'subtotal', order_row.subtotal,
    'total', order_row.total,
    'status', order_row.status,
    'created_at', order_row.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', order_item.id,
        'item_name', order_item.item_name,
        'unit_price', order_item.unit_price,
        'quantity', order_item.quantity,
        'notes', order_item.notes,
        'line_total', order_item.line_total
      ) order by order_item.created_at)
      from public.order_items as order_item
      where order_item.order_id = order_row.id
    ), '[]'::jsonb)
  )
  into result
  from public.orders as order_row
  join public.restaurants as restaurant
    on restaurant.id = order_row.restaurant_id
  join public.restaurant_tables as restaurant_table
    on restaurant_table.id = order_row.table_id
    and restaurant_table.restaurant_id = order_row.restaurant_id
  join public.order_access_tokens as access
    on access.order_id = order_row.id
  where order_row.id = p_order_id
    and access.token_hash = encode(digest(p_access_token, 'sha256'), 'hex')
    and access.expires_at > now();

  if result is null then
    raise exception 'Order not found';
  end if;

  return result;
end;
$$;

revoke all on function public.place_guest_order(uuid, uuid, jsonb, text, text) from public;
revoke all on function public.get_guest_order(uuid, text) from public;
grant execute on function public.place_guest_order(uuid, uuid, jsonb, text, text) to anon;
grant execute on function public.get_guest_order(uuid, text) to anon;

notify pgrst, 'reload schema';
