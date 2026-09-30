/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ARViewer from "@/components/ar/ARViewer";
import {
  SearchIcon,
  CloseIcon,
  PlusIcon,
  MinusIcon,
  ShoppingBagIcon,
  ArCubeIcon,
  SparklesIcon,
  TrashIcon,
  NoteIcon,
  VegBadge,
  NonVegBadge,
} from "@/components/ui/Icons";

type MenuItem = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  model_url: string | null;
  has_3d_model: boolean;
  is_veg: boolean;
};

type Category = {
  id: string;
  name: string;
};

type CartLine = MenuItem & {
  quantity: number;
  notes: string;
};

type OrderResult = {
  order_id: string;
  access_token: string;
};

const ORDER_STORAGE_KEY = "ar-menu-orders";

export default function CustomerMenuClient({
  restaurantId,
  tableId,
  items,
  categories,
}: {
  restaurantId: string;
  tableId: string;
  items: MenuItem[];
  categories: Category[];
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [arItem, setArItem] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0
      ),
    [cart]
  );

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const normalizedSearch = search.trim().toLowerCase();

  const matchesSearch = (item: MenuItem) =>
    !normalizedSearch ||
    `${item.name} ${item.description ?? ""}`
      .toLowerCase()
      .includes(normalizedSearch);

  const filteredItems = items.filter(
    (item) =>
      (activeCategory === "all" || item.category_id === activeCategory) &&
      matchesSearch(item)
  );

  const grouped = categories
    .map((category) => ({
      category,
      items: filteredItems.filter((item) => item.category_id === category.id),
    }))
    .filter((group) => group.items.length > 0);

  const uncategorized = filteredItems.filter(
    (item) =>
      !item.category_id ||
      !categories.some((category) => category.id === item.category_id)
  );

  function add(item: MenuItem) {
    setCart((current) => {
      const existing = current.find((line) => line.id === item.id);
      return existing
        ? current.map((line) =>
            line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line
          )
        : [...current, { ...item, quantity: 1, notes: "" }];
    });
  }

  function changeQuantity(id: string, delta: number) {
    setCart((current) =>
      current.flatMap((line) => {
        if (line.id !== id) return [line];
        if (line.quantity + delta <= 0) return [];
        return [{ ...line, quantity: line.quantity + delta }];
      })
    );
  }

  function updateItemNotes(id: string, notes: string) {
    setCart((current) =>
      current.map((line) => (line.id === id ? { ...line, notes } : line))
    );
  }

  async function placeOrder() {
    if (!cart.length) return;
    setSaving(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc("place_guest_order", {
      p_restaurant_id: restaurantId,
      p_table_id: tableId,
      p_items: cart.map((item) => ({
        menu_item_id: item.id,
        quantity: item.quantity,
        notes: item.notes,
      })),
      p_customer_name: customerName,
      p_notes: orderNotes,
    });

    if (rpcError) {
      setError(rpcError.message);
      setSaving(false);
      return;
    }

    const result = data as OrderResult;
    try {
      const stored = JSON.parse(
        window.localStorage.getItem(ORDER_STORAGE_KEY) ?? "[]"
      ) as unknown;
      const orders = Array.isArray(stored)
        ? stored
            .filter((entry): entry is OrderResult => {
              if (!entry || typeof entry !== "object") return false;
              const candidate = entry as Partial<OrderResult>;
              return (
                typeof candidate.order_id === "string" &&
                typeof candidate.access_token === "string"
              );
            })
            .filter(
              (entry, index, entries) =>
                entries.findIndex(
                  (candidate) => candidate.order_id === entry.order_id
                ) === index
            )
        : [];
      const nextOrders = orders.some(
        (entry) => entry.order_id === result.order_id
      )
        ? orders
        : [...orders, result];
      window.localStorage.setItem(
        ORDER_STORAGE_KEY,
        JSON.stringify(nextOrders)
      );
    } catch {
      // Continue navigation even if storage fails
    }

    router.push(
      `/menu/order/${result.order_id}?token=${encodeURIComponent(
        result.access_token
      )}`
    );
  }

  return (
    <>
      {/* Sticky Search & Category Bar */}
      <div className="sticky top-0 z-10 -mx-4 mb-8 border-b border-stone-200/80 bg-[#faf9f5]/90 px-4 pb-3.5 pt-3 backdrop-blur-md sm:-mx-8 sm:px-8">
        {/* Search Field */}
        <div className="relative flex h-12 w-full items-center gap-3 rounded-2xl border border-stone-200/90 bg-white px-4 shadow-xs transition-all focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10">
          <SearchIcon className="h-4 w-4 text-stone-400 shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search dishes, ingredients..."
            className="w-full bg-transparent text-base sm:text-sm text-zinc-900 placeholder:text-stone-400 outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Categories Bar with Horizontal Scroll */}
        {categories.length > 0 && (
          <div className="relative mt-3">
            <nav
              aria-label="Menu categories"
              className="no-scrollbar flex gap-2 overflow-x-auto py-1 scroll-smooth"
            >
              <CategoryButton
                active={activeCategory === "all"}
                onClick={() => setActiveCategory("all")}
              >
                All dishes
              </CategoryButton>
              {categories.map((category) => (
                <CategoryButton
                  key={category.id}
                  active={activeCategory === category.id}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.name}
                </CategoryButton>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Dishes Sections / Empty State */}
      {filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
            <SearchIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-zinc-900">
            No dishes matched your search
          </h2>
          <p className="mt-1.5 text-sm text-zinc-500 max-w-sm mx-auto">
            Try searching for another dish, ingredient, or view all items.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setActiveCategory("all");
            }}
            className="mt-5 rounded-full bg-zinc-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 transition"
          >
            Show all dishes
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          {grouped.map(({ category, items: categoryItems }) => (
            <MenuSection
              key={category.id}
              title={category.name}
              items={categoryItems}
              cart={cart}
              onAdd={add}
              onChange={changeQuantity}
              onOpenCart={() => setShowCart(true)}
              onDetails={setSelectedItem}
              onViewInAR={setArItem}
            />
          ))}

          {uncategorized.length > 0 && (
            <MenuSection
              title="More Specialties"
              items={uncategorized}
              cart={cart}
              onAdd={add}
              onChange={changeQuantity}
              onOpenCart={() => setShowCart(true)}
              onDetails={setSelectedItem}
              onViewInAR={setArItem}
            />
          )}
        </div>
      )}

      {/* Floating Bottom Cart Capsule */}
      <button
        type="button"
        onClick={() => setShowCart(true)}
        className="fixed bottom-safe left-1/2 -translate-x-1/2 z-20 flex min-h-12 items-center gap-3.5 rounded-full bg-zinc-900/95 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-zinc-950/30 border border-zinc-800 backdrop-blur-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
        aria-label="View shopping cart"
      >
        <span className="flex h-6 min-w-6 px-1.5 items-center justify-center rounded-full bg-orange-600 text-xs font-bold tabular-nums">
          {count}
        </span>
        <span className="tabular-nums">
          {count ? `View order · ₹${subtotal.toFixed(2)}` : "View order"}
        </span>
        <ShoppingBagIcon className="h-4 w-4 text-orange-400" />
      </button>

      {/* Food Item Details Modal / Sheet */}
      {selectedItem && (
        <ItemDetailsModal
          item={selectedItem}
          quantity={
            cart.find((line) => line.id === selectedItem.id)?.quantity ?? 0
          }
          onClose={() => setSelectedItem(null)}
          onAdd={() => add(selectedItem)}
          onChange={(delta) => changeQuantity(selectedItem.id, delta)}
          onOpenCart={() => {
            setSelectedItem(null);
            setShowCart(true);
          }}
          onViewInAR={() => {
            setSelectedItem(null);
            setArItem(selectedItem);
          }}
        />
      )}

      {/* AR Model Viewer (Untouched ARViewer.tsx invocation) */}
      {arItem?.has_3d_model && arItem.model_url && (
        <ARViewer
          modelUrl={arItem.model_url}
          itemName={arItem.name}
          poster={arItem.image_url}
          onClose={() => setArItem(null)}
        />
      )}

      {/* Cart & Checkout Sheet */}
      {showCart && (
        <CartDrawer
          cart={cart}
          subtotal={subtotal}
          checkout={checkout}
          customerName={customerName}
          orderNotes={orderNotes}
          saving={saving}
          error={error}
          onClose={() => setShowCart(false)}
          onChange={changeQuantity}
          onRemove={(id) =>
            setCart((current) => current.filter((line) => line.id !== id))
          }
          onItemNotes={updateItemNotes}
          onCheckout={() => setCheckout(true)}
          onBackToCart={() => setCheckout(false)}
          onCustomerName={setCustomerName}
          onOrderNotes={setOrderNotes}
          onPlaceOrder={placeOrder}
        />
      )}
    </>
  );
}

function CategoryButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 shrink-0 rounded-full px-4 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
        active
          ? "bg-zinc-900 text-white shadow-xs"
          : "border border-stone-200/90 bg-white text-stone-600 hover:border-orange-300 hover:text-zinc-900"
      }`}
    >
      {children}
    </button>
  );
}

function MenuSection({
  title,
  items,
  cart,
  onAdd,
  onChange,
  onOpenCart,
  onDetails,
  onViewInAR,
}: {
  title: string;
  items: MenuItem[];
  cart: CartLine[];
  onAdd: (item: MenuItem) => void;
  onChange: (id: string, delta: number) => void;
  onOpenCart: () => void;
  onDetails: (item: MenuItem) => void;
  onViewInAR: (item: MenuItem) => void;
}) {
  return (
    <section>
      <div className="mb-4 flex items-baseline justify-between border-b border-stone-200/80 pb-2.5">
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-zinc-900">
          {title}
        </h2>
        <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
          {items.length} {items.length === 1 ? "dish" : "dishes"}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            quantity={cart.find((line) => line.id === item.id)?.quantity ?? 0}
            onAdd={() => onAdd(item)}
            onChange={(delta) => onChange(item.id, delta)}
            onOpenCart={onOpenCart}
            onDetails={() => onDetails(item)}
            onViewInAR={() => onViewInAR(item)}
          />
        ))}
      </div>
    </section>
  );
}

function MenuItemCard({
  item,
  quantity,
  onAdd,
  onChange,
  onDetails,
  onViewInAR,
}: {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onChange: (delta: number) => void;
  onOpenCart: () => void;
  onDetails: () => void;
  onViewInAR: () => void;
}) {
  const hasAR = item.has_3d_model && Boolean(item.model_url);

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-stone-300/80 transition-all duration-200">
      <div className="flex gap-4">
        {/* Text information */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Dietary & 3D Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {item.is_veg ? <VegBadge /> : <NonVegBadge />}
            {hasAR && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/90 px-2 py-0.5 text-[11px] font-bold text-orange-700 shadow-2xs">
                <SparklesIcon className="h-3 w-3 text-orange-600" />
                <span>3D & AR</span>
              </span>
            )}
          </div>

          <h3 className="font-bold text-base sm:text-lg text-zinc-900 tracking-tight leading-snug">
            {item.name}
          </h3>

          <div className="mt-1 text-sm sm:text-base font-extrabold text-zinc-900 tabular-nums">
            ₹{Number(item.price).toFixed(2)}
          </div>

          {item.description && (
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-500 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        {/* Thumbnail Image */}
        <div
          onClick={onDetails}
          className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-stone-200/60 shadow-2xs cursor-pointer"
        >
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-stone-50 via-stone-100 to-amber-50/40 p-2 text-center text-stone-400">
              <span className="text-xl">🍽️</span>
              <span className="mt-1 text-[10px] font-medium text-stone-400">
                Freshly made
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDetails}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            View details
          </button>

          {hasAR && (
            <button
              type="button"
              onClick={onViewInAR}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200/80 px-2.5 py-1 text-xs font-bold text-orange-700 transition-colors active:scale-95"
            >
              <ArCubeIcon className="h-3.5 w-3.5 text-orange-600" />
              View in AR
            </button>
          )}
        </div>

        {/* Add Button & Stepper */}
        {quantity > 0 ? (
          <div className="inline-flex items-center rounded-xl bg-orange-50 border border-orange-200/90 shadow-2xs p-0.5">
            <button
              type="button"
              onClick={() => onChange(-1)}
              aria-label={`Remove one ${item.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-zinc-800 shadow-2xs hover:bg-stone-50 active:scale-95 transition-all"
            >
              <MinusIcon className="h-3 w-3" />
            </button>
            <span className="min-w-7 text-center text-xs font-bold text-orange-950 tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onChange(1)}
              aria-label={`Add one ${item.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-white shadow-2xs hover:bg-orange-700 active:scale-95 transition-all"
            >
              <PlusIcon className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="min-h-9 px-4 rounded-xl bg-zinc-900 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5"
          >
            <PlusIcon className="h-3 w-3" />
            Add
          </button>
        )}
      </div>
    </article>
  );
}

function ItemDetailsModal({
  item,
  quantity,
  onClose,
  onAdd,
  onChange,
  onOpenCart,
  onViewInAR,
}: {
  item: MenuItem;
  quantity: number;
  onClose: () => void;
  onAdd: () => void;
  onChange: (delta: number) => void;
  onOpenCart: () => void;
  onViewInAR: () => void;
}) {
  const hasAR = item.has_3d_model && Boolean(item.model_url);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${item.name} details`}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl transition-transform"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Hero image area */}
        <div className="relative h-56 sm:h-64 w-full bg-stone-100 overflow-hidden">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-stone-100 text-stone-400">
              <span className="text-4xl">🍽️</span>
              <span className="mt-2 text-xs font-medium">Freshly made</span>
            </div>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md shadow-md hover:bg-black/70 transition"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Content Details */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {item.is_veg ? <VegBadge /> : <NonVegBadge />}
                <span className="text-xs font-semibold text-zinc-500">
                  {item.is_veg ? "Vegetarian" : "Non-Vegetarian"}
                </span>
                {hasAR && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[11px] font-bold text-orange-700">
                    <SparklesIcon className="h-3 w-3 text-orange-600" />
                    3D Model Ready
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
                {item.name}
              </h2>
            </div>

            <p className="text-xl font-extrabold text-zinc-900 tabular-nums">
              ₹{Number(item.price).toFixed(2)}
            </p>
          </div>

          {item.description && (
            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              {item.description}
            </p>
          )}

          {/* AR Call to Action */}
          {hasAR && (
            <button
              type="button"
              onClick={onViewInAR}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 px-5 text-sm font-bold text-orange-800 shadow-xs hover:from-orange-100 hover:to-amber-100 active:scale-[0.99] transition-all"
            >
              <ArCubeIcon className="h-4 w-4 text-orange-600" />
              <span>Preview dish in 3D & Augmented Reality</span>
            </button>
          )}

          {/* Bottom Action Footer */}
          <div className="mt-8 flex items-center gap-3 pt-4 border-t border-stone-100">
            {quantity > 0 ? (
              <>
                <div className="flex items-center rounded-xl bg-orange-50 border border-orange-200 p-1">
                  <button
                    type="button"
                    onClick={() => onChange(-1)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-zinc-900 shadow-2xs hover:bg-stone-50"
                  >
                    <MinusIcon className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-8 text-center text-sm font-bold text-orange-950 tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange(1)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600 text-white shadow-2xs hover:bg-orange-700"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onOpenCart}
                  className="flex-1 min-h-11 rounded-xl bg-zinc-900 px-5 text-sm font-bold text-white shadow-xs hover:bg-zinc-800 transition"
                >
                  View in order
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onAdd}
                className="w-full min-h-11 rounded-xl bg-zinc-900 px-5 text-sm font-bold text-white shadow-xs hover:bg-orange-600 transition flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add to order
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function CartDrawer({
  cart,
  subtotal,
  checkout,
  customerName,
  orderNotes,
  saving,
  error,
  onClose,
  onChange,
  onRemove,
  onItemNotes,
  onCheckout,
  onBackToCart,
  onCustomerName,
  onOrderNotes,
  onPlaceOrder,
}: {
  cart: CartLine[];
  subtotal: number;
  checkout: boolean;
  customerName: string;
  orderNotes: string;
  saving: boolean;
  error: string;
  onClose: () => void;
  onChange: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onItemNotes: (id: string, notes: string) => void;
  onCheckout: () => void;
  onBackToCart: () => void;
  onCustomerName: (value: string) => void;
  onOrderNotes: (value: string) => void;
  onPlaceOrder: () => void;
}) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <aside
        className="absolute bottom-0 left-0 right-0 max-h-[92vh] sm:bottom-0 sm:top-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-md sm:h-full bg-white rounded-t-3xl sm:rounded-l-3xl sm:rounded-r-none flex flex-col shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-600">
              <ShoppingBagIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">
                {checkout ? "Table Checkout" : "Your Order"}
              </h2>
              <p className="text-xs text-zinc-500">
                {cart.length} {cart.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-100 text-stone-500 hover:bg-stone-200"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Cart Item List / Checkout Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="py-20 text-center">
              <span className="text-4xl">🛒</span>
              <p className="mt-3 text-base font-semibold text-zinc-900">
                Your order is empty
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Explore dishes from the menu and add your favorites.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 rounded-full bg-zinc-900 px-5 py-2 text-xs font-semibold text-white hover:bg-zinc-800"
              >
                Browse menu
              </button>
            </div>
          ) : !checkout ? (
            <div className="divide-y divide-stone-100">
              {cart.map((line) => (
                <div key={line.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex gap-3">
                    {/* Item Thumbnail */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-stone-200/70">
                      {line.image_url ? (
                        <img
                          src={line.image_url}
                          alt={line.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
                          🍽️
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {line.is_veg ? <VegBadge className="h-3 w-3" /> : <NonVegBadge className="h-3 w-3" />}
                            <h4 className="truncate text-sm font-bold text-zinc-900">
                              {line.name}
                            </h4>
                          </div>
                          <p className="text-xs text-zinc-500 tabular-nums">
                            ₹{Number(line.price).toFixed(2)} each
                          </p>
                        </div>

                        <p className="text-sm font-extrabold text-zinc-900 tabular-nums">
                          ₹{(Number(line.price) * line.quantity).toFixed(2)}
                        </p>
                      </div>

                      {/* Stepper & Note trigger */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg bg-stone-100 border border-stone-200/80 p-0.5">
                          <button
                            type="button"
                            onClick={() => onChange(line.id, -1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-zinc-700 shadow-2xs hover:bg-stone-50"
                          >
                            <MinusIcon className="h-2.5 w-2.5" />
                          </button>
                          <span className="min-w-6 text-center text-xs font-bold text-zinc-900 tabular-nums">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onChange(line.id, 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-zinc-700 shadow-2xs hover:bg-stone-50"
                          >
                            <PlusIcon className="h-2.5 w-2.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingNoteId((curr) =>
                                curr === line.id ? null : line.id
                              )
                            }
                            className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-orange-600"
                          >
                            <NoteIcon className="h-3 w-3" />
                            <span>{line.notes ? "Edit note" : "Add note"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemove(line.id)}
                            aria-label={`Remove ${line.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Note Input */}
                      {(editingNoteId === line.id || line.notes) && (
                        <div className="mt-2.5">
                          <input
                            type="text"
                            value={line.notes}
                            onChange={(e) => onItemNotes(line.id, e.target.value)}
                            placeholder="Special requests (e.g. less spicy)..."
                            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-zinc-900 placeholder:text-stone-400 outline-none focus:border-orange-500 focus:bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <button
                type="button"
                onClick={onBackToCart}
                className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline"
              >
                ← Review order items
              </button>

              <div className="rounded-2xl border border-stone-200/90 bg-stone-50 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Guest Information
                </p>

                <label className="block">
                  <span className="block text-xs font-semibold text-zinc-700 mb-1">
                    Your Name (optional)
                  </span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => onCustomerName(event.target.value)}
                    placeholder="Enter your name"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-base sm:text-sm text-zinc-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-semibold text-zinc-700 mb-1">
                    Kitchen Notes (optional)
                  </span>
                  <textarea
                    value={orderNotes}
                    onChange={(event) => onOrderNotes(event.target.value)}
                    placeholder="Any general dining or dietary preferences..."
                    rows={2}
                    className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-base sm:text-sm text-zinc-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10"
                  />
                </label>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer with Bill Summary & CTA */}
        {cart.length > 0 && (
          <div className="border-t border-stone-100 bg-stone-50/50 p-6 space-y-3">
            <div className="space-y-1.5 text-xs text-zinc-500">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="tabular-nums font-semibold text-zinc-700">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-zinc-900 pt-1 border-t border-stone-200/60">
                <span>Total Amount</span>
                <span className="tabular-nums text-zinc-900">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            {!checkout ? (
              <button
                type="button"
                onClick={onCheckout}
                className="w-full min-h-12 rounded-xl bg-zinc-900 hover:bg-orange-600 active:scale-[0.99] text-sm font-bold text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to checkout</span>
                <span className="text-xs text-zinc-400">·</span>
                <span className="tabular-nums font-semibold">
                  ₹{subtotal.toFixed(2)}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPlaceOrder}
                disabled={saving}
                className="w-full min-h-12 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] disabled:opacity-60 text-sm font-bold text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Sending order to kitchen...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Place Order</span>
                    <span className="text-xs text-orange-200">·</span>
                    <span className="tabular-nums font-semibold">
                      ₹{subtotal.toFixed(2)}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
