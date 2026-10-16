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
import LoadingIndicator from "@/components/ui/LoadingIndicator";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAE6DF]">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#092C29]">
            Operations Overview
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
            Real-time status of your digital menu, tables, and live dining orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs font-mono text-stone-400 bg-white px-3 py-1.5 rounded-lg border border-[#EAE6DF]">
              Synced {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="p-2 rounded-xl border border-[#EAE6DF] bg-white hover:bg-[#FAF8F2] text-stone-600 transition shadow-xs cursor-pointer"
            title="Refresh statistics"
          >
            <RefreshCwIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Key Metric Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's Revenue */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#EAE6DF] shadow-sm shadow-stone-900/5 hover:border-[#C6A15B]/50 transition relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-2">
            <span>Today&apos;s Revenue</span>
            <span className="px-2 py-0.5 rounded-full bg-[#EBF4F1] text-[#092C29] font-mono text-[10px] font-bold border border-[#CDE3DC]">
              PAID
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#092C29]">
            {loading ? "..." : `₹${stats ? stats.salesToday.toFixed(2) : "0.00"}`}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-stone-400 font-medium">
              Completed dining orders today
            </p>
            {/* Visual Micro Trend Indicator */}
            <div className="flex items-end gap-1 h-3.5">
              <span className="w-1 h-2 rounded-full bg-[#CDE3DC]" />
              <span className="w-1 h-3 rounded-full bg-[#5D8B82]" />
              <span className="w-1 h-3.5 rounded-full bg-[#092C29]" />
            </div>
          </div>
        </div>

        {/* Metric 2: Today's Orders */}
        <Link
          href="/dashboard/orders"
          className="p-5 sm:p-6 rounded-2xl bg-white border border-[#EAE6DF] shadow-sm shadow-stone-900/5 hover:border-[#092C29]/40 transition group block"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-2">
            <span>Today&apos;s Orders</span>
            <ReceiptIcon className="w-4 h-4 text-stone-400 group-hover:text-[#092C29] transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#092C29]">
            {loading ? "..." : stats?.ordersToday ?? 0}
          </div>
          <p className="mt-2 text-[11px] text-stone-400 font-medium">
            Guest orders placed across all tables
          </p>
        </Link>

        {/* Metric 3: Menu Items */}
        <Link
          href="/dashboard/menu"
          className="p-5 sm:p-6 rounded-2xl bg-white border border-[#EAE6DF] shadow-sm shadow-stone-900/5 hover:border-[#092C29]/40 transition group block"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-2">
            <span>Menu Items</span>
            <UtensilsIcon className="w-4 h-4 text-stone-400 group-hover:text-[#092C29] transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#092C29]">
            {loading ? "..." : stats?.menuItemsTotal ?? 0}
          </div>
          <p className="mt-2 text-[11px] text-[#123F38] font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {loading ? "..." : `${stats?.menuItemsAvailable ?? 0} active & available`}
          </p>
        </Link>

        {/* Metric 4: Tables */}
        <Link
          href="/dashboard/tables"
          className="p-5 sm:p-6 rounded-2xl bg-white border border-[#EAE6DF] shadow-sm shadow-stone-900/5 hover:border-[#092C29]/40 transition group block"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-2">
            <span>Dining Tables</span>
            <QrCodeIcon className="w-4 h-4 text-stone-400 group-hover:text-[#092C29] transition" />
          </div>
          <div className="text-2xl sm:text-3xl font-black tracking-tight text-[#092C29]">
            {loading ? "..." : stats?.tablesTotal ?? 0}
          </div>
          <p className="mt-2 text-[11px] text-stone-400 font-medium">
            Configured with unique QR codes
          </p>
        </Link>
      </section>

      {/* Quick Action Bar */}
      <section className="p-4 sm:p-5 rounded-2xl bg-white border border-[#EAE6DF] shadow-sm shadow-stone-900/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-stone-400 font-bold">
            QUICK SHORTCUTS
          </span>
          <span className="text-xs text-stone-500 font-medium hidden sm:inline">
            Direct operations management
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link
            href="/dashboard/menu?action=add"
            className="p-3 rounded-xl border border-[#EAE6DF] bg-[#FAF8F2] hover:bg-[#F2EFE8] hover:border-[#C6A15B]/50 text-stone-800 transition flex items-center gap-2.5 text-xs font-bold"
          >
            <span className="text-base select-none">🍔</span>
            <span className="truncate">Add Menu Item</span>
          </Link>

          <Link
            href="/dashboard/menu"
            className="p-3 rounded-xl border border-[#EAE6DF] bg-[#FAF8F2] hover:bg-[#F2EFE8] hover:border-[#C6A15B]/50 text-stone-800 transition flex items-center gap-2.5 text-xs font-bold"
          >
            <span className="text-base select-none">📂</span>
            <span className="truncate">Categories</span>
          </Link>

          <Link
            href="/dashboard/tables"
            className="p-3 rounded-xl border border-[#EAE6DF] bg-[#FAF8F2] hover:bg-[#F2EFE8] hover:border-[#C6A15B]/50 text-stone-800 transition flex items-center gap-2.5 text-xs font-bold"
          >
            <span className="text-base select-none">📱</span>
            <span className="truncate">Add Table</span>
          </Link>

          <Link
            href="/dashboard/tables"
            className="p-3 rounded-xl border border-[#EAE6DF] bg-[#FAF8F2] hover:bg-[#F2EFE8] hover:border-[#C6A15B]/50 text-stone-800 transition flex items-center gap-2.5 text-xs font-bold"
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
          <div className="rounded-2xl border border-[#EAE6DF] bg-white shadow-sm shadow-stone-900/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F0ECE1] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#092C29]">
                  Recent Dining Orders
                </h2>
                <p className="text-xs text-stone-500 mt-0.5 font-medium">
                  Latest customer orders across all active tables
                </p>
              </div>

              <Link
                href="/dashboard/orders"
                className="text-xs font-bold text-[#092C29] hover:text-[#123F38] inline-flex items-center gap-1 transition"
              >
                <span>View all</span>
                <span>→</span>
              </Link>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <LoadingIndicator size="sm" message="Loading live dining orders..." />
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="p-12 text-center">
                <ReceiptIcon className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#092C29]">No orders yet</p>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                  Customer orders will automatically appear here once guests scan their table QR code.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF8F2] border-b border-[#F0ECE1] font-mono uppercase tracking-wider text-stone-400 text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Table</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE1]">
                    {recentOrders.map((order) => {
                      const statusColor =
                        order.status === "completed"
                          ? "bg-[#EBF4F1] text-[#092C29] border-[#CDE3DC]"
                          : order.status === "preparing"
                          ? "bg-amber-50 text-amber-800 border-amber-200"
                          : order.status === "confirmed"
                          ? "bg-blue-50 text-blue-800 border-blue-200"
                          : order.status === "cancelled"
                          ? "bg-rose-50 text-rose-800 border-rose-200"
                          : "bg-stone-100 text-stone-700 border-stone-200";

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-[#FAF8F2]/60 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-[#092C29]">
                            <Link
                              href="/dashboard/orders"
                              className="hover:underline hover:text-[#C6A15B]"
                            >
                              {order.order_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-stone-700">
                              {order.tableName}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-stone-600 max-w-[200px] truncate">
                            {order.items.length > 0
                              ? order.items
                                  .map((i) => `${i.item_name} ×${i.quantity}`)
                                  .join(", ")
                              : "Order items"}
                          </td>
                          <td className="px-4 py-3 font-bold text-[#092C29] tabular-nums">
                            ₹{order.total.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusColor}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-stone-400 font-mono">
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
          <div className="rounded-2xl border border-[#EAE6DF] bg-white p-5 sm:p-6 shadow-sm shadow-stone-900/5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F0ECE1]">
              <div>
                <h3 className="font-bold text-sm text-[#092C29]">
                  Menu Highlights
                </h3>
                <p className="text-xs text-stone-500 font-medium">Curated dishes on your live menu</p>
              </div>
              <Link
                href="/dashboard/menu"
                className="text-xs font-bold text-[#092C29] hover:underline"
              >
                Manage →
              </Link>
            </div>

            {snapshotItems.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">
                No items added yet.
              </p>
            ) : (
              <div className="space-y-3">
                {snapshotItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#EAE6DF] bg-[#FAF8F2]/60 hover:bg-[#FAF8F2] transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.is_veg ? <VegBadge /> : <NonVegBadge />}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#092C29] truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] font-mono text-stone-500 font-semibold">
                          ₹{Number(item.price).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.has_3d_model && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#EBF4F1] text-[#092C29] border border-[#CDE3DC]"
                          title="Interactive 3D model configured"
                        >
                          3D
                        </span>
                      )}
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.is_available ? "bg-emerald-500" : "bg-stone-300"
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
          <div className="rounded-2xl border border-[#EAE6DF] bg-white p-5 sm:p-6 shadow-sm shadow-stone-900/5">
            <h3 className="font-bold text-sm text-[#092C29] mb-3">
              Operations Readiness
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAF8F2] border border-[#EAE6DF]">
                <span className="w-5 h-5 rounded-full bg-[#EBF4F1] text-[#092C29] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-[#CDE3DC]">
                  ✓
                </span>
                <div>
                  <p className="font-bold text-[#092C29]">Digital Menu Ready</p>
                  <p className="text-stone-500 text-[11px] font-medium">
                    Dishes & categories configured for customers.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAF8F2] border border-[#EAE6DF]">
                <span className="w-5 h-5 rounded-full bg-[#EBF4F1] text-[#092C29] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-[#CDE3DC]">
                  ✓
                </span>
                <div>
                  <p className="font-bold text-[#092C29]">QR Codes Generated</p>
                  <p className="text-stone-500 text-[11px] font-medium">
                    Table QR codes ready for printing & display.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[#FAF8F2] border border-[#EAE6DF]">
                <span className="w-5 h-5 rounded-full bg-[#EBF4F1] text-[#092C29] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-[#CDE3DC]">
                  ✓
                </span>
                <div>
                  <p className="font-bold text-[#092C29]">AR Experience Active</p>
                  <p className="text-stone-500 text-[11px] font-medium">
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