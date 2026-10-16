"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

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
  if (!selectedEntry || !selectedOrder && !selectedState?.error) return <LoadingIndicator fullScreen message="Retrieving your dining order status..." />;
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
    <main className="min-h-screen bg-[#F7FAF5] px-4 py-8 text-[#1D2923] sm:px-8 sm:py-14">
      <section className="mx-auto max-w-2xl rounded-3xl border border-[#DCE7DC] bg-white p-6 shadow-sm sm:p-10">
        {/* Order Success Header */}
        <div className="flex items-center justify-between border-b border-[#DCE7DC] pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF7EF] border border-[#DCE7DC] px-3.5 py-1 text-xs font-bold text-[#168548]">
              <span className="h-2 w-2 rounded-full bg-[#168548] animate-pulse" />
              Order Placed Successfully
            </span>
            <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#1D2923]">
              {selectedOrder.order_number}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#687B70] font-medium">
              {selectedOrder.restaurant_name} · <span className="font-semibold text-[#1D2923]">{selectedOrder.table_name}</span>
            </p>
          </div>

          <div className="hidden sm:block text-right">
            <span className="text-[11px] font-bold text-[#687B70] uppercase tracking-wider block">
              Time Placed
            </span>
            <span className="text-xs font-bold text-[#1D2923]">
              {new Date(selectedOrder.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Live Visual Status Tracker */}
        <div className="mt-7 rounded-2xl border border-[#DCE7DC] bg-[#F7FAF5] p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#687B70]">
              Kitchen Preparation Status
            </span>
            <span className="text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1 bg-[#168548] text-white">
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
                        className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-xs font-bold transition-all shadow-xs ${
                          isCompleted
                            ? "bg-[#168548] text-white"
                            : "bg-white border-2 border-[#DCE7DC] text-[#687B70]"
                        } ${isCurrent ? "ring-4 ring-[#168548]/20 scale-110 border-[#168548]" : ""}`}
                      >
                        {isCompleted && !isCurrent ? "✓" : idx + 1}
                      </div>
                      <span
                        className={`mt-2 text-[10px] sm:text-xs font-semibold max-w-[70px] ${
                          isCompleted ? "text-[#168548]" : "text-[#687B70]"
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
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#687B70] mb-3">
            Itemized Receipt
          </h2>
          <div className="divide-y divide-[#DCE7DC] rounded-2xl border border-[#DCE7DC] bg-white px-4 sm:px-5">
            {selectedOrder.items.map((item, idx) => (
              <div
                key={`${item.item_name}-${idx}`}
                className="flex items-center justify-between py-3.5 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F7FAF5] border border-[#DCE7DC] text-xs font-bold text-[#1D2923] tabular-nums">
                    {item.quantity}×
                  </span>
                  <span className="font-semibold text-[#1D2923]">
                    {item.item_name}
                  </span>
                </div>
                <span className="font-bold text-[#168548] tabular-nums">
                  ₹{Number(item.line_total).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between px-2 text-base font-bold text-[#1D2923]">
            <span className="text-[#687B70]">Total Paid / Payable</span>
            <span className="text-xl sm:text-2xl font-black text-[#168548] tabular-nums">
              ₹{Number(selectedOrder.total).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action: Order More dishes */}
        {selectedOrder.restaurant_id && selectedOrder.table_id && (
          <div className="mt-8 pt-6 border-t border-[#DCE7DC] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#687B70]">
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#168548] hover:bg-[#11733D] active:scale-95 text-white px-6 py-3.5 text-sm font-semibold shadow-sm transition-all cursor-pointer"
            >
              <span>+ Order More Dishes</span>
            </button>
          </div>
        )}

        {/* Previous Orders Switcher */}
        {savedOrders.length > 1 && (
          <div className="mt-8 border-t border-[#DCE7DC] pt-6">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#687B70] mb-3">
              Orders from this session
            </h3>
            <div className="space-y-2">
              {savedOrders.map((savedOrder) => (
                <button
                  key={savedOrder.order_id}
                  onClick={() => setSelectedOrderId(savedOrder.order_id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all cursor-pointer ${
                    savedOrder.order_id === selectedOrderId
                      ? "border-[#168548] bg-[#EAF7EF]/60 shadow-xs"
                      : "border-[#DCE7DC] hover:border-[#168548]/40 bg-white"
                  }`}
                >
                  <div>
                    <span className="block text-sm font-bold text-[#1D2923]">
                      {orderStates[savedOrder.order_id]?.order?.order_number ??
                        `#${savedOrder.order_id.slice(0, 6)}`}
                    </span>
                    <span className="text-xs capitalize text-[#687B70] font-medium">
                      {orderStates[savedOrder.order_id]?.order?.status ??
                        orderStates[savedOrder.order_id]?.error ??
                        "Checking status..."}
                    </span>
                  </div>
                  <span className="text-sm font-extrabold text-[#168548] tabular-nums">
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

        <p className="mt-8 text-center text-[11px] font-medium text-[#687B70]">
          Live kitchen status refreshes automatically every 15 seconds.
        </p>
      </section>
    </main>
  );
}

function Message({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7FAF5] px-5 text-center text-[#1D2923]">
      <section className="w-full max-w-md rounded-3xl border border-[#DCE7DC] bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-[#1D2923]">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#687B70] font-medium">{message}</p>
      </section>
    </main>
  );
}