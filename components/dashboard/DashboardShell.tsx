"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ChartBarIcon,
  UtensilsIcon,
  ReceiptIcon,
  QrCodeIcon,
  StoreIcon,
  SettingsIcon,
  LogOutIcon,
  ExternalLinkIcon,
  MenuToggleIcon,
  CloseIcon,
} from "@/components/ui/Icons";

export type NavItem = {
  href: string;
  label: string;
  iconText: string;
  IconComponent: React.ComponentType<{ className?: string }>;
};

export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    iconText: "📊",
    IconComponent: ChartBarIcon,
  },
  {
    href: "/dashboard/menu",
    label: "Menu",
    iconText: "🍔",
    IconComponent: UtensilsIcon,
  },
  {
    href: "/dashboard/orders",
    label: "Orders",
    iconText: "🛒",
    IconComponent: ReceiptIcon,
  },
  {
    href: "/dashboard/tables",
    label: "Tables & QR",
    iconText: "📱",
    IconComponent: QrCodeIcon,
  },
  {
    href: "/dashboard/restaurant",
    label: "Restaurant",
    iconText: "🏪",
    IconComponent: StoreIcon,
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    iconText: "⚙️",
    IconComponent: SettingsIcon,
  },
];

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [restaurantName, setRestaurantName] = useState("My Restaurant");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Load user & restaurant basic profile
  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      if (isMounted) {
        setUserEmail(authData.user.email ?? "Owner");
      }

      const { data: rest } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("owner_id", authData.user.id)
        .maybeSingle();

      if (rest && isMounted) {
        setRestaurantName(rest.name || "My Restaurant");
        setRestaurantId(rest.id);
      }
    }

    void loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // Determine active item
  const currentNav =
    DASHBOARD_NAV_ITEMS.find((item) =>
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(item.href)
    ) ?? DASHBOARD_NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-[#F7FAF5] text-[#1D2923] flex flex-col font-sans selection:bg-[#DDF5E8] selection:text-[#168548]">
      <div className="flex flex-1 min-h-screen">
        {/* ====================================================================
            DESKTOP SIDEBAR (Clean, White, Grasshopper-Inspired SaaS Workspace)
           ==================================================================== */}
        <aside className="hidden lg:flex w-64 flex-col bg-white text-[#1D2923] border-r border-[#DCE7DC] select-none z-20 shrink-0 shadow-xs">
          {/* Header Brand */}
          <div className="h-16 px-5 border-b border-[#DCE7DC] flex items-center justify-between bg-white">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group focus:outline-none"
            >
              <div className="w-8 h-8 rounded-xl bg-[#168548] flex items-center justify-center font-mono font-bold text-xs text-white shadow-xs group-hover:bg-[#11733D] transition-colors">
                AR
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-[#1D2923] leading-tight">
                  AR MENU
                </span>
                <span className="text-[10px] font-mono tracking-widest text-[#687B70] uppercase">
                  OPERATIONS
                </span>
              </div>
            </Link>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF7EF] border border-[#DCE7DC] text-[10px] font-semibold text-[#168548]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#218653] animate-pulse" />
              LIVE
            </span>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 px-3 py-5 overflow-y-auto space-y-6">
            <div>
              <p className="px-3 text-[10px] font-mono uppercase tracking-[0.2em] text-[#687B70] font-semibold mb-2.5">
                MANAGEMENT
              </p>
              <nav className="space-y-1">
                {DASHBOARD_NAV_ITEMS.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                        isActive
                          ? "bg-[#EAF7EF] text-[#168548] font-semibold shadow-xs border-l-3 border-[#168548]"
                          : "text-[#687B70] hover:text-[#1D2923] hover:bg-[#F0F5EF]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base leading-none select-none">
                          {item.iconText}
                        </span>
                        <span>{item.label}</span>
                      </div>
                      <item.IconComponent
                        className={`w-4 h-4 transition-transform ${
                          isActive
                            ? "text-[#168548]"
                            : "text-[#687B70] group-hover:text-[#1D2923]"
                        }`}
                      />
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Bottom Account & Meta Card */}
          <div className="p-3 border-t border-[#DCE7DC] bg-[#F7FAF5]">
            <div className="p-3 rounded-xl bg-white border border-[#DCE7DC] shadow-xs">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold text-[#1D2923] truncate">
                  {restaurantName}
                </span>
                <span className="text-[10px] font-mono text-[#168548] shrink-0 font-bold bg-[#EAF7EF] px-1.5 py-0.5 rounded">
                  OWNER
                </span>
              </div>
              <p className="text-[11px] text-[#687B70] truncate mb-3">
                {userEmail || "Signed in"}
              </p>

              <div className="flex items-center gap-2 pt-2 border-t border-[#DCE7DC]">
                {restaurantId && (
                  <Link
                    href={`/menu/${restaurantId}/1`}
                    target="_blank"
                    className="flex-1 py-1.5 px-2 rounded-lg bg-[#EAF7EF] hover:bg-[#DDF5E8] text-[#168548] text-xs font-semibold transition flex items-center justify-center gap-1.5"
                    title="Preview customer table menu"
                  >
                    <span>View Menu</span>
                    <ExternalLinkIcon className="w-3 h-3 text-[#168548]" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="py-1.5 px-2.5 rounded-lg hover:bg-rose-50 text-[#687B70] hover:text-rose-600 text-xs font-medium transition flex items-center justify-center gap-1 border border-transparent hover:border-rose-200"
                  title="Sign out of dashboard"
                >
                  <LogOutIcon className="w-3.5 h-3.5" />
                  <span>Exit</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ====================================================================
            MOBILE / TABLET DRAWER
           ==================================================================== */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-[#17352A]/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-out Menu */}
            <div className="relative w-72 max-w-[85vw] bg-white text-[#1D2923] flex flex-col z-10 border-r border-[#DCE7DC] shadow-2xl">
              <div className="h-16 px-5 border-b border-[#DCE7DC] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#168548] flex items-center justify-center font-mono font-bold text-xs text-white">
                    AR
                  </div>
                  <span className="font-bold text-sm tracking-tight text-[#1D2923]">
                    AR MENU
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-[#687B70] hover:text-[#1D2923] hover:bg-[#F0F5EF]"
                  aria-label="Close menu"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 px-3 py-5 overflow-y-auto space-y-6">
                <div>
                  <p className="px-3 text-[11px] font-mono uppercase tracking-[0.16em] text-[#687B70] font-semibold mb-2">
                    MANAGEMENT
                  </p>
                  <nav className="space-y-1">
                    {DASHBOARD_NAV_ITEMS.map((item) => {
                      const isActive =
                        item.href === "/dashboard"
                          ? pathname === "/dashboard"
                          : pathname.startsWith(item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                            isActive
                              ? "bg-[#EAF7EF] text-[#168548] font-semibold border-l-3 border-[#168548]"
                              : "text-[#687B70] hover:text-[#1D2923] hover:bg-[#F0F5EF]"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base leading-none">
                              {item.iconText}
                            </span>
                            <span>{item.label}</span>
                          </div>
                          <item.IconComponent className={`w-4 h-4 ${isActive ? "text-[#168548]" : "text-[#687B70]"}`} />
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              </div>

              <div className="p-4 border-t border-[#DCE7DC] bg-[#F7FAF5]">
                <p className="text-xs font-semibold text-[#1D2923] truncate">
                  {restaurantName}
                </p>
                <p className="text-[11px] text-[#687B70] truncate mb-3">
                  {userEmail || "Signed in"}
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-rose-50 text-rose-600 text-xs font-medium flex items-center justify-center gap-2 border border-[#DCE7DC] hover:border-rose-200 transition"
                >
                  <LogOutIcon className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            MAIN WORKSPACE AREA
           ==================================================================== */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F7FAF5]">
          {/* Top Operational Bar */}
          <header className="h-16 px-4 sm:px-6 lg:px-8 bg-white/90 backdrop-blur-md border-b border-[#DCE7DC] flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-2xs">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-xl text-[#687B70] hover:text-[#1D2923] hover:bg-[#F0F5EF] border border-[#DCE7DC]"
                aria-label="Open sidebar navigation"
              >
                <MenuToggleIcon className="w-5 h-5" />
              </button>

              {/* Breadcrumb / Section Header */}
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="text-[#687B70] font-medium hidden sm:inline">
                  Management
                </span>
                <span className="text-[#DCE7DC] hidden sm:inline">/</span>
                <span className="font-bold text-[#1D2923]">
                  {currentNav.label}
                </span>
              </div>
            </div>

            {/* Right Status Actions */}
            <div className="flex items-center gap-3">
              {/* Restaurant Status Badge */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF7EF] border border-[#DCE7DC] text-xs font-medium text-[#1D2923]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#218653] animate-pulse" />
                <span className="truncate max-w-[150px] font-semibold">{restaurantName}</span>
              </div>

              {/* Quick Customer Menu Test Link */}
              {restaurantId && (
                <Link
                  href={`/menu/${restaurantId}/1`}
                  target="_blank"
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE7DC] bg-white hover:bg-[#EAF7EF] text-[#1D2923] hover:text-[#168548] text-xs font-semibold transition shadow-2xs"
                >
                  <span>Customer Menu</span>
                  <ExternalLinkIcon className="w-3.5 h-3.5 text-[#687B70]" />
                </Link>
              )}

              {/* User Avatar / Logout */}
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-xl bg-[#168548] text-white flex items-center justify-center font-bold text-xs select-none shadow-xs border border-[#DDF5E8]"
                  title={userEmail || "Restaurant Admin"}
                >
                  {restaurantName ? restaurantName.charAt(0).toUpperCase() : "R"}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#687B70] hover:text-[#1D2923] hover:bg-[#F0F5EF] transition"
                  title="Sign out"
                >
                  <LogOutIcon className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </header>

          {/* Main Route Content View */}
          <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
