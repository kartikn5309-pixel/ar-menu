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
  const statusStages = [
    { key: "pending", label: "Received" },
    { key: "confirmed", label: "Confirmed" },
    { key: "preparing", label: "Preparing" },
    { key: "ready", label: "Ready to Serve" },
    { key: "completed", label: "Completed" },
  ];

  const currentStageIndex = statusStages.findIndex(
    (s) => s.key === selectedOrder.status
  );

  return (
    <main className="min-h-screen bg-[#faf9f5] px-4 py-8 text-zinc-900 sm:px-8 sm:py-12">
      <section className="mx-auto max-w-2xl rounded-3xl border border-stone-200 bg-white p-6 shadow-xl sm:p-10">
        {/* Order Success Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-5">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Order Placed Successfully
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
              {selectedOrder.order_number}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-zinc-500">
              {selectedOrder.restaurant_name} · {selectedOrder.table_name}
            </p>
          </div>

          <div className="hidden sm:block text-right">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Time Placed
            </span>
            <span className="text-xs font-bold text-zinc-700">
              {new Date(selectedOrder.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Live Visual Status Tracker */}
        <div className="mt-6 rounded-2xl border border-stone-200/90 bg-stone-50/70 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Kitchen Status
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wide rounded-full px-2.5 py-0.5 bg-orange-100 text-orange-800">
              {selectedOrder.status}
            </span>
          </div>

          {/* Stepper Dots & Line */}
          {selectedOrder.status !== "cancelled" ? (
            <div className="relative mt-2">
              <div className="flex justify-between items-center relative z-10">
                {statusStages.map((stage, idx) => {
                  const isCompleted =
                    currentStageIndex >= 0 && idx <= currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div
                      key={stage.key}
                      className="flex flex-col items-center text-center flex-1"
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all shadow-xs ${
                          isCompleted
                            ? "bg-orange-600 text-white"
                            : "bg-white border-2 border-stone-300 text-stone-400"
                        } ${isCurrent ? "ring-4 ring-orange-200 scale-110" : ""}`}
                      >
                        {isCompleted && !isCurrent ? "✓" : idx + 1}
                      </div>
                      <span
                        className={`mt-2 text-[10px] sm:text-xs font-semibold max-w-[70px] ${
                          isCompleted ? "text-zinc-900" : "text-stone-400"
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-center text-xs font-semibold text-rose-700">
              This order has been cancelled. Please contact a team member for assistance.
            </div>
          )}
        </div>

        {/* Order Receipt Breakdown */}
        <div className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
            Itemized Receipt
          </h2>
          <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200/80 bg-white px-4">
            {selectedOrder.items.map((item, idx) => (
              <div
                key={`${item.item_name}-${idx}`}
                className="flex items-center justify-between py-3.5 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-stone-100 text-xs font-bold text-zinc-700 tabular-nums">
                    {item.quantity}×
                  </span>
                  <span className="font-semibold text-zinc-900">
                    {item.item_name}
                  </span>
                </div>
                <span className="font-bold text-zinc-900 tabular-nums">
                  ₹{Number(item.line_total).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between px-2 text-base font-extrabold text-zinc-900">
            <span>Total Paid / Payable</span>
            <span className="text-xl font-black text-orange-600 tabular-nums">
              ₹{Number(selectedOrder.total).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action: Order More dishes */}
        {selectedOrder.restaurant_id && selectedOrder.table_id && (
          <div className="mt-8 pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-zinc-500">
                Want to add more appetizers, drinks, or desserts?
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                router.push(
                  `/menu/${selectedOrder.restaurant_id}/${selectedOrder.table_id}`
                )
              }
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 hover:bg-orange-600 active:scale-95 text-white px-6 py-3.5 text-sm font-bold shadow-xs transition-all cursor-pointer"
            >
              <span>+ Order More Dishes</span>
            </button>
          </div>
        )}

        {/* Previous Orders Switcher */}
        {savedOrders.length > 1 && (
          <div className="mt-8 border-t border-stone-100 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Orders from this session
            </h3>
            <div className="space-y-2">
              {savedOrders.map((savedOrder) => (
                <button
                  key={savedOrder.order_id}
                  onClick={() => setSelectedOrderId(savedOrder.order_id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all ${
                    savedOrder.order_id === selectedOrderId
                      ? "border-orange-500 bg-orange-50/50 shadow-xs"
                      : "border-stone-200 hover:border-stone-300 bg-white"
                  }`}
                >
                  <div>
                    <span className="block text-sm font-bold text-zinc-900">
                      {orderStates[savedOrder.order_id]?.order?.order_number ??
                        `#${savedOrder.order_id.slice(0, 6)}`}
                    </span>
                    <span className="text-xs capitalize text-zinc-500">
                      {orderStates[savedOrder.order_id]?.order?.status ??
                        orderStates[savedOrder.order_id]?.error ??
                        "Checking status..."}
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-zinc-900 tabular-nums">
                    {orderStates[savedOrder.order_id]?.order
                      ? `₹${Number(
                          orderStates[savedOrder.order_id].order?.total
                        ).toFixed(2)}`
                      : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs font-medium text-stone-400">
          Live kitchen status refreshes automatically every 15 seconds.
        </p>
      </section>
    </main>
  );
}

function Message({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf9f5] px-5 text-center text-zinc-900">
      <section className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 shadow-xl">
        <h1 className="text-xl font-bold text-zinc-900">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-500">{message}</p>
      </section>
    </main>
  );
}