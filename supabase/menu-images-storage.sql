-- Review and run manually in the Supabase SQL editor.
-- The bucket is public for customer-menu image delivery only. Upload, update,
-- and delete operations remain restricted to authenticated restaurant owners.

insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can view menu images" on storage.objects;
drop policy if exists "Restaurant owners can upload menu images" on storage.objects;
drop policy if exists "Restaurant owners can update menu images" on storage.objects;
drop policy if exists "Restaurant owners can delete menu images" on storage.objects;

create policy "Public can view menu images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'menu-images');

create policy "Restaurant owners can upload menu images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] = 'restaurant'
  and (storage.foldername(name))[3] = 'menu'
  and exists (
    select 1
    from public.restaurants
    where public.restaurants.id::text = (storage.foldername(name))[2]
      and public.restaurants.owner_id = auth.uid()
  )
);

create policy "Restaurant owners can update menu images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] = 'restaurant'
  and (storage.foldername(name))[3] = 'menu'
  and exists (
    select 1
    from public.restaurants
    where public.restaurants.id::text = (storage.foldername(name))[2]
      and public.restaurants.owner_id = auth.uid()
  )
)
with check (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] = 'restaurant'
  and (storage.foldername(name))[3] = 'menu'
  and exists (
    select 1
    from public.restaurants
    where public.restaurants.id::text = (storage.foldername(name))[2]
      and public.restaurants.owner_id = auth.uid()
  )
);

create policy "Restaurant owners can delete menu images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] = 'restaurant'
  and (storage.foldername(name))[3] = 'menu'
  and exists (
    select 1
    from public.restaurants
    where public.restaurants.id::text = (storage.foldername(name))[2]
      and public.restaurants.owner_id = auth.uid()
  )
);
