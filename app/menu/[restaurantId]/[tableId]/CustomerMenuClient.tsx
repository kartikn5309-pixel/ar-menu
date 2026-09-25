"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ARViewer from "@/components/ar/ARViewer";

type MenuItem = { id: string; category_id: string | null; name: string; description: string | null; price: number; image_url: string | null; model_url: string | null; has_3d_model: boolean; is_veg: boolean };
type Category = { id: string; name: string };
type CartLine = MenuItem & { quantity: number; notes: string };
type OrderResult = { order_id: string; access_token: string };
const ORDER_STORAGE_KEY = "ar-menu-orders";

export default function CustomerMenuClient({ restaurantId, tableId, items, categories }: { restaurantId: string; tableId: string; items: MenuItem[]; categories: Category[] }) {
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
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart]);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const normalizedSearch = search.trim().toLowerCase();
  const matchesSearch = (item: MenuItem) => !normalizedSearch || `${item.name} ${item.description ?? ""}`.toLowerCase().includes(normalizedSearch);
  const filteredItems = items.filter((item) => (activeCategory === "all" || item.category_id === activeCategory) && matchesSearch(item));
  const grouped = categories.map((category) => ({ category, items: filteredItems.filter((item) => item.category_id === category.id) })).filter((group) => group.items.length > 0);
  const uncategorized = filteredItems.filter((item) => !item.category_id || !categories.some((category) => category.id === item.category_id));

  function add(item: MenuItem) {
    setCart((current) => {
      const existing = current.find((line) => line.id === item.id);
      return existing ? current.map((line) => line.id === item.id ? { ...line, quantity: line.quantity + 1 } : line) : [...current, { ...item, quantity: 1, notes: "" }];
    });
  }

  function changeQuantity(id: string, delta: number) {
    setCart((current) => current.flatMap((line) => {
      if (line.id !== id) return [line];
      if (line.quantity + delta <= 0) return [];
      return [{ ...line, quantity: line.quantity + delta }];
    }));
  }

  function updateItemNotes(id: string, notes: string) {
    setCart((current) => current.map((line) => line.id === id ? { ...line, notes } : line));
  }

  async function placeOrder() {
    if (!cart.length) return;
    setSaving(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("place_guest_order", {
      p_restaurant_id: restaurantId,
      p_table_id: tableId,
      p_items: cart.map((item) => ({ menu_item_id: item.id, quantity: item.quantity, notes: item.notes })),
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
      const stored = JSON.parse(window.localStorage.getItem(ORDER_STORAGE_KEY) ?? "[]") as unknown;
      const orders = Array.isArray(stored) ? stored.filter((entry): entry is OrderResult => {
        if (!entry || typeof entry !== "object") return false;
        const candidate = entry as Partial<OrderResult>;
        return typeof candidate.order_id === "string" && typeof candidate.access_token === "string";
      }).filter((entry, index, entries) => entries.findIndex((candidate) => candidate.order_id === entry.order_id) === index) : [];
      const nextOrders = orders.some((entry) => entry.order_id === result.order_id) ? orders : [...orders, result];
      window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(nextOrders));
    } catch {
    }
    router.push(`/menu/order/${result.order_id}?token=${encodeURIComponent(result.access_token)}`);
  }

  return <>
    <div className="sticky top-0 z-10 -mx-5 mb-8 border-b border-slate-200/80 bg-[#fbfaf7]/95 px-5 pb-4 pt-2 backdrop-blur sm:-mx-8 sm:px-8">
      <label className="flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100/70">
        <span className="text-xl text-slate-400" aria-hidden="true">⌕</span>
        <span className="sr-only">Search the menu</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dishes, ingredients..." className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
        {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-slate-400 hover:bg-slate-100">×</button>}
      </label>
      {categories.length > 0 && <nav aria-label="Menu categories" className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pt-4 sm:-mx-8 sm:px-8">
        <CategoryButton active={activeCategory === "all"} onClick={() => setActiveCategory("all")}>All dishes</CategoryButton>
        {categories.map((category) => <CategoryButton key={category.id} active={activeCategory === category.id} onClick={() => setActiveCategory(category.id)}>{category.name}</CategoryButton>)}
      </nav>}
    </div>

    {filteredItems.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-2xl text-orange-500">⌕</div><h2 className="mt-5 text-xl font-bold">Nothing matched that search</h2><p className="mt-2 text-sm text-slate-500">Try another dish, ingredient, or category.</p><button onClick={() => { setSearch(""); setActiveCategory("all"); }} className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Show all dishes</button></div> : <div className="space-y-11">
      {grouped.map(({ category, items: categoryItems }) => <MenuSection key={category.id} title={category.name} items={categoryItems} cart={cart} onAdd={add} onChange={changeQuantity} onOpenCart={() => setShowCart(true)} onDetails={setSelectedItem} />)}
      {uncategorized.length > 0 && <MenuSection title="More to explore" items={uncategorized} cart={cart} onAdd={add} onChange={changeQuantity} onOpenCart={() => setShowCart(true)} onDetails={setSelectedItem} />}
    </div>}

    <button onClick={() => setShowCart(true)} className="fixed bottom-5 left-1/2 z-20 flex min-h-14 -translate-x-1/2 items-center gap-4 rounded-full bg-slate-950 px-5 text-sm font-bold text-white shadow-2xl shadow-slate-950/25 transition-transform hover:scale-[1.02] active:scale-95">
      <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-orange-500 px-2 text-xs">{count}</span><span>{count ? `View cart · ₹${subtotal.toFixed(2)}` : "View cart"}</span>
    </button>
    {selectedItem && <ItemDetails item={selectedItem} quantity={cart.find((line) => line.id === selectedItem.id)?.quantity ?? 0} onClose={() => setSelectedItem(null)} onAdd={() => add(selectedItem)} onChange={(delta) => changeQuantity(selectedItem.id, delta)} onOpenCart={() => { setSelectedItem(null); setShowCart(true); }} onViewInAR={() => { setSelectedItem(null); setArItem(selectedItem); }} />}
    {arItem?.has_3d_model && arItem.model_url && <ARViewer modelUrl={arItem.model_url} itemName={arItem.name} poster={arItem.image_url} onClose={() => setArItem(null)} />}
    {showCart && <CartDrawer cart={cart} subtotal={subtotal} checkout={checkout} customerName={customerName} orderNotes={orderNotes} saving={saving} error={error} onClose={() => setShowCart(false)} onChange={changeQuantity} onRemove={(id) => setCart((current) => current.filter((line) => line.id !== id))} onItemNotes={updateItemNotes} onCheckout={() => setCheckout(true)} onCustomerName={setCustomerName} onOrderNotes={setOrderNotes} onPlaceOrder={placeOrder} />}
  </>;
}

function CategoryButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${active ? "bg-orange-500 text-white shadow-md shadow-orange-200" : "border border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-600"}`}>{children}</button>;
}

function MenuSection({ title, items, cart, onAdd, onChange, onOpenCart, onDetails }: { title: string; items: MenuItem[]; cart: CartLine[]; onAdd: (item: MenuItem) => void; onChange: (id: string, delta: number) => void; onOpenCart: () => void; onDetails: (item: MenuItem) => void }) {
  return <section><div className="mb-5 flex items-end justify-between border-b border-slate-200 pb-3"><h2 className="text-2xl font-bold tracking-tight">{title}</h2><span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{items.length} {items.length === 1 ? "dish" : "dishes"}</span></div><div className="grid gap-4 md:grid-cols-2">{items.map((item) => <MenuItemCard key={item.id} item={item} quantity={cart.find((line) => line.id === item.id)?.quantity ?? 0} onAdd={() => onAdd(item)} onChange={(delta) => onChange(item.id, delta)} onOpenCart={onOpenCart} onDetails={() => onDetails(item)} />)}</div></section>;
}

function MenuItemCard({ item, quantity, onAdd, onChange, onOpenCart, onDetails }: { item: MenuItem; quantity: number; onAdd: () => void; onChange: (delta: number) => void; onOpenCart: () => void; onDetails: () => void }) {
  return <article className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-lg hover:shadow-slate-200/60"><div className="flex min-h-44 gap-4 p-4 sm:min-h-48 sm:p-5"><div className="flex min-w-0 flex-1 flex-col"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-bold leading-6 sm:text-lg">{item.name}</h3>{item.is_veg && <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Vegetarian</span>}</div><p className="shrink-0 font-bold text-orange-600">₹{Number(item.price).toFixed(2)}</p></div>{item.description && <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{item.description}</p>}<div className="mt-auto flex items-center gap-3 pt-4"><button onClick={onDetails} className="text-sm font-semibold text-slate-500 underline decoration-slate-300 underline-offset-4 hover:text-orange-600">View details</button>{quantity > 0 ? <div className="ml-auto flex items-center gap-3"><button onClick={() => onChange(-1)} aria-label={`Remove one ${item.name}`} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-lg font-semibold hover:border-orange-400">−</button><span className="min-w-4 text-center font-bold">{quantity}</span><button onClick={() => onChange(1)} aria-label={`Add one ${item.name}`} className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-lg font-semibold text-white">+</button><button onClick={onOpenCart} className="sr-only">View cart</button></div> : <button onClick={onAdd} className="ml-auto min-h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-orange-500">Add to cart</button>}</div></div><div className={`h-28 w-28 shrink-0 overflow-hidden rounded-2xl sm:h-32 sm:w-32 ${item.image_url ? "bg-cover bg-center" : "bg-[radial-gradient(circle_at_30%_20%,#fed7aa,#fff7ed_55%,#f1f5f9)]"}`} role={item.image_url ? "img" : undefined} aria-label={item.image_url ? item.name : undefined} style={item.image_url ? { backgroundImage: `url("${item.image_url}")` } : undefined}>{!item.image_url && <span className="flex h-full items-end p-3 text-xs font-semibold text-orange-700/60">Freshly made</span>}</div></div></article>;
}

function ItemDetails({ item, quantity, onClose, onAdd, onChange, onOpenCart, onViewInAR }: { item: MenuItem; quantity: number; onClose: () => void; onAdd: () => void; onChange: (delta: number) => void; onOpenCart: () => void; onViewInAR: () => void }) {
  return <div className="fixed inset-0 z-30 bg-slate-950/50 p-4 backdrop-blur-sm" onClick={onClose}><section role="dialog" aria-modal="true" aria-label={`${item.name} details`} className="mx-auto mt-[10vh] max-h-[80vh] max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}><div className={`relative h-52 ${item.image_url ? "bg-cover bg-center" : "bg-[radial-gradient(circle_at_30%_20%,#fed7aa,#fff7ed_55%,#f1f5f9)]"}`} style={item.image_url ? { backgroundImage: `url("${item.image_url}")` } : undefined}><button onClick={onClose} aria-label="Close details" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-xl text-slate-700 shadow">×</button></div><div className="p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-bold">{item.name}</h2>{item.is_veg && <p className="mt-2 text-sm font-semibold text-emerald-700">Vegetarian</p>}</div><p className="text-lg font-bold text-orange-600">₹{Number(item.price).toFixed(2)}</p></div>{item.description && <p className="mt-5 leading-7 text-slate-600">{item.description}</p>}{item.has_3d_model && item.model_url && <button type="button" onClick={onViewInAR} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-5 text-sm font-bold text-orange-700 hover:bg-orange-100"><span aria-hidden="true">◈</span> View in AR</button>}<div className="mt-7 flex items-center gap-3">{quantity > 0 && <><button onClick={() => onChange(-1)} className="flex h-11 w-11 items-center justify-center rounded-xl border text-lg">−</button><span className="min-w-5 text-center font-bold">{quantity}</span><button onClick={() => onChange(1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-lg text-white">+</button></>}{quantity === 0 ? <button onClick={onAdd} className="min-h-11 flex-1 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white">Add to cart</button> : <button onClick={onOpenCart} className="ml-auto min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white">View cart</button>}</div></div></section></div>;
}

function CartDrawer({ cart, subtotal, checkout, customerName, orderNotes, saving, error, onClose, onChange, onRemove, onItemNotes, onCheckout, onCustomerName, onOrderNotes, onPlaceOrder }: { cart: CartLine[]; subtotal: number; checkout: boolean; customerName: string; orderNotes: string; saving: boolean; error: string; onClose: () => void; onChange: (id: string, delta: number) => void; onRemove: (id: string) => void; onItemNotes: (id: string, notes: string) => void; onCheckout: () => void; onCustomerName: (value: string) => void; onOrderNotes: (value: string) => void; onPlaceOrder: () => void }) {
  return <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm" onClick={onClose}><aside className="absolute bottom-0 left-0 right-0 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:bottom-auto sm:left-auto sm:top-0 sm:h-full sm:w-full sm:max-w-md sm:rounded-none sm:rounded-l-3xl sm:p-7" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">Your order</p><h2 className="mt-1 text-2xl font-bold">Cart</h2></div><button onClick={onClose} aria-label="Close cart" className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">×</button></div>{cart.length === 0 ? <p className="py-16 text-center text-sm text-slate-500">Your cart is empty.</p> : <><div className="mt-7 space-y-5">{cart.map((line) => <div key={line.id} className="border-b border-slate-100 pb-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{line.name}</p><p className="mt-1 text-sm text-slate-500">₹{Number(line.price).toFixed(2)} each</p></div><p className="font-semibold">₹{(Number(line.price) * line.quantity).toFixed(2)}</p></div><div className="mt-3 flex items-center gap-3"><button onClick={() => onChange(line.id, -1)} className="flex h-9 w-9 items-center justify-center rounded-lg border text-lg">−</button><span className="min-w-4 text-center font-semibold">{line.quantity}</span><button onClick={() => onChange(line.id, 1)} className="flex h-9 w-9 items-center justify-center rounded-lg border text-lg">+</button><button onClick={() => onRemove(line.id)} className="ml-auto text-sm font-semibold text-red-500">Remove</button></div><label className="mt-3 block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Item notes</span><textarea value={line.notes} onChange={(event) => onItemNotes(line.id, event.target.value)} placeholder="e.g. No onions, extra spicy" rows={2} className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label></div>)}</div><div className="mt-6 space-y-2 border-t border-slate-200 pt-5 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div><div className="flex justify-between text-lg font-bold"><span>Total</span><span>₹{subtotal.toFixed(2)}</span></div></div>{!checkout ? <button onClick={onCheckout} className="mt-6 min-h-12 w-full rounded-xl bg-slate-950 text-sm font-bold text-white hover:bg-orange-500">Continue to checkout</button> : <div className="mt-6 space-y-4"><input value={customerName} onChange={(event) => onCustomerName(event.target.value)} placeholder="Your name (optional)" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400" /><textarea value={orderNotes} onChange={(event) => onOrderNotes(event.target.value)} placeholder="Order notes (optional)" rows={3} className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-400" />{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button onClick={onPlaceOrder} disabled={saving} className="min-h-12 w-full rounded-xl bg-orange-500 text-sm font-bold text-white disabled:opacity-60">{saving ? "Sending order..." : "Place order · ₹" + subtotal.toFixed(2)}</button></div>}</>}</aside></div>;
}
