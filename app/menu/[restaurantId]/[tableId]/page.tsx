import { supabase } from "@/lib/supabase";
import CustomerMenuClient from "./CustomerMenuClient";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ restaurantId: string; tableId: string }> };
type Category = { id: string; name: string; description: string | null; sort_order: number };
type MenuItem = { id: string; category_id: string | null; name: string; description: string | null; price: number; image_url: string | null; is_veg: boolean; sort_order: number };

export default async function CustomerMenuPage({ params }: PageProps) {
  const { restaurantId, tableId } = await params;
  const { data: table, error: tableError } = await supabase
    .from("restaurant_tables")
    .select("id, restaurant_id, is_active, table_number, name")
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  console.info("[customer-menu] table validation", {
    restaurantId,
    tableId,
    found: Boolean(table),
    tableRestaurantId: table?.restaurant_id ?? null,
    tableIsActive: table?.is_active ?? null,
    error: formatSupabaseError(tableError),
  });

  if (tableError || !table) {
    return <InvalidMenuLink />;
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name, description, address, phone, logo_url, cover_image_url")
    .eq("id", table.restaurant_id)
    .eq("id", restaurantId)
    .maybeSingle();

  console.info("[customer-menu] restaurant validation", {
    restaurantId,
    found: Boolean(restaurant),
    error: formatSupabaseError(restaurantError),
  });

  if (restaurantError || !restaurant) {
    return <InvalidMenuLink />;
  }

  const [categoryResult, itemResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, description, sort_order")
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("menu_items")
      .select("id, category_id, name, description, price, image_url, is_veg, sort_order")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true)
      .order("sort_order", { ascending: true }),
  ]);

  console.info("[customer-menu] menu data", {
    restaurantId,
    tableId,
    categoryCount: categoryResult.data?.length ?? 0,
    itemCount: itemResult.data?.length ?? 0,
    categoryError: formatSupabaseError(categoryResult.error),
    itemError: formatSupabaseError(itemResult.error),
  });

  if (categoryResult.error || itemResult.error) {
    return <InvalidMenuLink message="This menu is temporarily unavailable. Please try again shortly." />;
  }

  const categories = (categoryResult.data ?? []) as Category[];
  const items = (itemResult.data ?? []) as MenuItem[];
  return (
    <main className="min-h-screen bg-[#fbfaf7] text-slate-950">
      <header className="relative isolate overflow-hidden bg-[#172019] px-5 pb-9 pt-5 text-white sm:px-8 sm:pb-12">
        {restaurant.cover_image_url && <div className="absolute inset-0 -z-10 bg-cover bg-center opacity-35" style={{ backgroundImage: `url("${restaurant.cover_image_url}")` }} />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/20 via-[#172019]/65 to-[#172019]" />
        <div className="mx-auto flex max-w-5xl items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
          <span>AR MENU</span>
          <span className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] tracking-[0.16em]">Table {table.name || table.table_number}</span>
        </div>
        <div className="relative mx-auto mt-12 max-w-5xl sm:mt-20">
          {restaurant.logo_url && <div role="img" aria-label={`${restaurant.name} logo`} className="mb-5 h-16 w-16 rounded-2xl border border-white/25 bg-cover bg-center shadow-2xl sm:h-20 sm:w-20" style={{ backgroundImage: `url("${restaurant.logo_url}")` }} />}
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">Welcome to</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">{restaurant.name}</h1>
          {restaurant.description && <p className="mt-5 max-w-xl text-base leading-7 text-white/75 sm:text-lg">{restaurant.description}</p>}
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/65">
            {restaurant.address && <span>{restaurant.address}</span>}
            {restaurant.phone && <a href={`tel:${restaurant.phone}`} className="underline decoration-white/30 underline-offset-4">{restaurant.phone}</a>}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-7 pb-28 sm:px-8 sm:py-12">
        <CustomerMenuClient restaurantId={restaurantId} tableId={tableId} items={items} categories={categories} />
        {items.length === 0 && <div className="rounded-3xl border border-dashed border-orange-200 bg-white px-6 py-16 text-center shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">A little patience</p><h2 className="mt-3 text-2xl font-bold">Menu coming soon</h2><p className="mt-2 text-sm text-slate-500">There are no available items at the moment.</p></div>}
      </div>
      <footer className="border-t border-slate-200 px-5 py-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Powered by AR MENU</footer>
    </main>
  );
}

function formatSupabaseError(error: { code?: string; message?: string; details?: string; hint?: string } | null) {
  if (!error) return null;
  return {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

function InvalidMenuLink({ message = "This table menu link is invalid or no longer active." }: { message?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fffaf5] px-5 text-center text-slate-900">
      <section className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-8 shadow-sm sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl text-orange-600">!</div>
        <h1 className="mt-5 text-2xl font-bold">Menu link unavailable</h1>
        <p className="mt-3 leading-7 text-slate-500">{message}</p>
        <p className="mt-6 text-sm text-slate-400">Please scan the QR code at your table again or ask a member of staff for help.</p>
      </section>
    </main>
  );
}
