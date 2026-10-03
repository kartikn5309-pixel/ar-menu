"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LogOutIcon,
  CheckIcon,
  CopyIcon,
  ArCubeIcon,
} from "@/components/ui/Icons";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Preference states (stored in localStorage for fast immediate client toggle)
  const [acceptingOrders, setAcceptingOrders] = useState(true);
  const [arViewerEnabled, setArViewerEnabled] = useState(true);
  const [orderChimeEnabled, setOrderChimeEnabled] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadUser() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      if (isMounted) {
        setUserEmail(authData.user.email ?? "");
      }

      const { data: rest } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("owner_id", authData.user.id)
        .maybeSingle();

      if (rest && isMounted) {
        setRestaurantId(rest.id);
        setRestaurantName(rest.name || "");
      }

      // Load client prefs
      if (typeof window !== "undefined") {
        setAcceptingOrders(localStorage.getItem("ar_menu_accepting_orders") !== "false");
        setArViewerEnabled(localStorage.getItem("ar_menu_ar_enabled") !== "false");
        setOrderChimeEnabled(localStorage.getItem("ar_menu_chime_enabled") !== "false");
      }

      if (isMounted) setLoading(false);
    }

    void loadUser();
    return () => {
      isMounted = false;
    };
  }, [router]);

  function handleSavePreferences() {
    if (typeof window !== "undefined") {
      localStorage.setItem("ar_menu_accepting_orders", String(acceptingOrders));
      localStorage.setItem("ar_menu_ar_enabled", String(arViewerEnabled));
      localStorage.setItem("ar_menu_chime_enabled", String(orderChimeEnabled));
    }
    setSaveSuccess(true);
    window.setTimeout(() => setSaveSuccess(false), 3000);
  }

  function handleCopyRestaurantId() {
    if (!restaurantId) return;
    void navigator.clipboard.writeText(restaurantId);
    setCopiedId(true);
    window.setTimeout(() => setCopiedId(false), 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-sm font-mono text-zinc-400">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="pb-2 border-b border-zinc-200">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Settings &amp; Preferences
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Account credentials, dining service behavior, and operational controls.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
          <CheckIcon className="w-4 h-4 text-emerald-600" />
          <span>Operational preferences saved successfully.</span>
        </div>
      )}

      {/* Section 1: Account Information */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-mono">
            Owner Account
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Credentials and identification for this restaurant organization.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 rounded-lg border border-zinc-100 bg-zinc-50/60">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
              Signed In Email
            </span>
            <span className="text-sm font-semibold text-zinc-900 mt-0.5 block truncate">
              {userEmail}
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-zinc-100 bg-zinc-50/60">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
              Restaurant Name
            </span>
            <span className="text-sm font-semibold text-zinc-900 mt-0.5 block truncate">
              {restaurantName || "My Restaurant"}
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-zinc-100 bg-zinc-50/60">
            <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
              Account Role
            </span>
            <span className="text-sm font-semibold text-zinc-900 mt-0.5 block">
              Restaurant Administrator
            </span>
          </div>

          <div className="p-3.5 rounded-lg border border-zinc-100 bg-zinc-50/60 sm:col-span-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Restaurant Identifier (UUID)
              </span>
              <span className="text-xs font-mono text-zinc-700 mt-0.5 block truncate">
                {restaurantId || "Not assigned"}
              </span>
            </div>
            {restaurantId && (
              <button
                type="button"
                onClick={handleCopyRestaurantId}
                className="px-2.5 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-medium shrink-0 flex items-center gap-1 transition"
              >
                {copiedId ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Dining Service Controls */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-mono">
            Dining Service &amp; Ordering
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure how tables and orders function during dining hours.
          </p>
        </div>

        <div className="divide-y divide-zinc-100 pt-2">
          {/* Setting 1: Accepting Orders */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                Accept Customer Orders Online
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                When disabled, customers can view the menu in AR but cannot submit new order tickets.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={acceptingOrders}
                onChange={(e) => setAcceptingOrders(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-zinc-900" />
            </label>
          </div>

          {/* Setting 2: AR Viewing */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                <ArCubeIcon className="w-4 h-4 text-emerald-700" />
                <span>Augmented Reality (AR) Tabletop Placement</span>
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Allow diners on iOS QuickLook &amp; Android SceneViewer to place 3D dishes on their table.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={arViewerEnabled}
                onChange={(e) => setArViewerEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-zinc-900" />
            </label>
          </div>

          {/* Setting 3: Audio Order Chime */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                Incoming Order Notification Banner
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Display floating toast banners when new tickets are placed in real-time.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={orderChimeEnabled}
                onChange={(e) => setOrderChimeEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-zinc-900" />
            </label>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-100 flex justify-end">
          <button
            type="button"
            onClick={handleSavePreferences}
            className="px-5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition shadow-xs"
          >
            Save Service Preferences
          </button>
        </div>
      </section>

      {/* Section 3: Currency & Locale */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-mono">
            Currency &amp; Localization
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Regional pricing format for menu items and guest receipts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
              Operating Currency
            </label>
            <input
              type="text"
              readOnly
              value="₹ INR (Indian Rupee)"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
              Timezone
            </label>
            <input
              type="text"
              readOnly
              value="Asia/Kolkata (IST • UTC+05:30)"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-zinc-600 cursor-not-allowed"
            />
          </div>
        </div>
      </section>

      {/* Section 4: Security & Sign Out */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-900 uppercase tracking-wider font-mono">
            Session &amp; Security
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Terminate administrative sessions or sign out of this device.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Sign Out of Console</p>
            <p className="text-xs text-zinc-500">
              Closes current restaurant management session on this browser.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition flex items-center gap-1.5"
          >
            <LogOutIcon className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </section>
    </div>
  );
}
