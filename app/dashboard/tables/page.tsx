"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/lib/supabase";

type Restaurant = { id: string; name: string };
type RestaurantTable = {
  id: string;
  restaurant_id: string;
  table_number: string | number;
  name: string | null;
  is_active: boolean;
  created_at: string;
};
type TableForm = { table_number: string; name: string };

const emptyForm: TableForm = { table_number: "", name: "" };

export default function TablesPage() {
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
      setError("Set up your restaurant in Menu Management before adding tables.");
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

    const payload = { table_number: form.table_number.trim(), name: form.name.trim() || null };
    const result = editingTable
      ? await supabase
          .from("restaurant_tables")
          .update(payload)
          .eq("id", editingTable.id)
          .eq("restaurant_id", restaurant.id)
      : await supabase
          .from("restaurant_tables")
          .insert({ ...payload, restaurant_id: restaurant.id });

    if (result.error) {
      setError(result.error.message);
    } else {
      closeForm();
      await loadTables(restaurant.id);
      notify(editingTable ? "Table updated." : "Table added.");
    }
    setSaving(false);
  }

  async function toggleTable(table: RestaurantTable) {
    if (!restaurant) return;
    const { error: toggleError } = await supabase
      .from("restaurant_tables")
      .update({ is_active: !table.is_active })
      .eq("id", table.id)
      .eq("restaurant_id", restaurant.id);

    if (toggleError) setError(toggleError.message);
    else {
      await loadTables(restaurant.id);
      notify(table.is_active ? "Table deactivated." : "Table activated.");
    }
  }

  async function deleteTable(table: RestaurantTable) {
    if (!restaurant || !window.confirm(`Delete ${displayTable(table)}?`)) return;
    const { error: deleteError } = await supabase
      .from("restaurant_tables")
      .delete()
      .eq("id", table.id)
      .eq("restaurant_id", restaurant.id);

    if (deleteError) setError(deleteError.message);
    else {
      await loadTables(restaurant.id);
      notify("Table deleted.");
    }
  }

  async function copyUrl(table: RestaurantTable) {
    try {
      await navigator.clipboard.writeText(tableUrl(table.id));
      setCopiedTableId(table.id);
      window.setTimeout(() => setCopiedTableId(""), 2000);
    } catch {
      setError("Could not copy the QR URL. Copy it from the browser address bar instead.");
    }
  }

  function downloadQr(table: RestaurantTable) {
    const canvas = document.getElementById(`qr-${table.id}`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `ar-menu-${String(table.table_number).replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function openForm(table?: RestaurantTable) {
    setEditingTable(table ?? null);
    setForm(table ? { table_number: String(table.table_number), name: table.name ?? "" } : { ...emptyForm });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingTable(null);
    setForm({ ...emptyForm });
  }

  if (loading) return <StatusScreen message="Loading your tables..." />;

  if (!restaurant) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
        <div className="mx-auto max-w-2xl rounded-3xl border bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">Tables & QR</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Restaurant setup required</h1>
          <p className="mt-3 text-slate-500">{error}</p>
          <button onClick={() => router.push("/dashboard/menu")} className="mt-6 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600">Open Menu Management</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white px-4 py-5 sm:px-6 md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">{restaurant.name}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Tables & QR</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-500">Give every table its own secure QR code so guests land at the right menu.</p>
          </div>
          <button onClick={() => openForm()} className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600">+ Add Table</button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
        {error && <Alert message={error} />}
        {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div>}
        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Total tables" value={tables.length} />
          <SummaryCard label="Active tables" value={tables.filter((table) => table.is_active).length} />
          <SummaryCard label="QR destinations" value={tables.filter((table) => table.is_active).length} />
        </div>

        {tables.length === 0 ? (
          <section className="rounded-2xl border bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-2xl">⌁</div>
            <h2 className="mt-5 text-lg font-bold">No tables yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Add your first table to generate a unique QR code for its customer menu.</p>
            <button onClick={() => openForm()} className="mt-6 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">Add your first table</button>
          </section>
        ) : (
          <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {tables.map((table) => (
              <TableCard key={table.id} table={table} url={tableUrl(table.id)} copied={copiedTableId === table.id} onCopy={() => copyUrl(table)} onDownload={() => downloadQr(table)} onEdit={() => openForm(table)} onDelete={() => deleteTable(table)} onToggle={() => toggleTable(table)} />
            ))}
          </section>
        )}
      </div>

      {showForm && <Modal title={editingTable ? "Edit table" : "Add table"} onClose={closeForm}>
        <form onSubmit={saveTable} className="space-y-5">
          <TextField label="Table number" value={form.table_number} required placeholder="e.g. 1, Outdoor 1, VIP 1" onChange={(value) => setForm({ ...form, table_number: value })} />
          <TextField label="Table name (optional)" value={form.name} placeholder="e.g. Window seat" onChange={(value) => setForm({ ...form, name: value })} />
          <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={closeForm} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button disabled={saving} className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60">{saving ? "Saving..." : editingTable ? "Save changes" : "Add table"}</button></div>
        </form>
      </Modal>}
    </main>
  );
}

function displayTable(table: RestaurantTable) { return table.name ? `${table.name} (${table.table_number})` : `Table ${table.table_number}`; }
function StatusScreen({ message }: { message: string }) { return <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6"><div className="rounded-2xl border bg-white px-8 py-7 text-center shadow-sm"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" /><p className="mt-4 text-sm text-slate-500">{message}</p></div></main>; }
function Alert({ message }: { message: string }) { return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>; }
function SummaryCard({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) { return <div className="fixed inset-0 z-10 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6"><div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100">×</button></div><div className="mt-6">{children}</div></div></div>; }
function TextField({ label, value, required, placeholder, onChange }: { label: string; value: string; required?: boolean; placeholder?: string; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}{required && " *"}</span><input value={value} required={required} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>; }

function TableCard({ table, url, copied, onCopy, onDownload, onEdit, onDelete, onToggle }: { table: RestaurantTable; url: string; copied: boolean; onCopy: () => void; onDownload: () => void; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
  return <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${!table.is_active ? "opacity-75" : ""}`}>
    <div className="flex items-start justify-between border-b px-5 py-4"><div><h2 className="font-bold">{displayTable(table)}</h2><p className="mt-1 text-sm text-slate-500">{table.name ? `Table ${table.table_number}` : "Guest table"}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${table.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{table.is_active ? "Active" : "Inactive"}</span></div>
    <div className="flex flex-col items-center px-5 py-6"><div className="rounded-xl border bg-white p-3"><QRCodeCanvas id={`qr-${table.id}`} value={url} size={168} level="M" includeMargin /></div><p className="mt-3 max-w-full truncate text-center text-xs text-slate-400">{url}</p></div>
    <div className="grid grid-cols-2 gap-2 border-t px-5 py-4"><button onClick={onCopy} className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-600 hover:border-orange-300 hover:text-orange-600">{copied ? "Copied" : "Copy URL"}</button><button onClick={onDownload} className="rounded-lg border px-3 py-2 text-sm font-semibold text-slate-600 hover:border-orange-300 hover:text-orange-600">Download QR</button></div>
    <div className="flex items-center justify-between border-t px-5 py-3 text-sm"><div className="flex gap-1"><button onClick={onEdit} className="rounded-lg px-2 py-1.5 text-slate-500 hover:bg-slate-100">Edit</button><button onClick={onDelete} className="rounded-lg px-2 py-1.5 text-red-500 hover:bg-red-50">Delete</button></div><button onClick={onToggle} className="rounded-lg px-2 py-1.5 font-medium text-orange-600 hover:bg-orange-50">{table.is_active ? "Deactivate" : "Activate"}</button></div>
  </article>;
}