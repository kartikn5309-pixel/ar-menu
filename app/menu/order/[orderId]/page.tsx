"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Order = { order_id: string; order_number: string; restaurant_id: string; table_id: string; restaurant_name: string; table_name: string; total: number; status: string; created_at: string; items: { item_name: string; unit_price: number; quantity: number; line_total: number }[] };
type SavedOrder = { order_id: string; access_token: string };
type OrderState = { order?: Order; error?: string; removeFromStorage?: boolean };
const ORDER_STORAGE_KEY = "ar-menu-orders";

function readSavedOrders(orderId: string, urlToken: string | null): SavedOrder[] {
  let stored: SavedOrder[] = [];
  if (typeof window !== "undefined") {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(ORDER_STORAGE_KEY) ?? "[]") as unknown;
      if (Array.isArray(parsed)) {
        stored = parsed.filter((entry): entry is SavedOrder => {
          if (!entry || typeof entry !== "object") return false;
          const candidate = entry as Partial<SavedOrder>;
          return typeof candidate.order_id === "string" && typeof candidate.access_token === "string";
        });
      }
    } catch {
    }
  }
  const current = urlToken ? { order_id: orderId, access_token: urlToken } : stored.find((entry) => entry.order_id === orderId);
  return current ? [current, ...stored.filter((entry) => entry.order_id !== orderId)] : stored;
}

export default function OrderStatusPage({ params }: { params: Promise<{ orderId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orderId } = use(params);
  const urlToken = searchParams.get("token");
  const [savedOrders] = useState(() => readSavedOrders(orderId, urlToken));
  const [orderStates, setOrderStates] = useState<Record<string, OrderState>>({});
  const [selectedOrderId, setSelectedOrderId] = useState(orderId);

  useEffect(() => {
    if (!savedOrders.length) return;
    let cancelled = false;

    async function loadOrders() {
      const results = await Promise.all(savedOrders.map(async (savedOrder) => {
        try {
          const response = await fetch(`/api/order-status?orderId=${encodeURIComponent(savedOrder.order_id)}&token=${encodeURIComponent(savedOrder.access_token)}`, { cache: "no-store" });
          const result = await response.json() as { order?: Order; error?: string };
          return [savedOrder.order_id, response.ok && result.order ? { order: result.order } : { error: result.error ?? "Order status is unavailable.", removeFromStorage: true }] as const;
        } catch {
          return [savedOrder.order_id, { error: "Order status is unavailable.", removeFromStorage: false }] as const;
        }
      }));
      if (cancelled) return;
      const nextStates = Object.fromEntries(results) as Record<string, OrderState>;
      setOrderStates(nextStates);
      const invalidIds = results.filter(([, state]) => state.removeFromStorage).map(([id]) => id);
      if (invalidIds.length) {
        try {
          const valid = savedOrders.filter((entry) => !invalidIds.includes(entry.order_id));
          window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(valid));
        } catch {
        }
      }
    }

    void loadOrders();
    const timer = window.setInterval(() => void loadOrders(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [savedOrders]);

  const selectedState = orderStates[selectedOrderId];
  const selectedOrder = selectedState?.order;
  const selectedEntry = savedOrders.find((entry) => entry.order_id === selectedOrderId);
  const currentEntry = savedOrders.find((entry) => entry.order_id === orderId);

  if (!urlToken && !currentEntry) return <Message title="Order status unavailable" message="This order status link is incomplete." />;
  if (!selectedEntry || !selectedOrder && !selectedState?.error) return <Message title="Loading your order" message="Please wait while we retrieve your order." />;
  if (!selectedOrder) return <Message title="Order status unavailable" message={selectedState?.error ?? "Order status is unavailable."} />;
  return <main className="min-h-screen bg-[#fffaf5] px-5 py-8 text-slate-900 sm:px-8 sm:py-12"><section className="mx-auto max-w-2xl rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-10"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">Order placed successfully</p><h1 className="mt-3 text-3xl font-bold">{selectedOrder.order_number}</h1><p className="mt-2 text-slate-500">{selectedOrder.restaurant_name} · {selectedOrder.table_name}</p><p className="mt-1 text-slate-500">Your order has been sent to the restaurant.</p><div className="mt-8 rounded-2xl bg-orange-50 p-5"><p className="text-sm text-orange-700">Current status</p><p className="mt-1 text-2xl font-bold capitalize text-orange-900">{selectedOrder.status}</p></div><div className="mt-8 space-y-3">{selectedOrder.items.map((item) => <div key={`${item.item_name}-${item.quantity}`} className="flex justify-between gap-4 border-b pb-3 text-sm"><span>{item.quantity} × {item.item_name}</span><span className="font-semibold">₹{Number(item.line_total).toFixed(2)}</span></div>)}</div><div className="mt-5 flex justify-between text-lg font-bold"><span>Total</span><span className="text-orange-600">₹{Number(selectedOrder.total).toFixed(2)}</span></div>{selectedOrder.restaurant_id && selectedOrder.table_id && <button type="button" onClick={() => router.push(`/menu/${selectedOrder.restaurant_id}/${selectedOrder.table_id}`)} className="mt-6 w-full rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 sm:w-auto">Order More</button>}<div className="mt-8 border-t pt-6"><h2 className="text-lg font-bold">My Orders</h2><div className="mt-3 space-y-2">{savedOrders.map((savedOrder) => <button key={savedOrder.order_id} onClick={() => setSelectedOrderId(savedOrder.order_id)} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${savedOrder.order_id === selectedOrderId ? "border-orange-300 bg-orange-50" : "border-slate-200 hover:border-orange-200"}`}><span><span className="block font-semibold">{orderStates[savedOrder.order_id]?.order?.order_number ?? `#${savedOrder.order_id.slice(0, 6)}`}</span><span className="text-sm capitalize text-slate-500">{orderStates[savedOrder.order_id]?.order?.status ?? orderStates[savedOrder.order_id]?.error ?? "Loading..."}</span></span><span className="font-semibold">{orderStates[savedOrder.order_id]?.order ? `₹${Number(orderStates[savedOrder.order_id].order?.total).toFixed(2)}` : ""}</span></button>)}</div></div><p className="mt-8 text-center text-sm text-slate-400">Status updates refresh automatically.</p></section></main>;
}

function Message({ title, message }: { title: string; message: string }) { return <main className="flex min-h-screen items-center justify-center bg-[#fffaf5] px-5 text-center text-slate-900"><section className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-8 shadow-sm"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-3 leading-7 text-slate-500">{message}</p></section></main>; }