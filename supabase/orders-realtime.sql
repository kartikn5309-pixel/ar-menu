-- Enable Supabase Realtime for the restaurant orders dashboard.
-- Run this manually in Supabase SQL Editor. It does not change RLS or grant
-- anonymous access to orders.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end
$$;
