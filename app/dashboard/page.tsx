"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  UtensilsIcon,
  ReceiptIcon,
  QrCodeIcon,
  RefreshCwIcon,
  VegBadge,
  NonVegBadge,
} from "@/components/ui/Icons";

type OverviewStats = {
  menuItemsTotal: number;
  menuItemsAvailable: number;
  ordersToday: number;
  tablesTotal: number;
  salesToday: number;
};

type RecentOrderItem = {
  item_name: string;
  quantity: number;
};

type RecentOrder = {
  id: string;
  order_number: string;
  table_id: string;
  tableName?: string;
  customer_name: string | null;
  total: number;
  status: string;
  created_at: string;
  items: RecentOrderItem[];
};

type SnapshotItem = {
  id: string;
  name: string;
  price: number;
  is_veg: boolean;
  has_3d_model: boolean;
  image_url: string | null;
  is_available: boolean;
};

export default function DashboardOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [snapshotItems, setSnapshotItems] = useState<SnapshotItem[]>([]);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      setLoading(true);
      setError("");

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        if (isMounted) {
          setError(authError?.message ?? "Please sign in to access the dashboard.");
          router.replace("/login");
        }
        return;
      }

      const { data: restaurant, error: restError } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("owner_id", authData.user.id)
        .maybeSingle();

      if (restError || !restaurant) {
        if (isMounted) {
          setError(restError?.message ?? "No restaurant found for this account.");
          setLoading(false);
        }
        return;
      }

      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const startOfTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      try {
        const [
          totalItemsResult,
          availableItemsResult,
          ordersTodayResult,
          tablesResult,
          salesResult,
          recentOrdersResult,
          allTablesResult,
          menuItemsResult,
        ] = await Promise.all([
          supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
          supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id).eq("is_available", true),
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id).gte("created_at", startOfToday).lt("created_at", startOfTomorrow),
          supabase.from("restaurant_tables").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
          supabase.from("orders").select("total").eq("restaurant_id", restaurant.id).eq("status", "completed").gte("created_at", startOfToday).lt("created_at", startOfTomorrow),
          supabase.from("orders").select("id, order_number, table_id, customer_name, total, status, created_at, order_items(item_name, quantity)").eq("restaurant_id", restaurant.id).order("created_at", { ascending: false }).limit(6),
          supabase.from("restaurant_tables").select("id, table_number, name").eq("restaurant_id", restaurant.id),
          supabase.from("menu_items").select("id, name, price, is_veg, has_3d_model, image_url, is_available").eq("restaurant_id", restaurant.id).limit(4),
        ]);

        if (!isMounted) return;

        const tableMap = new Map<string, string>();
        (allTablesResult.data ?? []).forEach((t) => {
          tableMap.set(t.id, t.name || `Table ${t.table_number}`);
        });

        const sales = (salesResult.data ?? []).reduce(
          (sum, row) => sum + Number(row.total ?? 0),
          0
        );

        const mappedOrders: RecentOrder[] = ((recentOrdersResult.data ?? []) as Array<{
          id: string;
          order_number: string;
          table_id: string;
          customer_name: string | null;
          total: number;
          status: string;
          created_at: string;
          order_items?: RecentOrderItem[];
        }>).map((o) => ({
          id: o.id,
          order_number: o.order_number,
          table_id: o.table_id,
          tableName: tableMap.get(o.table_id) ?? "Table",
          customer_name: o.customer_name,
          total: Number(o.total || 0),
          status: o.status,
          created_at: o.created_at,
          items: o.order_items ?? [],
        }));

        setStats({
          menuItemsTotal: totalItemsResult.count ?? 0,
          menuItemsAvailable: availableItemsResult.count ?? 0,
          ordersToday: ordersTodayResult.count ?? 0,
          tablesTotal: tablesResult.count ?? 0,
          salesToday: sales,
        });

        setRecentOrders(mappedOrders);
        setSnapshotItems((menuItemsResult.data ?? []) as SnapshotItem[]);
        setLastUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load dashboard data.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadOverview();

    const interval = window.setInterval(() => {
      void loadOverview();
    }, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [router]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Operations Overview
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Real-time status of your menu, tables, and dining orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs font-mono text-zinc-400">
              Synced {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="p-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition shadow-2xs"
            title="Refresh statistics"
          >
            <RefreshCwIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Key Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's Revenue */}
        <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 mb-2">
            <span>Today&apos;s Revenue</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[11px] border border-emerald-200/50">
              PAID
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            {loading ? "..." : `₹${stats ? stats.salesToday.toFixed(2) : "0.00"}`}
          </div>
          <p className="mt-1.5 text-xs text-zinc-400">
            From completed dining orders today
          </p>
        </div>

        {/* Metric 2: Today's Orders */}
        <Link
          href="/dashboard/orders"
          className="p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs hover:border-zinc-300 transition group block"
        >
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 mb-2">
            <span>Today&apos;s Orders</span>
            <ReceiptIcon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            {loading ? "..." : stats?.ordersToday ?? 0}
          </div>
          <p className="mt-1.5 text-xs text-zinc-400">
            Guest orders placed across all tables
          </p>
        </Link>

        {/* Metric 3: Menu Items */}
        <Link
          href="/dashboard/menu"
          className="p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs hover:border-zinc-300 transition group block"
        >
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 mb-2">
            <span>Menu Items</span>
            <UtensilsIcon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            {loading ? "..." : stats?.menuItemsTotal ?? 0}
          </div>
          <p className="mt-1.5 text-xs text-emerald-600 font-medium">
            {loading ? "..." : `${stats?.menuItemsAvailable ?? 0} active & available`}
          </p>
        </Link>

        {/* Metric 4: Tables */}
        <Link
          href="/dashboard/tables"
          className="p-5 rounded-xl bg-white border border-zinc-200 shadow-2xs hover:border-zinc-300 transition group block"
        >
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500 mb-2">
            <span>Dining Tables</span>
            <QrCodeIcon className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            {loading ? "..." : stats?.tablesTotal ?? 0}
          </div>
          <p className="mt-1.5 text-xs text-zinc-400">
            Configured with unique QR codes
          </p>
        </Link>
      </section>

      {/* Quick Action Bar */}
      <section className="p-4 rounded-xl bg-white border border-zinc-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-semibold">
            QUICK ACTIONS
          </span>
          <span className="text-xs text-zinc-500 hidden sm:inline">
            Direct shortcuts for restaurant management
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link
            href="/dashboard/menu?action=add"
            className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-800 transition flex items-center gap-2.5 text-xs font-semibold"
          >
            <span className="text-base select-none">🍔</span>
            <span className="truncate">Add Menu Item</span>
          </Link>

          <Link
            href="/dashboard/menu"
            className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-800 transition flex items-center gap-2.5 text-xs font-semibold"
          >
            <span className="text-base select-none">📂</span>
            <span className="truncate">Categories</span>
          </Link>

          <Link
            href="/dashboard/tables"
            className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-800 transition flex items-center gap-2.5 text-xs font-semibold"
          >
            <span className="text-base select-none">📱</span>
            <span className="truncate">Add Table</span>
          </Link>

          <Link
            href="/dashboard/tables"
            className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-800 transition flex items-center gap-2.5 text-xs font-semibold"
          >
            <span className="text-base select-none">🖨️</span>
            <span className="truncate">Download QRs</span>
          </Link>
        </div>
      </section>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Orders (8 cols) */}
        <section className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-zinc-900">
                  Recent Dining Orders
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Latest customer orders across all active tables
                </p>
              </div>

              <Link
                href="/dashboard/orders"
                className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 inline-flex items-center gap-1 transition"
              >
                <span>View all</span>
                <span>→</span>
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-zinc-400 font-mono">
                Loading orders...
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-12 text-center">
                <ReceiptIcon className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-zinc-700">No orders yet</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                  Customer orders will automatically appear here once guests scan their table QR code.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50/75 border-b border-zinc-200 font-mono uppercase tracking-wider text-zinc-400 text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Table</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {recentOrders.map((order) => {
                      const statusColor =
                        order.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : order.status === "preparing"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : order.status === "confirmed"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : order.status === "cancelled"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-zinc-100 text-zinc-700 border-zinc-200";

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-zinc-50/70 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-semibold text-zinc-900">
                            <Link
                              href="/dashboard/orders"
                              className="hover:underline hover:text-[#C6A15B]"
                            >
                              {order.order_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-zinc-700">
                              {order.tableName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-600 max-w-[200px] truncate">
                            {order.items.length > 0
                              ? order.items
                                  .map((i) => `${i.item_name} ×${i.quantity}`)
                                  .join(", ")
                              : "Order items"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-zinc-900">
                            ₹{order.total.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${statusColor}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-400 font-mono">
                            {new Date(order.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Menu Snapshot & Setup Guide (4 cols) */}
        <section className="lg:col-span-4 space-y-6">
          {/* Menu Snapshot */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-100">
              <div>
                <h3 className="font-bold text-sm text-zinc-900">
                  Menu Highlights
                </h3>
                <p className="text-xs text-zinc-500">Curated dishes on your live menu</p>
              </div>
              <Link
                href="/dashboard/menu"
                className="text-xs font-semibold text-zinc-600 hover:text-zinc-900"
              >
                Manage →
              </Link>
            </div>

            {snapshotItems.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">
                No items added yet.
              </p>
            ) : (
              <div className="space-y-3">
                {snapshotItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.is_veg ? <VegBadge /> : <NonVegBadge />}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] font-mono text-zinc-500">
                          ₹{Number(item.price).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.has_3d_model && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                          title="Interactive 3D model configured"
                        >
                          3D
                        </span>
                      )}
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.is_available ? "bg-emerald-500" : "bg-zinc-300"
                        }`}
                        title={item.is_available ? "Available" : "Unavailable"}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Onboarding / Operations Readiness */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs">
            <h3 className="font-bold text-sm text-zinc-900 mb-3">
              Operations Readiness
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-zinc-900">Digital Menu Ready</p>
                  <p className="text-zinc-500 text-[11px]">
                    Dishes & categories configured for customers.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-zinc-900">QR Codes Generated</p>
                  <p className="text-zinc-500 text-[11px]">
                    Table QR codes ready for printing & display.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2 rounded-lg bg-zinc-50 border border-zinc-100">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-zinc-900">AR Experience Active</p>
                  <p className="text-zinc-500 text-[11px]">
                    True-to-scale 3D models enabled on supported devices.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}