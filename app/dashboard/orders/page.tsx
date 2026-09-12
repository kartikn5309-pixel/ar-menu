"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";
type OrderItem = { item_name: string; quantity: number; unit_price: number; notes: string | null; line_total: number };
type Order = { id: string; order_number: string; table_id: string; customer_name: string | null; notes: string | null; subtotal: number; total: number; status: OrderStatus; created_at: string; items: OrderItem[] };
type RawOrder = Omit<Order, "items"> & { order_items: OrderItem[] };
type OrderNotification = { id: string; order: Order; tableName: string };

const statusLabels: Record<OrderStatus, string> = { pending: "Pending", confirmed: "Confirmed", preparing: "Preparing", ready: "Ready", completed: "Completed", cancelled: "Cancelled" };
const statusActions: Record<OrderStatus, OrderStatus[]> = { pending: ["confirmed", "cancelled"], confirmed: ["preparing", "cancelled"], preparing: ["ready", "cancelled"], ready: ["completed"], completed: [], cancelled: [] };

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

  async function loadOrders(showLoading: boolean) {
    if (showLoading) setLoading(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) { router.replace("/login"); return; }
    const { data: restaurant, error: restaurantError } = await supabase.from("restaurants").select("id").eq("owner_id", authData.user.id).maybeSingle();
    if (restaurantError || !restaurant) { setError(restaurantError?.message ?? "Restaurant not found."); setLoading(false); return; }
    setRestaurantId(restaurant.id);
    const [orderResult, tableResult] = await Promise.all([
      supabase.from("orders").select("id, order_number, table_id, customer_name, notes, subtotal, total, status, created_at, order_items(item_name, quantity, unit_price, notes, line_total)").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }),
      supabase.from("restaurant_tables").select("id, table_number, name").eq("restaurant_id", restaurant.id),
    ]);
    if (orderResult.error || tableResult.error) { setError(orderResult.error?.message ?? tableResult.error?.message ?? "Could not load orders."); setLoading(false); return; }
    const nextOrders = ((orderResult.data ?? []) as unknown as RawOrder[]).map((order) => ({ ...order, items: order.order_items ?? [] }));
    setTableNames(Object.fromEntries((tableResult.data ?? []).map((table) => [table.id, table.name || `Table ${table.table_number}`])));
    setOrders(nextOrders);
    setSelectedOrder((current) => current ? nextOrders.find((order) => order.id === current.id) ?? null : null);
    setLoading(false);
  }

  async function fetchOrderDetails(orderId: string, currentRestaurantId: string) {
    const [orderResult, tableResult] = await Promise.all([
      supabase.from("orders").select("id, order_number, table_id, customer_name, notes, subtotal, total, status, created_at, order_items(item_name, quantity, unit_price, notes, line_total)").eq("id", orderId).eq("restaurant_id", currentRestaurantId).maybeSingle(),
      supabase.from("restaurant_tables").select("id, table_number, name").eq("restaurant_id", currentRestaurantId),
    ]);
    if (orderResult.error || tableResult.error) throw new Error(orderResult.error?.message ?? tableResult.error?.message ?? "Could not refresh the order.");
    if (!orderResult.data) return null;
    const order = orderResult.data as unknown as RawOrder;
    const table = tableResult.data?.find((candidate) => candidate.id === order.table_id);
    return { order: { ...order, items: order.order_items ?? [] }, tableName: table?.name || (table ? `Table ${table.table_number}` : "Table") };
  }

  const loadOrdersEvent = useEffectEvent(loadOrders);
  const handleRealtimeEvent = useEffectEvent(async (payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }) => {
    if (!restaurantId) return;
    const orderId = String(payload.new.id ?? payload.old.id ?? "");
    if (!orderId) return;
    if (payload.eventType === "DELETE") {
      setOrders((current) => current.filter((order) => order.id !== orderId));
      setSelectedOrder((current) => current?.id === orderId ? null : current);
      return;
    }
    try {
      const details = await fetchOrderDetails(orderId, restaurantId);
      if (!details) return;
      setTableNames((current) => ({ ...current, [details.order.table_id]: details.tableName }));
      setOrders((current) => [details.order, ...current.filter((order) => order.id !== details.order.id)].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)));
      setSelectedOrder((current) => current?.id === details.order.id ? details.order : current);
      if (payload.eventType === "INSERT") {
        setNotifications((current) => current.some((notification) => notification.id === details.order.id) ? current : [...current, { id: details.order.id, order: details.order, tableName: details.tableName }]);
      }
    } catch (realtimeError) {
      setError(realtimeError instanceof Error ? realtimeError.message : "Could not refresh the order.");
    }
  });

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadOrdersEvent(true), 0);
    const timer = window.setInterval(() => void loadOrdersEvent(false), 15000);
    return () => { window.clearTimeout(initialLoad); window.clearInterval(timer); };
  }, [router]);

  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase.channel(`orders:${restaurantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurantId}` }, (payload) => void handleRealtimeEvent(payload))
      .subscribe((status) => setRealtimeConnected(status === "SUBSCRIBED"));
    return () => {
      setRealtimeConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  useEffect(() => {
    if (!notifications.length) return;
    const timer = window.setTimeout(() => setNotifications((current) => current.slice(1)), 8000);
    return () => window.clearTimeout(timer);
  }, [notifications]);

  function viewOrder(order: Order) {
    setSelectedOrder(order);
    window.setTimeout(() => document.getElementById(`order-${order.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  async function updateStatus(order: Order, status: OrderStatus) {
    if (!restaurantId || !statusActions[order.status].includes(status)) return;
    setUpdatingId(order.id); setError(""); setSuccess("");
    const { error: updateError } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", order.id).eq("restaurant_id", restaurantId);
    if (updateError) setError(updateError.message);
    else { setSuccess(`${order.order_number} marked ${statusLabels[status].toLowerCase()}${realtimeConnected ? " · Live" : " · Refreshing"}.`); await loadOrders(false); }
    setUpdatingId(null);
  }

  const counts = { total: orders.length, pending: orders.filter((order) => order.status === "pending").length, preparing: orders.filter((order) => order.status === "preparing").length, completed: orders.filter((order) => order.status === "completed").length };
  if (loading) return <Status message="Loading orders..." />;
  return <main className="min-h-screen bg-slate-100 text-slate-900"><div className="flex min-h-screen"><aside className="hidden w-64 flex-col bg-slate-950 text-white md:flex"><div className="border-b border-slate-800 px-6 py-6"><Link href="/dashboard" className="text-2xl font-bold">AR <span className="text-orange-500">MENU</span></Link><p className="mt-1 text-xs text-slate-400">Restaurant Management</p></div><nav className="flex-1 px-4 py-6"><p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Management</p><div className="space-y-1"><Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800">📊 Overview</Link><Link href="/dashboard/menu" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800">🍔 Menu</Link><Link href="/dashboard/orders" className="flex items-center gap-3 rounded-xl bg-orange-500 px-3 py-3 text-sm font-medium text-white">🛒 Orders</Link><Link href="/dashboard/tables" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800">📱 Tables & QR</Link></div></nav><div className="border-t border-slate-800 p-4"><div className="rounded-xl bg-slate-900 p-4"><p className="text-sm font-semibold">Restaurant Account</p><p className="mt-1 text-xs text-slate-400">Logged in successfully</p></div></div></aside><section className="flex-1"><header className="border-b bg-white px-4 py-5 sm:px-6 md:px-10"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div><p className="text-sm text-slate-500">Restaurant Portal</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Orders</h1><p className="mt-2 text-sm text-slate-500">Review incoming guest orders and keep their status current.</p></div><Link href="/dashboard" className="rounded-xl border px-3 py-2 text-sm font-semibold text-slate-600 hover:border-orange-300 hover:text-orange-600">Dashboard</Link></div></header><div className="pointer-events-none fixed right-4 top-4 z-30 w-[calc(100%-2rem)] max-w-md space-y-3 sm:right-6 sm:top-6">{notifications.map((notification) => <div key={notification.id} className="pointer-events-auto rounded-2xl border border-orange-200 bg-white p-4 shadow-xl"><div className="flex items-start justify-between gap-4"><div><p className="font-bold text-orange-600">🔔 New Order Received!</p><p className="mt-2 text-sm font-semibold">{notification.order.order_number}</p><p className="mt-1 text-sm text-slate-500">{notification.tableName} · ₹{Number(notification.order.total).toFixed(2)}</p></div><button onClick={() => setNotifications((current) => current.filter((item) => item.id !== notification.id))} aria-label="Dismiss notification" className="text-xl leading-none text-slate-400 hover:text-slate-700">×</button></div><button onClick={() => { viewOrder(notification.order); setNotifications((current) => current.filter((item) => item.id !== notification.id)); }} className="mt-4 w-full rounded-xl bg-orange-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">View Order</button></div>)}</div><div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">{error && <Alert message={error} />}{success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div>}<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Summary label="Total orders" value={counts.total} /><Summary label="Pending" value={counts.pending} /><Summary label="Preparing" value={counts.preparing} /><Summary label="Completed" value={counts.completed} /></section>{orders.length === 0 ? <div className="rounded-2xl border bg-white px-6 py-16 text-center shadow-sm"><h2 className="text-lg font-bold">No orders yet</h2><p className="mt-2 text-sm text-slate-500">No orders yet. Customer orders will appear here when they place an order.</p></div> : <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Order</th><th className="px-5 py-4">Table</th><th className="px-5 py-4">Customer</th><th className="px-5 py-4">Items</th><th className="px-5 py-4">Total</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Created</th><th className="px-5 py-4">Action</th></tr></thead><tbody className="divide-y">{orders.map((order) => <OrderRow key={order.id} order={order} tableName={tableNames[order.table_id] ?? "Table"} updating={updatingId === order.id} onOpen={() => viewOrder(order)} onStatusChange={(status) => void updateStatus(order, status)} />)}</tbody></table></div><div className="divide-y md:hidden">{orders.map((order) => <OrderCard key={order.id} order={order} tableName={tableNames[order.table_id] ?? "Table"} updating={updatingId === order.id} onOpen={() => viewOrder(order)} onStatusChange={(status) => void updateStatus(order, status)} />)}</div></section>}</div></section></div>{selectedOrder && <OrderDetails order={selectedOrder} tableName={tableNames[selectedOrder.table_id] ?? "Table"} onClose={() => setSelectedOrder(null)} />}</main>;
}

function OrderRow({ order, tableName, updating, onOpen, onStatusChange }: { order: Order; tableName: string; updating: boolean; onOpen: () => void; onStatusChange: (status: OrderStatus) => void }) { return <tr id={`order-${order.id}`} className="hover:bg-orange-50/40"><td className="px-5 py-4"><button onClick={onOpen} className="font-bold text-orange-600 hover:text-orange-700">{order.order_number}</button></td><td className="px-5 py-4">{tableName}</td><td className="px-5 py-4">{order.customer_name || "Guest"}</td><td className="max-w-xs px-5 py-4 text-slate-600">{order.items.map((item) => `${item.item_name} × ${item.quantity}`).join(", ")}</td><td className="px-5 py-4 font-semibold">₹{Number(order.total).toFixed(2)}</td><td className="px-5 py-4"><StatusBadge status={order.status} /></td><td className="whitespace-nowrap px-5 py-4 text-slate-500">{new Date(order.created_at).toLocaleString()}</td><td className="px-5 py-4"><StatusSelect status={order.status} updating={updating} onChange={onStatusChange} /></td></tr>; }
function OrderCard({ order, tableName, updating, onOpen, onStatusChange }: { order: Order; tableName: string; updating: boolean; onOpen: () => void; onStatusChange: (status: OrderStatus) => void }) { return <article id={`order-${order.id}`} className="p-5"><div className="flex items-start justify-between gap-3"><div><button onClick={onOpen} className="font-bold text-orange-600">{order.order_number}</button><p className="mt-1 text-sm text-slate-500">{tableName} · {order.customer_name || "Guest"}</p></div><p className="font-bold">₹{Number(order.total).toFixed(2)}</p></div><p className="mt-4 text-sm text-slate-600">{order.items.map((item) => `${item.item_name} × ${item.quantity}`).join(", ")}</p><div className="mt-4 flex items-center justify-between gap-3"><StatusBadge status={order.status} /><StatusSelect status={order.status} updating={updating} onChange={onStatusChange} /></div><p className="mt-3 text-xs text-slate-400">{new Date(order.created_at).toLocaleString()}</p></article>; }
function StatusSelect({ status, updating, onChange }: { status: OrderStatus; updating: boolean; onChange: (status: OrderStatus) => void }) { const actions = statusActions[status]; if (actions.length === 0) return null; return <select disabled={updating} defaultValue="" onChange={(event) => { if (event.target.value) onChange(event.target.value as OrderStatus); }} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"><option value="">{updating ? "Updating..." : "Update status"}</option>{actions.map((option) => <option key={option} value={option}>{statusLabels[option]}</option>)}</select>; }
function StatusBadge({ status }: { status: OrderStatus }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status === "cancelled" ? "bg-red-100 text-red-700" : status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"}`}>{statusLabels[status]}</span>; }
function OrderDetails({ order, tableName, onClose }: { order: Order; tableName: string; onClose: () => void }) { return <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-6"><section role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wide text-orange-500">Order details</p><h2 className="mt-1 text-2xl font-bold">{order.order_number}</h2></div><button onClick={onClose} aria-label="Close order details" className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100">×</button></div><div className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2"><Info label="Table" value={tableName} /><Info label="Customer" value={order.customer_name || "Guest"} /><Info label="Status" value={statusLabels[order.status]} /><Info label="Created" value={new Date(order.created_at).toLocaleString()} /></div>{order.notes && <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Customer notes</p><p className="mt-1 text-sm text-slate-700">{order.notes}</p></div>}<div className="mt-6 divide-y rounded-xl border">{order.items.map((item, index) => <div key={`${item.item_name}-${index}`} className="space-y-2 p-4"><div className="flex justify-between gap-4"><div><p className="font-semibold">{item.item_name}</p><p className="text-sm text-slate-500">Quantity: {item.quantity} · Unit price: ₹{Number(item.unit_price).toFixed(2)}</p></div><p className="font-semibold">₹{Number(item.line_total).toFixed(2)}</p></div>{item.notes && <p className="text-sm text-slate-500">Item notes: {item.notes}</p>}</div>)}</div><div className="mt-5 space-y-2 border-t pt-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>₹{Number(order.subtotal).toFixed(2)}</span></div><div className="flex justify-between text-lg font-bold"><span>Total</span><span className="text-orange-600">₹{Number(order.total).toFixed(2)}</span></div></div></section></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
function Summary({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><p className="text-sm text-slate-500">{label}</p><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" />Live</span></div><p className="mt-2 text-3xl font-bold">{value}</p></div>; }
function Status({ message }: { message: string }) { return <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6"><p className="text-sm text-slate-500">{message}</p></main>; }
function Alert({ message }: { message: string }) { return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>; }
