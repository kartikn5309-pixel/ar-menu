import { supabase } from "@/lib/supabase";
import CustomerMenuClient from "./CustomerMenuClient";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ restaurantId: string; tableId: string }> };
type Category = { id: string; name: string; description: string | null; sort_order: number };
type MenuItem = { id: string; category_id: string | null; name: string; description: string | null; price: number; image_url: string | null; model_url: string | null; has_3d_model: boolean; is_veg: boolean; sort_order: number };

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
      .select("id, category_id, name, description, price, image_url, model_url, has_3d_model, is_veg, sort_order")
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
    <main className="min-h-screen bg-[#F7FAF5] text-[#1D2923] selection:bg-[#DDF5E8] selection:text-[#168548]">
      {/* Restaurant Hero Header (Deep Forest Green #17352A) */}
      <header className="relative isolate overflow-hidden bg-[#17352A] text-white">
        {restaurant.cover_image_url && (
          <div
            className="absolute inset-0 -z-10 bg-cover bg-center opacity-25 mix-blend-overlay filter blur-[1px] scale-105 transition-transform duration-700"
            style={{ backgroundImage: `url("${restaurant.cover_image_url}")` }}
            aria-hidden="true"
          />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#17352A] via-[#17352A]/85 to-black/40" />

        <div className="mx-auto max-w-5xl px-5 pt-6 pb-8 sm:px-8 sm:pb-12">
          {/* Top Brand & Table Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#168548] text-xs font-mono font-bold tracking-widest text-white border border-[#DDF5E8] shadow-xs">
                AR
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-wider text-white uppercase leading-none">
                  AR MENU
                </span>
                <span className="text-[9px] font-mono tracking-widest text-[#DDF5E8] uppercase mt-0.5 font-semibold">
                  Digital Dining
                </span>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white backdrop-blur-md shadow-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Table {table.name || table.table_number}</span>
            </div>
          </div>

          {/* Restaurant Details */}
          <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-start sm:items-end gap-5">
            {restaurant.logo_url && (
              <div
                role="img"
                aria-label={`${restaurant.name} logo`}
                className="h-20 w-20 shrink-0 rounded-2xl border-2 border-white/30 bg-white bg-cover bg-center shadow-xl sm:h-24 sm:w-24"
                style={{ backgroundImage: `url("${restaurant.logo_url}")` }}
              />
            )}

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-[#DDF5E8]">
                Culinary Experience
              </p>
              <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-white sm:text-5xl">
                {restaurant.name}
              </h1>

              {restaurant.description && (
                <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base font-medium">
                  {restaurant.description}
                </p>
              )}

              {(restaurant.address || restaurant.phone) && (
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/70 font-medium">
                  {restaurant.address && (
                    <span className="inline-flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-[#DDF5E8] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 10c0 4.993-5.5 11.5-8 12-2.5-.5-8-7.007-8-12a8 8 0 0 1 16 0Z"/><circle cx={12} cy={10} r={3}/></svg>
                      {restaurant.address}
                    </span>
                  )}
                  {restaurant.phone && (
                    <a
                      href={`tel:${restaurant.phone}`}
                      className="inline-flex items-center gap-1.5 text-white hover:text-[#DDF5E8] underline decoration-white/40 underline-offset-4 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5 text-[#DDF5E8] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
                      {restaurant.phone}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto max-w-5xl px-4 py-6 pb-36 sm:px-8 sm:py-10">
        <CustomerMenuClient
          restaurantId={restaurantId}
          tableId={tableId}
          items={items}
          categories={categories}
        />

        {items.length === 0 && (
          <div className="mt-8 rounded-3xl border border-dashed border-[#DCE7DC] bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF7EF] text-2xl text-[#168548] border border-[#DCE7DC]">
              🍽️
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#1D2923]">Menu coming soon</h2>
            <p className="mt-2 text-sm text-[#687B70] max-w-md mx-auto font-medium">
              This restaurant is currently curating their digital menu. Please check back shortly or ask a server for assistance.
            </p>
          </div>
        )}
      </div>

      <footer className="border-t border-[#DCE7DC] bg-white px-5 py-8 text-center text-xs font-medium text-[#687B70]">
        Powered by <span className="font-semibold text-[#168548]">AR MENU</span> · Spatial Digital Dining
      </footer>
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

function InvalidMenuLink({
  message = "This table menu link is invalid or no longer active.",
}: {
  message?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7FAF5] px-5 text-center text-[#1D2923]">
      <section className="w-full max-w-md rounded-3xl border border-[#DCE7DC] bg-white p-8 shadow-xl sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-xl font-bold text-amber-700 border border-amber-200">
          !
        </div>
        <h1 className="mt-5 text-2xl font-bold text-[#1D2923]">Menu Unavailable</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#687B70] font-medium">{message}</p>
        <div className="mt-6 rounded-2xl bg-[#F7FAF5] p-4 border border-[#DCE7DC] text-xs text-[#687B70] font-medium">
          Please rescan the QR code on your table or request assistance from the restaurant staff.
        </div>
      </section>
    </main>
  );
}
