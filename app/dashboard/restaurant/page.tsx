"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Restaurant = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
};

type RestaurantForm = Omit<Restaurant, "id">;

const emptyForm: RestaurantForm = {
  name: "",
  description: "",
  address: "",
  phone: "",
  logo_url: "",
  cover_image_url: "",
};

export default function RestaurantProfilePage() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [form, setForm] = useState<RestaurantForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const loadRestaurant = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }

    const { data, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, description, address, phone, logo_url, cover_image_url")
      .eq("owner_id", authData.user.id)
      .maybeSingle();

    if (restaurantError) {
      setError(restaurantError.message);
    } else if (!data) {
      setError("No restaurant was found for this account. Set one up in Menu Management first.");
    } else {
      const currentRestaurant = data as Restaurant;
      setRestaurant(currentRestaurant);
      setForm({
        name: currentRestaurant.name ?? "",
        description: currentRestaurant.description ?? "",
        address: currentRestaurant.address ?? "",
        phone: currentRestaurant.phone ?? "",
        logo_url: currentRestaurant.logo_url ?? "",
        cover_image_url: currentRestaurant.cover_image_url ?? "",
      });
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRestaurant(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRestaurant]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurant) return;

    setSaving(true);
    setError("");
    setSuccess("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }

    const { data, error: updateError } = await supabase
      .from("restaurants")
      .update(form)
      .eq("id", restaurant.id)
      .eq("owner_id", authData.user.id)
      .select("id, name, description, address, phone, logo_url, cover_image_url")
      .single();

    if (updateError) {
      setError(updateError.message);
    } else {
      setRestaurant(data as Restaurant);
      setSuccess("Restaurant profile saved successfully.");
    }
    setSaving(false);
  }

  if (loading) return <StatusScreen message="Loading your restaurant profile..." />;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white px-4 py-5 sm:px-6 md:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Restaurant Portal</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Restaurant Profile</h1>
            <p className="mt-2 text-sm text-slate-500">Keep the details guests see on your digital menu up to date.</p>
          </div>
          <button onClick={() => router.push("/dashboard")} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-600">Dashboard</button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
        {error && <Alert message={error} />}
        {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div>}
        {restaurant && <form onSubmit={saveProfile} className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Restaurant name" value={form.name} required onChange={(value) => setForm({ ...form, name: value })} className="sm:col-span-2" />
            <TextArea label="Description" value={form.description ?? ""} onChange={(value) => setForm({ ...form, description: value })} className="sm:col-span-2" />
            <TextField label="Address" value={form.address ?? ""} onChange={(value) => setForm({ ...form, address: value })} />
            <TextField label="Phone number" value={form.phone ?? ""} type="tel" onChange={(value) => setForm({ ...form, phone: value })} />
            <TextField label="Logo URL" value={form.logo_url ?? ""} type="url" onChange={(value) => setForm({ ...form, logo_url: value })} />
            <TextField label="Cover image URL" value={form.cover_image_url ?? ""} type="url" onChange={(value) => setForm({ ...form, cover_image_url: value })} />
          </div>
          <div className="mt-7 flex items-center justify-end border-t pt-5">
            <button disabled={saving} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>}
      </div>
    </main>
  );
}

function StatusScreen({ message }: { message: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6"><div className="rounded-2xl border bg-white px-8 py-7 text-center shadow-sm"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" /><p className="mt-4 text-sm text-slate-500">{message}</p></div></main>;
}

function Alert({ message }: { message: string }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>;
}

function TextField({ label, value, onChange, required, type = "text", className = "" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-sm font-medium text-slate-700">{label}{required && " *"}</span><input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>;
}

function TextArea({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>;
}
