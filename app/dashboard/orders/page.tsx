"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  SearchIcon,
  ReceiptIcon,
  CloseIcon,
  RefreshCwIcon,
} from "@/components/ui/Icons";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

type OrderItem = {
  item_name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
  line_total: number;
};

type Order = {
  id: string;
  order_number: string;
  table_id: string;
  customer_name: string | null;
  notes: string | null;
  subtotal: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  items: OrderItem[];
};

type RawOrder = Omit<Order, "items"> & { order_items: OrderItem[] };
type OrderNotification = { id: string; order: Order; tableName: string };

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

const statusActions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed"],
  completed: [],
  cancelled: [],
};

const statusColors: Record<OrderStatus, { bg: string; text: string; border: string }> = {
  pending: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  confirmed: { bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
  preparing: { bg: "bg-orange-50", text: "text-orange-800", border: "border-orange-200" },
  ready: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  cancelled: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [tableNames, setTableNames] = useState<Record<string, string>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  async function loadOrders(showLoading: boolean) {
    if (showLoading) setLoading(true);
    setError("");

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", authData.user.id)
      .maybeSingle();

    if (restaurantError || !restaurant) {
      setError(restaurantError?.message ?? "Restaurant not found.");
      setLoading(false);
      return;
    }

    setRestaurantId(restaurant.id);

    const [orderResult, tableResult] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, order_number, table_id, customer_name, notes, subtotal, total, status, created_at, order_items(item_name, quantity, unit_price, notes, line_total)"
        )
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("restaurant_tables")
        .select("id, table_number, name")
        .eq("restaurant_id", restaurant.id),
    ]);

    if (orderResult.error || tableResult.error) {
      setError(
        orderResult.error?.message ??
          tableResult.error?.message ??
          "Could not load orders."
      );
      setLoading(false);
      return;
    }

    const nextOrders = ((orderResult.data ?? []) as unknown as RawOrder[]).map(
      (order) => ({
        ...order,
        items: order.order_items ?? [],
      })
    );

    setTableNames(
      Object.fromEntries(
        (tableResult.data ?? []).map((table) => [
          table.id,
          table.name || `Table ${table.table_number}`,
        ])
      )
    );
    setOrders(nextOrders);
    setSelectedOrder((current) =>
      current ? nextOrders.find((order) => order.id === current.id) ?? null : null
    );
    setLoading(false);
  }

  async function fetchOrderDetails(orderId: string, currentRestaurantId: string) {
    const [orderResult, tableResult] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, order_number, table_id, customer_name, notes, subtotal, total, status, created_at, order_items(item_name, quantity, unit_price, notes, line_total)"
        )
        .eq("id", orderId)
        .eq("restaurant_id", currentRestaurantId)
        .maybeSingle(),
      supabase
        .from("restaurant_tables")
        .select("id, table_number, name")
        .eq("restaurant_id", currentRestaurantId),
    ]);

    if (orderResult.error || tableResult.error) {
      throw new Error(
        orderResult.error?.message ??
          tableResult.error?.message ??
          "Could not refresh order."
      );
    }
    if (!orderResult.data) return null;

    const order = orderResult.data as unknown as RawOrder;
    const table = tableResult.data?.find((candidate) => candidate.id === order.table_id);

    return {
      order: { ...order, items: order.order_items ?? [] },
      tableName: table?.name || (table ? `Table ${table.table_number}` : "Table"),
    };
  }

  const loadOrdersEvent = useEffectEvent(loadOrders);
  const handleRealtimeEvent = useEffectEvent(
    async (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
      if (!restaurantId) return;
      const orderId = String(payload.new.id ?? payload.old.id ?? "");
      if (!orderId) return;

      if (payload.eventType === "DELETE") {
        setOrders((current) => current.filter((order) => order.id !== orderId));
        setSelectedOrder((current) => (current?.id === orderId ? null : current));
        return;
      }

      try {
        const details = await fetchOrderDetails(orderId, restaurantId);
        if (!details) return;

        setTableNames((current) => ({
          ...current,
          [details.order.table_id]: details.tableName,
        }));
        setOrders((current) =>
          [details.order, ...current.filter((order) => order.id !== details.order.id)].sort(
            (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
          )
        );
        setSelectedOrder((current) =>
          current?.id === details.order.id ? details.order : current
        );

        if (payload.eventType === "INSERT") {
          setNotifications((current) =>
            current.some((n) => n.id === details.order.id)
              ? current
              : [...current, { id: details.order.id, order: details.order, tableName: details.tableName }]
          );
        }
      } catch (realtimeErr) {
        setError(realtimeErr instanceof Error ? realtimeErr.message : "Realtime sync error.");
      }
    }
  );

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadOrdersEvent(true), 0);
    const timer = window.setInterval(() => void loadOrdersEvent(false), 15000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [router]);

  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`orders:${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => void handleRealtimeEvent(payload)
      )
      .subscribe((status) => setRealtimeConnected(status === "SUBSCRIBED"));

    return () => {
      setRealtimeConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  useEffect(() => {
    if (!notifications.length) return;
    const timer = window.setTimeout(
      () => setNotifications((current) => current.slice(1)),
      8000
    );
    return () => window.clearTimeout(timer);
  }, [notifications]);

  function viewOrder(order: Order) {
    setSelectedOrder(order);
  }

  async function updateStatus(order: Order, status: OrderStatus) {
    if (!restaurantId || !statusActions[order.status].includes(status)) return;
    setUpdatingId(order.id);
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("restaurant_id", restaurantId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(`${order.order_number} marked as ${statusLabels[status]}.`);
      await loadOrders(false);
    }
    setUpdatingId(null);
  }

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = order.order_number.toLowerCase().includes(q);
        const matchesCustomer = (order.customer_name || "").toLowerCase().includes(q);
        const matchesTable = (tableNames[order.table_id] || "").toLowerCase().includes(q);
        if (!matchesNum && !matchesCustomer && !matchesTable) return false;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery, tableNames]);

  const counts = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    preparing: orders.filter((o) => o.status === "preparing").length,
    ready: orders.filter((o) => o.status === "ready").length,
    completed: orders.filter((o) => o.status === "completed").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm font-mono text-zinc-400">
        Loading live orders...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Order Management
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Incoming dining orders with real-time status dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium border ${
              realtimeConnected
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-zinc-100 text-zinc-600 border-zinc-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                realtimeConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
              }`}
            />
            <span>{realtimeConnected ? "Real-time Live" : "Polling Sync"}</span>
          </div>

          <button
            type="button"
            onClick={() => void loadOrders(true)}
            className="p-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition shadow-2xs"
            title="Refresh orders"
          >
            <RefreshCwIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Realtime New Order Toasts */}
      {notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-40 w-full max-w-sm space-y-2 pointer-events-none">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="pointer-events-auto p-4 rounded-xl bg-zinc-900 text-white shadow-2xl border border-zinc-700 animate-in slide-in-from-top-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono tracking-wider uppercase text-[#C6A15B] font-bold block mb-1">
                    NEW ORDER RECEIVED
                  </span>
                  <p className="font-bold text-sm">{n.order.order_number}</p>
                  <p className="text-xs text-zinc-300 mt-0.5">
                    {n.tableName} • ₹{Number(n.order.total).toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotifications((prev) => prev.filter((item) => item.id !== n.id))
                  }
                  className="text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  viewOrder(n.order);
                  setNotifications((prev) => prev.filter((item) => item.id !== n.id));
                }}
                className="mt-3 w-full py-1.5 px-3 rounded-lg bg-[#C6A15B] text-zinc-950 font-bold text-xs hover:bg-[#b8924b] transition"
              >
                View Ticket
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {success}
        </div>
      )}

      {/* Operational Metrics Bar */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setStatusFilter("all")}
          className={`p-3.5 rounded-xl border cursor-pointer transition shadow-2xs ${
            statusFilter === "all"
              ? "bg-zinc-900 text-white border-zinc-900"
              : "bg-white text-zinc-900 border-zinc-200 hover:border-zinc-300"
          }`}
        >
          <span className={`text-[10px] font-mono uppercase tracking-wider block ${statusFilter === "all" ? "text-zinc-400" : "text-zinc-400"}`}>
            Total Orders
          </span>
          <span className="text-xl font-bold mt-1 block">{counts.total}</span>
        </div>

        <div
          onClick={() => setStatusFilter("pending")}
          className={`p-3.5 rounded-xl border cursor-pointer transition shadow-2xs ${
            statusFilter === "pending"
              ? "bg-amber-600 text-white border-amber-600"
              : "bg-white text-zinc-900 border-zinc-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-mono uppercase tracking-wider block ${statusFilter === "pending" ? "text-amber-100" : "text-zinc-400"}`}>
              Pending
            </span>
            {counts.pending > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
          <span className="text-xl font-bold mt-1 block text-amber-500">{counts.pending}</span>
        </div>

        <div
          onClick={() => setStatusFilter("preparing")}
          className={`p-3.5 rounded-xl border cursor-pointer transition shadow-2xs ${
            statusFilter === "preparing"
              ? "bg-orange-600 text-white border-orange-600"
              : "bg-white text-zinc-900 border-zinc-200 hover:border-orange-300"
          }`}
        >
          <span className={`text-[10px] font-mono uppercase tracking-wider block ${statusFilter === "preparing" ? "text-orange-100" : "text-zinc-400"}`}>
            In Kitchen
          </span>
          <span className="text-xl font-bold mt-1 block">{counts.preparing}</span>
        </div>

        <div
          onClick={() => setStatusFilter("ready")}
          className={`p-3.5 rounded-xl border cursor-pointer transition shadow-2xs ${
            statusFilter === "ready"
              ? "bg-purple-600 text-white border-purple-600"
              : "bg-white text-zinc-900 border-zinc-200 hover:border-purple-300"
          }`}
        >
          <span className={`text-[10px] font-mono uppercase tracking-wider block ${statusFilter === "ready" ? "text-purple-100" : "text-zinc-400"}`}>
            Ready
          </span>
          <span className="text-xl font-bold mt-1 block">{counts.ready}</span>
        </div>

        <div
          onClick={() => setStatusFilter("completed")}
          className={`p-3.5 rounded-xl border cursor-pointer transition shadow-2xs col-span-2 sm:col-span-1 ${
            statusFilter === "completed"
              ? "bg-emerald-700 text-white border-emerald-700"
              : "bg-white text-zinc-900 border-zinc-200 hover:border-emerald-300"
          }`}
        >
          <span className={`text-[10px] font-mono uppercase tracking-wider block ${statusFilter === "completed" ? "text-emerald-100" : "text-zinc-400"}`}>
            Completed
          </span>
          <span className="text-xl font-bold mt-1 block">{counts.completed}</span>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by order #, table, or guest name..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["all", "pending", "confirmed", "preparing", "ready", "completed", "cancelled"] as const).map(
            (tab) => {
              const count = tab === "all" ? counts.total : counts[tab];
              const isActive = statusFilter === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    isActive
                      ? "bg-zinc-900 text-white font-semibold"
                      : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  <span>{tab === "all" ? "All" : statusLabels[tab]}</span>
                  <span className="ml-1.5 font-mono text-[10px] opacity-75">
                    ({count})
                  </span>
                </button>
              );
            }
          )}
        </div>
      </section>

      {/* Orders Table (Desktop) / Cards (Mobile) */}
      <section className="rounded-xl border border-zinc-200 bg-white shadow-2xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ReceiptIcon className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-zinc-700">No orders found</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "Try clearing your search or status filter."
                : "Customer orders will stream into this table in real-time."}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50/75 border-b border-zinc-200 font-mono uppercase tracking-wider text-zinc-400 text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Order ID</th>
                    <th className="px-5 py-3.5">Table</th>
                    <th className="px-5 py-3.5">Guest</th>
                    <th className="px-5 py-3.5">Items Summary</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Placed At</th>
                    <th className="px-5 py-3.5 text-right">Dispatch Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredOrders.map((order) => {
                    const colors = statusColors[order.status] ?? statusColors.pending;
                    const possibleActions = statusActions[order.status];
                    const tableName = tableNames[order.table_id] ?? "Table";

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-zinc-50/60 transition-colors"
                      >
                        <td className="px-5 py-4 font-mono font-bold text-zinc-900">
                          <button
                            type="button"
                            onClick={() => viewOrder(order)}
                            className="hover:underline text-zinc-900 hover:text-[#C6A15B] cursor-pointer"
                          >
                            {order.order_number}
                          </button>
                        </td>

                        <td className="px-5 py-4 font-semibold text-zinc-800">
                          <span className="px-2 py-1 rounded bg-zinc-100 border border-zinc-200 font-mono text-xs">
                            {tableName}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-zinc-600">
                          {order.customer_name || "Guest"}
                        </td>

                        <td className="px-5 py-4 max-w-xs text-zinc-600">
                          <p className="truncate font-medium">
                            {order.items.map((i) => `${i.item_name} ×${i.quantity}`).join(", ")}
                          </p>
                          {order.notes && (
                            <p className="text-[11px] text-amber-700 italic truncate mt-0.5">
                              Note: {order.notes}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 font-bold text-zinc-900 font-mono">
                          ₹{Number(order.total).toFixed(2)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${colors.bg} ${colors.text} ${colors.border}`}
                          >
                            {statusLabels[order.status]}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-zinc-400 font-mono whitespace-nowrap">
                          {new Date(order.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {possibleActions.length > 0 ? (
                              possibleActions.map((action) => (
                                <button
                                  key={action}
                                  type="button"
                                  disabled={updatingId === order.id}
                                  onClick={() => void updateStatus(order, action)}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    action === "cancelled"
                                      ? "border border-zinc-200 hover:bg-rose-50 text-rose-600 hover:border-rose-200"
                                      : "bg-zinc-900 hover:bg-zinc-800 text-white"
                                  } disabled:opacity-50`}
                                >
                                  {updatingId === order.id
                                    ? "..."
                                    : action === "confirmed"
                                    ? "Confirm"
                                    : action === "preparing"
                                    ? "Start Cooking"
                                    : action === "ready"
                                    ? "Ready"
                                    : action === "completed"
                                    ? "Complete"
                                    : "Cancel"}
                                </button>
                              ))
                            ) : (
                              <button
                                type="button"
                                onClick={() => viewOrder(order)}
                                className="px-2.5 py-1 rounded-md border border-zinc-200 text-[11px] font-medium text-zinc-500 hover:bg-zinc-50"
                              >
                                View Ticket
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden divide-y divide-zinc-200">
              {filteredOrders.map((order) => {
                const colors = statusColors[order.status] ?? statusColors.pending;
                const possibleActions = statusActions[order.status];
                const tableName = tableNames[order.table_id] ?? "Table";

                return (
                  <div key={order.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <button
                          type="button"
                          onClick={() => viewOrder(order)}
                          className="font-mono font-bold text-sm text-zinc-900 hover:underline"
                        >
                          {order.order_number}
                        </button>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {tableName} • {order.customer_name || "Guest"}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-zinc-900 block">
                          ₹{Number(order.total).toFixed(2)}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border mt-1 ${colors.bg} ${colors.text} ${colors.border}`}
                        >
                          {statusLabels[order.status]}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                      <p>{order.items.map((i) => `${i.item_name} ×${i.quantity}`).join(", ")}</p>
                      {order.notes && (
                        <p className="text-[11px] text-amber-700 italic mt-1">
                          Note: {order.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] font-mono text-zinc-400">
                        {new Date(order.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => viewOrder(order)}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700"
                        >
                          Details
                        </button>

                        {possibleActions.map((action) => (
                          <button
                            key={action}
                            type="button"
                            disabled={updatingId === order.id}
                            onClick={() => void updateStatus(order, action)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                              action === "cancelled"
                                ? "border border-zinc-200 text-rose-600"
                                : "bg-zinc-900 text-white"
                            }`}
                          >
                            {action === "confirmed"
                              ? "Confirm"
                              : action === "preparing"
                              ? "Cooking"
                              : action === "ready"
                              ? "Ready"
                              : action === "completed"
                              ? "Complete"
                              : "Cancel"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* ====================================================================
          ORDER DETAILS MODAL (TICKET VIEW)
         ==================================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white border border-zinc-200 shadow-2xl p-6 overflow-hidden">
            <div className="flex items-start justify-between pb-3 border-b border-zinc-200">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                  ORDER TICKET
                </span>
                <h3 className="text-xl font-bold font-mono text-zinc-900 mt-0.5">
                  {selectedOrder.order_number}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-zinc-50 border border-zinc-100 text-xs">
                <div>
                  <span className="text-zinc-400 uppercase text-[10px] font-mono block">Table</span>
                  <span className="font-semibold text-zinc-900 mt-0.5 block">
                    {tableNames[selectedOrder.table_id] ?? "Table"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 uppercase text-[10px] font-mono block">Guest</span>
                  <span className="font-semibold text-zinc-900 mt-0.5 block">
                    {selectedOrder.customer_name || "Guest"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 uppercase text-[10px] font-mono block">Status</span>
                  <span className="font-semibold text-zinc-900 mt-0.5 uppercase tracking-wider block">
                    {statusLabels[selectedOrder.status]}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-400 uppercase text-[10px] font-mono block">Received</span>
                  <span className="font-mono text-zinc-900 mt-0.5 block">
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Customer Notes */}
              {selectedOrder.notes && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <span className="font-bold block mb-0.5">Guest Special Request:</span>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}

              {/* Items Breakdown */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold mb-2">
                  Ordered Items
                </h4>
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg overflow-hidden">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-zinc-100 font-bold flex items-center justify-center text-zinc-800 font-mono text-[11px]">
                            {item.quantity}
                          </span>
                          <span className="font-semibold text-zinc-900">
                            {item.item_name}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-zinc-500 italic ml-7 mt-0.5">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      <span className="font-mono font-bold text-zinc-900">
                        ₹{Number(item.line_total).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bill Summary */}
              <div className="pt-2 space-y-1.5 text-xs border-t border-zinc-200">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal</span>
                  <span className="font-mono">₹{Number(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-zinc-900 pt-1 border-t border-zinc-100">
                  <span>Total Due</span>
                  <span className="font-mono text-base">₹{Number(selectedOrder.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-zinc-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {statusActions[selectedOrder.status].map((action) => (
                  <button
                    key={action}
                    type="button"
                    disabled={updatingId === selectedOrder.id}
                    onClick={() => {
                      void updateStatus(selectedOrder, action);
                      setSelectedOrder(null);
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                      action === "cancelled"
                        ? "border border-zinc-200 hover:bg-rose-50 text-rose-600"
                        : "bg-zinc-900 hover:bg-zinc-800 text-white"
                    }`}
                  >
                    Mark {statusLabels[action]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
