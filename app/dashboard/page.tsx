"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const menuItems = [
  { icon: "📊", label: "Overview" },
  { icon: "🍔", label: "Menu" },
  { icon: "🛒", label: "Orders" },
  { icon: "📱", label: "Tables & QR" },
  { icon: "🏪", label: "Restaurant" },
  { icon: "⚙️", label: "Settings" },
];

export default function DashboardPage() {
  const [activeMenu, setActiveMenu] = useState("Overview");
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [overviewError, setOverviewError] = useState("");
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      setOverviewError("");
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        if (authError && process.env.NODE_ENV === "development") console.error("Could not authenticate dashboard owner:", authError);
        if (isMounted) setOverviewError(authError?.message ?? "Please sign in to view the dashboard.");
        if (!authData.user) router.replace("/login");
        return;
      }

      const { data: restaurant, error: restaurantError } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", authData.user.id)
        .maybeSingle();

      if (restaurantError || !restaurant) {
        const message = restaurantError?.message ?? "Restaurant not found.";
        if (process.env.NODE_ENV === "development") console.error("Could not load restaurant overview:", message);
        if (isMounted) setOverviewError(message);
        return;
      }

      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const [menuResult, ordersResult, tablesResult, salesResult] = await Promise.all([
        supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id).gte("created_at", startOfToday.toISOString()).lt("created_at", startOfTomorrow.toISOString()),
        supabase.from("restaurant_tables").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurant.id),
        supabase.from("orders").select("total").eq("restaurant_id", restaurant.id).eq("status", "completed").gte("created_at", startOfToday.toISOString()).lt("created_at", startOfTomorrow.toISOString()),
      ]);

      const queryError = menuResult.error ?? ordersResult.error ?? tablesResult.error ?? salesResult.error;
      if (queryError) {
        if (process.env.NODE_ENV === "development") console.error("Could not load overview statistics:", queryError);
        if (isMounted) setOverviewError(queryError.message);
        return;
      }

      const sales = (salesResult.data ?? []).reduce((total, order) => total + Number(order.total ?? 0), 0);
      if (isMounted) {
        setOverviewStats({
          menuItems: menuResult.count ?? 0,
          orders: ordersResult.count ?? 0,
          tables: tablesResult.count ?? 0,
          sales,
        });
      }
    }

    const refreshOverview = () => void loadOverview();
    void loadOverview();
    window.addEventListener("focus", refreshOverview);
    document.addEventListener("visibilitychange", refreshOverview);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", refreshOverview);
      document.removeEventListener("visibilitychange", refreshOverview);
    };
  }, [router]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (!error) {
      router.push("/login");
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col bg-slate-950 text-white md:flex">
          <div className="border-b border-slate-800 px-6 py-6">
            <h1 className="text-2xl font-bold">
              AR <span className="text-orange-500">MENU</span>
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Restaurant Management
            </p>
          </div>

          <nav className="flex-1 px-4 py-6">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Management
            </p>

            <div className="space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  href={
                    item.label === "Menu"
                      ? "/dashboard/menu"
                      : item.label === "Tables & QR"
                        ? "/dashboard/tables"
                        : item.label === "Orders"
                          ? "/dashboard/orders"
                          : item.label === "Restaurant"
                            ? "/dashboard/restaurant"
                        : "/dashboard"
                  }
                  onClick={() => setActiveMenu(item.label)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                    activeMenu === item.label
                      ? "bg-orange-500 text-white"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="border-t border-slate-800 p-4">
            <div className="rounded-xl bg-slate-900 p-4">
              <p className="text-sm font-semibold">Restaurant Account</p>
              <p className="mt-1 text-xs text-slate-400">
                Logged in successfully
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <section className="flex-1">
          {/* Top Bar */}
          <header className="flex items-center justify-between border-b bg-white px-6 py-5 md:px-8">
            <div>
              <p className="text-sm text-slate-500">Restaurant Portal</p>
              <h2 className="text-xl font-bold">{activeMenu}</h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">Restaurant Admin</p>
                <p className="text-xs text-slate-500">Admin</p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-600">
                R
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-600"
              >
                Logout
              </button>
            </div>
          </header>

          {/* Dashboard */}
          <div className="p-6 md:p-8">
            <div className="mb-8">
              <p className="text-sm font-medium text-orange-500">
                Welcome back 👋
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight">
                Manage your restaurant
              </h1>

              <p className="mt-2 text-slate-500">
                Everything you need to manage your digital menu and orders.
              </p>
            </div>

            {/* Stats */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon="🍔"
                title="Menu Items"
                value={overviewStats ? String(overviewStats.menuItems) : "..."}
                description="Items added"
                href="/dashboard/menu"
              />

              <StatCard
                icon="🛒"
                title="Today's Orders"
                value={overviewStats ? String(overviewStats.orders) : "..."}
                description="Orders received"
                href="/dashboard/orders"
              />

              <StatCard
                icon="📱"
                title="Tables"
                value={overviewStats ? String(overviewStats.tables) : "..."}
                description="Tables created"
                href="/dashboard/tables"
              />

              <StatCard
                icon="💰"
                title="Today's Sales"
                value={overviewStats ? `₹${overviewStats.sales.toFixed(2)}` : "..."}
                description="Total revenue"
                href="/dashboard/orders"
              />
            </div>

            {overviewError && (
              <p className="mt-4 text-sm text-red-600">Could not load overview statistics.</p>
            )}

            {/* Quick Actions */}
            <div className="mt-8">
              <h3 className="text-lg font-bold">Quick Actions</h3>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <ActionCard
                  icon="🍔"
                  title="Add Menu Item"
                  description="Add dishes, prices and images."
                  href="/dashboard/menu?action=add"
                />

                <ActionCard
                  icon="📱"
                  title="Create Table QR"
                  description="Generate QR codes for your tables."
                  href="/dashboard/tables"
                />

                <ActionCard
                  icon="🛒"
                  title="View Orders"
                  description="Check and manage customer orders."
                  href="/dashboard/orders"
                />
              </div>
            </div>

            {/* Getting Started */}
            <div className="mt-8 rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold">Getting Started</h3>

              <div className="mt-5 space-y-4">
                <ProgressItem
                  number="1"
                  title="Set up your restaurant"
                  description="Add your restaurant name and details."
                  href="/dashboard/restaurant"
                />

                <ProgressItem
                  number="2"
                  title="Create your menu"
                  description="Add categories and food items."
                  href="/dashboard/menu"
                />

                <ProgressItem
                  number="3"
                  title="Create table QR codes"
                  description="Connect each table to your digital menu."
                  href="/dashboard/tables"
                />

                <ProgressItem
                  number="4"
                  title="Start receiving orders"
                  description="Customers can scan and order from their table."
                  href="/dashboard/orders"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

type OverviewStats = {
  menuItems: number;
  orders: number;
  tables: number;
  sales: number;
};

function StatCard({
  icon,
  title,
  value,
  description,
  href,
}: {
  icon: string;
  title: string;
  value: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="block rounded-2xl border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-medium text-slate-400">LIVE</span>
      </div>

      <p className="mt-5 text-sm text-slate-500">{title}</p>

      <p className="mt-1 text-3xl font-bold">{value}</p>

      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </Link>
  );
}

function ActionCard({
  icon,
  title,
  description,
  href,
}: {
  icon: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="block rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <span className="text-3xl">{icon}</span>

      <h4 className="mt-4 font-bold">{title}</h4>

      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
    </Link>
  );
}

function ProgressItem({
  number,
  title,
  description,
  href,
}: {
  number: string;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-4 rounded-xl transition hover:bg-orange-50">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-600">
        {number}
      </div>

      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </Link>
  );
}