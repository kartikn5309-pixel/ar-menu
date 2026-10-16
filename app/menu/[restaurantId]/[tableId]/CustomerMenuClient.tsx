/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
      !item.category_id || !categories.some((c) => c.id === item.category_id)
  );

  function add(item: MenuItem) {
    setCart((current) => {
      const existing = current.find((line) => line.id === item.id);
      if (existing) {
        return current.map((line) =>
          line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line
        );
      }
      return [...current, { ...item, quantity: 1, notes: "" }];
    });
  }

  function changeQuantity(id: string, delta: number) {
    setCart((current) =>
      current
        .map((line) => {
          if (line.id !== id) return line;
          const next = line.quantity + delta;
          return next > 0 ? { ...line, quantity: next } : null;
        })
        .filter((line): line is CartLine => line !== null)
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

    const payload = {
      restaurant_id: restaurantId,
      table_id: tableId,
      customer_name: customerName.trim() || undefined,
      notes: orderNotes.trim() || undefined,
      items: cart.map((item) => ({
        menu_item_id: item.id,
        quantity: item.quantity,
        notes: item.notes.trim() || undefined,
      })),
    };

    console.info("[order-placement] submitting order payload", payload);

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as Partial<OrderResult> & {
      error?: string;
    };

    console.info("[order-placement] server response", {
      status: response.status,
      ok: response.ok,
      result,
    });

    if (!response.ok || !result.order_id || !result.access_token) {
      setError(result.error ?? "Failed to place your order. Please retry.");
      setSaving(false);
      return;
    }

    // Persist active guest token into browser localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(
          window.localStorage.getItem(ORDER_STORAGE_KEY) ?? "[]"
        ) as unknown;
        const currentOrders = Array.isArray(stored) ? stored : [];
        const nextOrders = [
          { order_id: result.order_id, access_token: result.access_token },
          ...currentOrders.filter(
            (entry) =>
              entry &&
              typeof entry === "object" &&
              "order_id" in entry &&
              entry.order_id !== result.order_id
          ),
        ];
        window.localStorage.setItem(
          ORDER_STORAGE_KEY,
          JSON.stringify(nextOrders)
        );
      } catch (storageError) {
        console.warn(
          "[order-placement] LocalStorage save warning:",
          storageError
        );
      }
    }

    setCart([]);
    setShowCart(false);
    setCheckout(false);
    setSaving(false);

    router.push(
      `/menu/order/${result.order_id}?token=${encodeURIComponent(
        result.access_token
      )}`
    );
  }

  return (
    <>
      {/* Sticky Search & Category Bar */}
      <div className="sticky top-0 z-20 -mx-4 mb-8 border-b border-[#DCE7DC] bg-[#F7FAF5]/95 px-4 pb-3.5 pt-3 backdrop-blur-md sm:-mx-8 sm:px-8">
        {/* Search Field */}
        <div className="relative flex h-12 w-full items-center gap-3 rounded-2xl border border-[#DCE7DC] bg-white px-4 shadow-2xs transition-all focus-within:border-[#168548] focus-within:ring-4 focus-within:ring-[#168548]/10">
          <SearchIcon className="h-4 w-4 text-[#687B70] shrink-0" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search dishes, ingredients, dietary flags..."
            className="w-full bg-transparent text-base sm:text-sm text-[#1D2923] placeholder:text-[#687B70]/60 outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7FAF5] text-[#687B70] hover:bg-[#EAF7EF] hover:text-[#168548]"
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
        <div className="rounded-3xl border border-dashed border-[#DCE7DC] bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAF7EF] text-[#168548] border border-[#DCE7DC]">
            <SearchIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-[#1D2923]">
            No dishes matched your search
          </h2>
          <p className="mt-1.5 text-sm text-[#687B70] max-w-sm mx-auto font-medium">
            Try searching for another dish, ingredient, or view all items.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setActiveCategory("all");
            }}
            className="mt-5 rounded-full bg-[#168548] px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#11733D] transition cursor-pointer"
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
        className="fixed bottom-safe left-1/2 -translate-x-1/2 z-30 flex min-h-12 items-center gap-3.5 rounded-full bg-[#168548] px-5 py-3 text-sm font-semibold text-white shadow-xl border border-[#DDF5E8] backdrop-blur-md transition-all hover:bg-[#11733D] hover:scale-[1.02] active:scale-95 cursor-pointer"
        aria-label="View shopping cart"
      >
        <span className="flex h-6 min-w-6 px-1.5 items-center justify-center rounded-full bg-white text-xs font-bold text-[#168548] tabular-nums">
          {count}
        </span>
        <span className="tabular-nums font-semibold">
          {count ? `View order · ₹${subtotal.toFixed(2)}` : "View order"}
        </span>
        <ShoppingBagIcon className="h-4 w-4 text-white" />
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
          ? "bg-[#168548] text-white shadow-xs"
          : "border border-[#DCE7DC] bg-white text-[#687B70] hover:border-[#168548] hover:text-[#168548]"
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
      <div className="mb-4 flex items-baseline justify-between border-b border-[#DCE7DC] pb-2.5">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#1D2923]">
          {title}
        </h2>
        <span className="text-xs font-mono font-bold text-[#168548] uppercase tracking-wider">
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
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#DCE7DC] bg-white p-4 sm:p-5 shadow-2xs hover:shadow-md hover:border-[#168548]/40 transition-all duration-300">
      <div className="flex gap-4">
        {/* Text information */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Dietary & 3D Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {item.is_veg ? <VegBadge /> : <NonVegBadge />}
            {hasAR && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF7EF] border border-[#DCE7DC] px-2 py-0.5 text-[10px] font-mono font-bold text-[#168548] shadow-2xs">
                <SparklesIcon className="h-3 w-3 text-[#168548]" />
                <span>3D &amp; AR</span>
              </span>
            )}
          </div>

          <h3 className="font-serif font-bold text-base sm:text-lg text-[#1D2923] tracking-tight leading-snug group-hover:text-[#168548] transition-colors">
            {item.name}
          </h3>

          <div className="mt-1 text-sm sm:text-base font-extrabold text-[#168548] tabular-nums">
            ₹{Number(item.price).toFixed(2)}
          </div>

          {item.description && (
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#687B70] line-clamp-2 font-medium">
              {item.description}
            </p>
          )}
        </div>

        {/* Thumbnail Image */}
        <div
          onClick={onDetails}
          className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 overflow-hidden rounded-2xl bg-[#F7FAF5] border border-[#DCE7DC] shadow-2xs cursor-pointer group-hover:border-[#168548]/40 transition-colors"
        >
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              loading="lazy"
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#F7FAF5] to-[#EAF7EF] p-2 text-center text-[#687B70]">
              <span className="text-xl">🍽️</span>
              <span className="mt-1 text-[10px] font-semibold text-[#687B70]">
                Freshly made
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="mt-4 pt-3 border-t border-[#DCE7DC] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDetails}
            className="text-xs font-semibold text-[#687B70] hover:text-[#168548] transition-colors cursor-pointer"
          >
            View details
          </button>

          {hasAR && (
            <button
              type="button"
              onClick={onViewInAR}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#EAF7EF] hover:bg-[#DDF5E8] border border-[#DCE7DC] px-2.5 py-1 text-xs font-bold text-[#168548] transition-colors active:scale-95 cursor-pointer"
            >
              <ArCubeIcon className="h-3.5 w-3.5 text-[#168548]" />
              <span>View in AR</span>
            </button>
          )}
        </div>

        {/* Add Button & Stepper */}
        {quantity > 0 ? (
          <div className="inline-flex items-center rounded-xl bg-[#F7FAF5] border border-[#DCE7DC] shadow-2xs p-0.5">
            <button
              type="button"
              onClick={() => onChange(-1)}
              aria-label={`Remove one ${item.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#1D2923] shadow-2xs hover:bg-[#EAF7EF] active:scale-95 transition-all cursor-pointer"
            >
              <MinusIcon className="h-3 w-3" />
            </button>
            <span className="min-w-7 text-center text-xs font-bold text-[#168548] tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => onChange(1)}
              aria-label={`Add one ${item.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#168548] text-white shadow-2xs hover:bg-[#11733D] active:scale-95 transition-all cursor-pointer"
            >
              <PlusIcon className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            className="min-h-9 px-4 rounded-xl bg-[#168548] hover:bg-[#11733D] active:scale-95 text-white text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlusIcon className="h-3 w-3 text-[#DDF5E8]" />
            <span>Add</span>
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
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl transition-transform border border-[#DCE7DC]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Hero image area */}
        <div className="relative h-60 sm:h-72 w-full bg-[#17352A] overflow-hidden">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-[#F7FAF5] text-[#687B70]">
              <span className="text-4xl">🍽️</span>
              <span className="mt-2 text-xs font-semibold">Freshly prepared</span>
            </div>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md shadow-md hover:bg-black/70 transition cursor-pointer"
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
                <span className="text-xs font-semibold text-[#687B70]">
                  {item.is_veg ? "Vegetarian" : "Non-Vegetarian"}
                </span>
                {hasAR && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF7EF] border border-[#DCE7DC] px-2 py-0.5 text-[10px] font-mono font-bold text-[#168548]">
                    <SparklesIcon className="h-3 w-3 text-[#168548]" />
                    <span>3D Model Ready</span>
                  </span>
                )}
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1D2923] tracking-tight">
                {item.name}
              </h2>
            </div>

            <p className="text-xl font-extrabold text-[#168548] tabular-nums">
              ₹{Number(item.price).toFixed(2)}
            </p>
          </div>

          {item.description && (
            <p className="mt-4 text-sm leading-relaxed text-[#687B70] font-medium">
              {item.description}
            </p>
          )}

          {/* AR Call to Action */}
          {hasAR && (
            <button
              type="button"
              onClick={onViewInAR}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl border border-[#DCE7DC] bg-[#EAF7EF] hover:bg-[#DDF5E8] px-5 text-sm font-bold text-[#168548] shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
            >
              <ArCubeIcon className="h-4 w-4 text-[#168548]" />
              <span>Preview dish in 3D &amp; Augmented Reality</span>
            </button>
          )}

          {/* Bottom Action Footer */}
          <div className="mt-8 flex items-center gap-3 pt-4 border-t border-[#DCE7DC]">
            {quantity > 0 ? (
              <>
                <div className="flex items-center rounded-xl bg-[#F7FAF5] border border-[#DCE7DC] p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => onChange(-1)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#1D2923] shadow-2xs hover:bg-[#EAF7EF] cursor-pointer"
                  >
                    <MinusIcon className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-8 text-center text-sm font-bold text-[#168548] tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange(1)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#168548] text-white shadow-2xs hover:bg-[#11733D] cursor-pointer"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onOpenCart}
                  className="flex-1 min-h-11 rounded-xl bg-[#168548] px-5 text-sm font-bold text-white shadow-xs hover:bg-[#11733D] transition cursor-pointer"
                >
                  View in order
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onAdd}
                className="w-full min-h-11 rounded-xl bg-[#168548] px-5 text-sm font-bold text-white shadow-xs hover:bg-[#11733D] transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlusIcon className="h-4 w-4 text-[#DDF5E8]" />
                <span>Add to order</span>
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
        className="absolute bottom-0 left-0 right-0 max-h-[92vh] sm:bottom-0 sm:top-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-md sm:h-full bg-white rounded-t-3xl sm:rounded-l-3xl sm:rounded-r-none flex flex-col shadow-2xl border-l border-[#DCE7DC]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#DCE7DC] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#168548] text-white shadow-xs">
              <ShoppingBagIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="font-serif text-xl font-bold text-[#1D2923]">
                {checkout ? "Table Checkout" : "Your Order"}
              </h2>
              <p className="text-xs text-[#687B70] font-mono font-medium">
                {cart.length} {cart.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7FAF5] text-[#687B70] hover:bg-[#EAF7EF] hover:text-[#168548] cursor-pointer"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Cart Item List / Checkout Form */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="py-20 text-center">
              <span className="text-4xl">🛒</span>
              <p className="mt-3 text-base font-bold text-[#1D2923]">
                Your order is empty
              </p>
              <p className="mt-1 text-xs text-[#687B70] font-medium">
                Explore dishes from the menu and add your favorites.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 rounded-full bg-[#168548] px-5 py-2 text-xs font-semibold text-white hover:bg-[#11733D] cursor-pointer shadow-xs"
              >
                Browse menu
              </button>
            </div>
          ) : !checkout ? (
            <div className="divide-y divide-[#DCE7DC]">
              {cart.map((line) => (
                <div key={line.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex gap-3">
                    {/* Item Thumbnail */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F7FAF5] border border-[#DCE7DC]">
                      {line.image_url ? (
                        <img
                          src={line.image_url}
                          alt={line.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-[#687B70]">
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
                            <h4 className="truncate text-sm font-bold text-[#1D2923]">
                              {line.name}
                            </h4>
                          </div>
                          <p className="text-xs text-[#687B70] tabular-nums font-medium">
                            ₹{Number(line.price).toFixed(2)} each
                          </p>
                        </div>

                        <p className="text-sm font-extrabold text-[#168548] tabular-nums">
                          ₹{(Number(line.price) * line.quantity).toFixed(2)}
                        </p>
                      </div>

                      {/* Stepper & Note trigger */}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg bg-[#F7FAF5] border border-[#DCE7DC] p-0.5">
                          <button
                            type="button"
                            onClick={() => onChange(line.id, -1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-[#1D2923] shadow-2xs hover:bg-[#EAF7EF] cursor-pointer"
                          >
                            <MinusIcon className="h-2.5 w-2.5" />
                          </button>
                          <span className="min-w-6 text-center text-xs font-bold text-[#168548] tabular-nums">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onChange(line.id, 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-[#168548] text-white shadow-2xs hover:bg-[#11733D] cursor-pointer"
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
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#687B70] hover:text-[#168548] cursor-pointer"
                          >
                            <NoteIcon className="h-3 w-3" />
                            <span>{line.notes ? "Edit note" : "Add note"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onRemove(line.id)}
                            aria-label={`Remove ${line.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#687B70] hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
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
                            placeholder="Special preparation requests..."
                            className="w-full rounded-xl border border-[#DCE7DC] bg-[#F7FAF5] px-3 py-1.5 text-xs text-[#1D2923] placeholder:text-[#687B70]/60 outline-none focus:border-[#168548] focus:bg-white"
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
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#168548] hover:underline cursor-pointer"
              >
                ← Review order items
              </button>

              <div className="rounded-2xl border border-[#DCE7DC] bg-[#F7FAF5] p-4 space-y-3">
                <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#168548]">
                  Guest Information
                </p>

                <label className="block">
                  <span className="block text-xs font-semibold text-[#1D2923] mb-1">
                    Your Name (optional)
                  </span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => onCustomerName(event.target.value)}
                    placeholder="Enter your name"
                    className="w-full rounded-xl border border-[#DCE7DC] bg-white px-3.5 py-2.5 text-base sm:text-sm text-[#1D2923] outline-none focus:border-[#168548] focus:ring-2 focus:ring-[#168548]/10"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-semibold text-[#1D2923] mb-1">
                    Kitchen Notes (optional)
                  </span>
                  <textarea
                    value={orderNotes}
                    onChange={(event) => onOrderNotes(event.target.value)}
                    placeholder="Special requests or dietary preferences..."
                    rows={2}
                    className="w-full resize-none rounded-xl border border-[#DCE7DC] bg-white px-3.5 py-2 text-base sm:text-sm text-[#1D2923] outline-none focus:border-[#168548] focus:ring-2 focus:ring-[#168548]/10"
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
          <div className="border-t border-[#DCE7DC] bg-[#F7FAF5] p-6 space-y-3">
            <div className="space-y-1.5 text-xs text-[#687B70] font-medium">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="tabular-nums font-semibold text-[#1D2923]">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#1D2923] pt-1 border-t border-[#DCE7DC]">
                <span>Total Amount</span>
                <span className="tabular-nums text-[#168548]">
                  ₹{subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            {!checkout ? (
              <button
                type="button"
                onClick={onCheckout}
                className="w-full min-h-12 rounded-xl bg-[#168548] hover:bg-[#11733D] active:scale-[0.99] text-sm font-semibold text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Checkout</span>
                <span className="text-xs text-white/50">·</span>
                <span className="tabular-nums font-semibold">
                  ₹{subtotal.toFixed(2)}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPlaceOrder}
                disabled={saving}
                className="w-full min-h-12 rounded-xl bg-[#168548] hover:bg-[#11733D] active:scale-[0.99] disabled:opacity-60 text-sm font-semibold text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Dispatching order to kitchen...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Send to Kitchen</span>
                    <span className="text-xs text-white/50">·</span>
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
