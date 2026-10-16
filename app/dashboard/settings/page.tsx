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
import LoadingIndicator from "@/components/ui/LoadingIndicator";

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
      <div className="py-20 flex justify-center">
        <LoadingIndicator message="Loading service preferences..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="pb-3 border-b border-[#EAE6DF]">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#092C29]">
          Settings &amp; Preferences
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
          Account credentials, dining service behavior, and operational controls.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-[#EBF4F1] border border-[#CDE3DC] text-[#092C29] text-sm flex items-center gap-2 font-medium">
          <CheckIcon className="w-4 h-4 text-[#123F38]" />
          <span>Operational preferences saved successfully.</span>
        </div>
      )}

      {/* Section 1: Account Information */}
      <section className="rounded-2xl border border-[#EAE6DF] bg-white p-6 shadow-sm shadow-stone-900/5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#092C29] uppercase tracking-wider font-mono">
            Owner Account
          </h2>
          <p className="text-xs text-stone-500 mt-0.5 font-medium">
            Credentials and identification for this restaurant organization.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl border border-[#EAE6DF] bg-[#FAF8F2]/60">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block font-bold">
              SIGNED IN EMAIL
            </span>
            <span className="text-sm font-bold text-[#092C29] mt-0.5 block truncate">
              {userEmail}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-[#EAE6DF] bg-[#FAF8F2]/60">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block font-bold">
              RESTAURANT NAME
            </span>
            <span className="text-sm font-bold text-[#092C29] mt-0.5 block truncate">
              {restaurantName || "My Restaurant"}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-[#EAE6DF] bg-[#FAF8F2]/60">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block font-bold">
              ACCOUNT ROLE
            </span>
            <span className="text-sm font-bold text-[#092C29] mt-0.5 block">
              Restaurant Administrator
            </span>
          </div>

          <div className="p-4 rounded-xl border border-[#EAE6DF] bg-[#FAF8F2]/60 sm:col-span-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block font-bold">
                RESTAURANT IDENTIFIER (UUID)
              </span>
              <span className="text-xs font-mono text-stone-600 mt-0.5 block truncate font-medium">
                {restaurantId || "Not assigned"}
              </span>
            </div>
            {restaurantId && (
              <button
                type="button"
                onClick={handleCopyRestaurantId}
                className="px-3 py-1.5 rounded-xl border border-[#EAE6DF] bg-white hover:bg-[#FAF8F2] text-stone-700 text-xs font-bold shrink-0 flex items-center gap-1 transition cursor-pointer shadow-2xs"
              >
                {copiedId ? (
                  <>
                    <CheckIcon className="w-3.5 h-3.5 text-[#123F38]" />
                    <span className="text-[#092C29] font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="w-3.5 h-3.5 text-stone-400" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Dining Service Controls */}
      <section className="rounded-2xl border border-[#EAE6DF] bg-white p-6 shadow-sm shadow-stone-900/5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#092C29] uppercase tracking-wider font-mono">
            Dining Service &amp; Ordering
          </h2>
          <p className="text-xs text-stone-500 mt-0.5 font-medium">
            Configure how tables and orders function during dining hours.
          </p>
        </div>

        <div className="divide-y divide-[#F0ECE1] pt-2">
          {/* Setting 1: Accepting Orders */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#092C29]">
                Accept Customer Orders Online
              </p>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">
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
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-[#092C29]" />
            </label>
          </div>

          {/* Setting 2: AR Viewing */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#092C29] flex items-center gap-1.5">
                <ArCubeIcon className="w-4 h-4 text-[#123F38]" />
                <span>Augmented Reality (AR) Tabletop Placement</span>
              </p>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">
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
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-[#092C29]" />
            </label>
          </div>

          {/* Setting 3: Audio Order Chime */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[#092C29]">
                Incoming Order Notification Banner
              </p>
              <p className="text-xs text-stone-500 mt-0.5 font-medium">
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
              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-[#092C29]" />
            </label>
          </div>
        </div>

        <div className="pt-3 border-t border-[#F0ECE1] flex justify-end">
          <button
            type="button"
            onClick={handleSavePreferences}
            className="px-5 py-2.5 rounded-xl bg-[#092C29] hover:bg-[#123F38] text-[#FAF8F2] font-bold text-xs transition shadow-sm cursor-pointer"
          >
            Save Service Preferences
          </button>
        </div>
      </section>

      {/* Section 3: Currency & Locale */}
      <section className="rounded-2xl border border-[#EAE6DF] bg-white p-6 shadow-sm shadow-stone-900/5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#092C29] uppercase tracking-wider font-mono">
            Currency &amp; Localization
          </h2>
          <p className="text-xs text-stone-500 mt-0.5 font-medium">
            Regional pricing format for menu items and guest receipts.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
              Operating Currency
            </label>
            <input
              type="text"
              readOnly
              value="₹ INR (Indian Rupee)"
              className="w-full px-4 py-2.5 rounded-xl border border-[#EAE6DF] bg-[#FAF8F2] text-sm text-stone-700 cursor-not-allowed font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
              Timezone
            </label>
            <input
              type="text"
              readOnly
              value="Asia/Kolkata (IST • UTC+05:30)"
              className="w-full px-4 py-2.5 rounded-xl border border-[#EAE6DF] bg-[#FAF8F2] text-sm text-stone-700 cursor-not-allowed font-medium"
            />
          </div>
        </div>
      </section>

      {/* Section 4: Security & Sign Out */}
      <section className="rounded-2xl border border-[#EAE6DF] bg-white p-6 shadow-sm shadow-stone-900/5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#092C29] uppercase tracking-wider font-mono">
            Session &amp; Security
          </h2>
          <p className="text-xs text-stone-500 mt-0.5 font-medium">
            Terminate administrative sessions or sign out of this device.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-[#092C29]">Sign Out of Console</p>
            <p className="text-xs text-stone-500 font-medium">
              Closes current restaurant management session on this browser.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <LogOutIcon className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </section>
    </div>
  );
}
