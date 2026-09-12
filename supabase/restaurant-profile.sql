-- Run this migration manually in the Supabase SQL editor.
-- Adds URL-only branding fields and keeps restaurant management owner-scoped.

alter table public.restaurants
  add column if not exists logo_url text,
  add column if not exists cover_image_url text;

alter table public.restaurants enable row level security;

drop policy if exists "Restaurant owners can view their profile" on public.restaurants;
drop policy if exists "Restaurant owners can update their profile" on public.restaurants;

create policy "Restaurant owners can view their profile"
on public.restaurants
for select
to authenticated
using (owner_id = auth.uid());

create policy "Restaurant owners can update their profile"
on public.restaurants
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
