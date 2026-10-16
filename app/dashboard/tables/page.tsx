"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import {
  SearchIcon,
  PlusIcon,
  CopyIcon,
  CheckIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EditIcon,
  TrashIcon,
  CloseIcon,
  QrCodeIcon,
} from "@/components/ui/Icons";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

type Restaurant = { id: string; name: string };

type RestaurantTable = {
  id: string;
  restaurant_id: string;
  table_number: string | number;
  name: string | null;
  is_active: boolean;
  created_at: string;
};

type TableForm = {
  table_number: string;
  name: string;
};

const emptyForm: TableForm = {
  table_number: "",
  name: "",
};

export default function TablesManagementPage() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [form, setForm] = useState<TableForm>(emptyForm);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copiedTableId, setCopiedTableId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }

    const { data: restaurantData, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name")
      .eq("owner_id", authData.user.id)
      .maybeSingle();

    if (restaurantError) {
      setError(restaurantError.message);
      setLoading(false);
      return;
    }

    if (!restaurantData) {
      setError("Please configure your restaurant in Menu Management before managing tables.");
      setLoading(false);
      return;
    }

    setRestaurant(restaurantData as Restaurant);
    await loadTables(restaurantData.id);
    setLoading(false);
  }

  async function loadTables(restaurantId: string) {
    const { data, error: tableError } = await supabase
      .from("restaurant_tables")
      .select("id, restaurant_id, table_number, name, is_active, created_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true });

    if (tableError) setError(tableError.message);
    else setTables((data ?? []) as RestaurantTable[]);
  }

  function notify(message: string) {
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 3500);
  }

  function tableUrl(tableId: string) {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    return `${origin}/menu/${restaurant?.id}/${tableId}`;
  }

  async function saveTable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurant || !form.table_number.trim()) return;
    setSaving(true);
    setError("");

    const payload = {
      table_number: form.table_number.trim(),
      name: form.name.trim() || null,
    };

    const result = editingTable
      ? await supabase
          .from("restaurant_tables")
          .update(payload)
          .eq("id", editingTable.id)
          .eq("restaurant_id", restaurant.id)
      : await supabase
          .from("restaurant_tables")
          .insert({
            ...payload,
            restaurant_id: restaurant.id,
            is_active: true,
          });

    if (result.error) {
      setError(result.error.message);
    } else {
      closeForm();
      await loadTables(restaurant.id);
      notify(editingTable ? "Table updated." : "Table created.");
    }
    setSaving(false);
  }

  async function toggleTable(table: RestaurantTable) {
    if (!restaurant) return;
    setError("");
    const { error: toggleError } = await supabase
      .from("restaurant_tables")
      .update({ is_active: !table.is_active })
      .eq("id", table.id)
      .eq("restaurant_id", restaurant.id);

    if (toggleError) setError(toggleError.message);
    else {
      await loadTables(restaurant.id);
      notify(`Table ${table.table_number} marked ${!table.is_active ? "active" : "inactive"}.`);
    }
  }

  async function deleteTable(table: RestaurantTable) {
    if (!restaurant) return;
    if (!confirm(`Are you sure you want to delete Table ${table.table_number}? Existing printed QR codes for this table will no longer work.`)) return;
    setError("");

    const { error: deleteError } = await supabase
      .from("restaurant_tables")
      .delete()
      .eq("id", table.id)
      .eq("restaurant_id", restaurant.id);

    if (deleteError) setError(deleteError.message);
    else {
      await loadTables(restaurant.id);
      notify(`Table ${table.table_number} deleted.`);
    }
  }

  async function copyUrl(table: RestaurantTable) {
    try {
      await navigator.clipboard.writeText(tableUrl(table.id));
      setCopiedTableId(table.id);
      window.setTimeout(() => setCopiedTableId(""), 2000);
    } catch {
      setError("Could not copy URL to clipboard.");
    }
  }

  function downloadQr(table: RestaurantTable) {
    const canvas = document.getElementById(`qr-${table.id}`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `ar-menu-table-${String(table.table_number).replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function openForm(table?: RestaurantTable) {
    setEditingTable(table ?? null);
    setForm(
      table
        ? { table_number: String(table.table_number), name: table.name ?? "" }
        : { table_number: String(tables.length + 1), name: "" }
    );
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTable(null);
    setForm({ ...emptyForm });
  }

  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables;
    const q = searchQuery.toLowerCase();
    return tables.filter(
      (t) =>
        String(t.table_number).toLowerCase().includes(q) ||
        (t.name || "").toLowerCase().includes(q)
    );
  }, [tables, searchQuery]);

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingIndicator message="Loading dining tables &amp; QR codes..." />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="max-w-2xl mx-auto p-8 rounded-xl bg-white border border-zinc-200 text-center shadow-2xs">
        <h2 className="text-xl font-bold text-zinc-900">Setup Required</h2>
        <p className="text-sm text-zinc-500 mt-2 mb-6">
          {error || "Set up your restaurant profile first."}
        </p>
        <Link
          href="/dashboard/menu"
          className="px-4 py-2.5 rounded-lg bg-zinc-900 text-white font-semibold text-xs inline-block"
        >
          Open Menu Setup
        </Link>
      </div>
    );
  }

  const activeCount = tables.filter((t) => t.is_active).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAE6DF]">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#092C29]">
            Tables &amp; QR Management
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
            Configure floor tables and generate high-resolution QR codes for physical table dining.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openForm()}
          className="px-4 py-2.5 rounded-xl bg-[#092C29] hover:bg-[#123F38] text-[#FAF8F2] text-xs font-bold transition shadow-md shadow-stone-900/10 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Add Table</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-[#EBF4F1] border border-[#CDE3DC] text-[#092C29] text-sm font-medium">
          {success}
        </div>
      )}

      {/* Metrics Row */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#EAE6DF] shadow-sm shadow-stone-900/5">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-stone-400 font-bold block">
            TOTAL TABLES
          </span>
          <span className="text-2xl font-black text-[#092C29] mt-1 block">
            {tables.length}
          </span>
          <p className="text-[11px] text-stone-400 mt-1 font-medium">Configured in floor plan</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EAE6DF] shadow-sm shadow-stone-900/5">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-stone-400 font-bold block">
            ACTIVE FOR GUESTS
          </span>
          <span className="text-2xl font-black text-[#123F38] mt-1 block">
            {activeCount}
          </span>
          <p className="text-[11px] text-stone-400 mt-1 font-medium">Accepting customer scans</p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#EAE6DF] shadow-sm shadow-stone-900/5">
          <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-stone-400 font-bold block">
            QR ANCHORS READY
          </span>
          <span className="text-2xl font-black text-[#092C29] mt-1 block">
            {activeCount}
          </span>
          <p className="text-[11px] text-stone-400 mt-1 font-medium">Direct AR table gateways</p>
        </div>
      </section>

      {/* Search Toolbar */}
      <section className="p-4 rounded-2xl bg-white border border-[#EAE6DF] shadow-sm shadow-stone-900/5 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search table number or label..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#EAE6DF] text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#092C29]/10 focus:border-[#092C29]"
          />
        </div>

        <span className="text-xs text-stone-500 font-mono hidden sm:inline font-semibold">
          Showing {filteredTables.length} of {tables.length} tables
        </span>
      </section>

      {/* Tables Grid */}
      <section>
        {tables.length === 0 ? (
          <div className="rounded-2xl border border-[#EAE6DF] bg-white p-12 text-center shadow-sm shadow-stone-900/5">
            <QrCodeIcon className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#092C29]">No tables created yet</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto font-medium">
              Add tables to automatically generate scannable QR codes for your dining guests.
            </p>
            <button
              type="button"
              onClick={() => openForm()}
              className="mt-4 px-4 py-2.5 rounded-xl bg-[#092C29] text-[#FAF8F2] font-bold text-xs hover:bg-[#123F38] transition cursor-pointer"
            >
              + Create First Table
            </button>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="rounded-2xl border border-[#EAE6DF] bg-white p-8 text-center shadow-sm shadow-stone-900/5 text-xs text-stone-500 font-medium">
            No tables matching &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTables.map((table) => {
              const url = tableUrl(table.id);
              const isCopied = copiedTableId === table.id;

              return (
                <article
                  key={table.id}
                  className={`rounded-2xl border bg-white shadow-sm shadow-stone-900/5 overflow-hidden transition-all flex flex-col justify-between ${
                    table.is_active
                      ? "border-[#EAE6DF] hover:border-[#C6A15B]/50"
                      : "border-[#EAE6DF] opacity-60 bg-[#FAF8F2]/50"
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-5 border-b border-[#F0ECE1] flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-[#092C29]">
                        {table.name ? `${table.name} (T-${table.table_number})` : `Table ${table.table_number}`}
                      </h3>
                      <p className="text-[11px] font-mono text-stone-400 mt-0.5">
                        ID: {table.id.slice(0, 8)}...
                      </p>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        table.is_active
                          ? "bg-[#EBF4F1] text-[#092C29] border-[#CDE3DC]"
                          : "bg-stone-100 text-stone-500 border-stone-200"
                      }`}
                    >
                      {table.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* QR Canvas Centerpiece */}
                  <div className="p-6 flex flex-col items-center justify-center bg-[#FAF8F2]">
                    <div className="p-3 bg-white rounded-2xl border border-[#EAE6DF] shadow-sm shadow-stone-900/5">
                      <QRCodeCanvas
                        id={`qr-${table.id}`}
                        value={url}
                        size={150}
                        level="M"
                        includeMargin
                      />
                    </div>
                    <span className="text-[10px] font-mono text-stone-400 mt-2.5 font-semibold">
                      Scan to open Table {table.table_number} menu
                    </span>
                  </div>

                  {/* Link Snippet & Copy Action */}
                  <div className="px-4 py-2.5 bg-[#FAF8F2]/60 border-t border-[#F0ECE1] flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-stone-500 truncate select-all">
                      {url}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyUrl(table)}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#FAF8F2] border border-[#EAE6DF] text-stone-700 text-[11px] font-bold shrink-0 flex items-center gap-1 transition cursor-pointer shadow-2xs"
                      title="Copy QR Destination URL"
                    >
                      {isCopied ? (
                        <>
                          <CheckIcon className="w-3 h-3 text-[#123F38]" />
                          <span className="text-[#092C29] font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <CopyIcon className="w-3 h-3 text-stone-400" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Card Bottom Operational Actions */}
                  <div className="p-3.5 border-t border-[#F0ECE1] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => downloadQr(table)}
                        className="px-3 py-1.5 rounded-xl border border-[#EAE6DF] bg-white hover:bg-[#FAF8F2] text-stone-700 text-xs font-bold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                        title="Download printable PNG"
                      >
                        <DownloadIcon className="w-3.5 h-3.5 text-stone-500" />
                        <span>PNG</span>
                      </button>

                      <Link
                        href={`/menu/${restaurant.id}/${table.id}`}
                        target="_blank"
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold flex items-center gap-1 shadow-2xs transition"
                        title="Open customer menu in new tab"
                      >
                        <ExternalLinkIcon className="w-3.5 h-3.5 text-zinc-500" />
                        <span>Test</span>
                      </Link>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleTable(table)}
                        className="px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 rounded hover:bg-zinc-100 transition"
                      >
                        {table.is_active ? "Disable" : "Enable"}
                      </button>

                      <button
                        type="button"
                        onClick={() => openForm(table)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-100 transition"
                        title="Edit table name"
                      >
                        <EditIcon className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteTable(table)}
                        className="p-1 text-zinc-400 hover:text-red-600 rounded hover:bg-red-50 transition"
                        title="Delete table"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ====================================================================
          ADD / EDIT TABLE MODAL
         ==================================================================== */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white border border-zinc-200 shadow-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4">
              <h3 className="font-bold text-base text-zinc-900">
                {editingTable ? "Edit Dining Table" : "Add Dining Table"}
              </h3>
              <button
                type="button"
                onClick={closeForm}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveTable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Table Number / Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={form.table_number}
                  onChange={(e) => setForm({ ...form, table_number: e.target.value })}
                  placeholder="e.g. 1, 04, Patio 2, VIP-1"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Table Name / Section (Optional)
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Window Seat, Balcony Terrace"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition"
                >
                  {saving ? "Saving..." : editingTable ? "Save Changes" : "Create Table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}