"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const IMAGE_BUCKET = "menu-images";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

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
      setLogoFile(null);
      setCoverFile(null);
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
    const name = form.name.trim();
    if (!name) {
      setError("Restaurant name cannot be empty.");
      setSaving(false);
      return;
    }
    if (form.phone && !/^[+\d][\d\s().-]{5,}$/.test(form.phone.trim())) {
      setError("Enter a valid phone number or leave the field empty.");
      setSaving(false);
      return;
    }
    for (const [label, value] of [["Logo URL", form.logo_url], ["Cover image URL", form.cover_image_url]] as const) {
      if (value) {
        try {
          const url = new URL(value);
          if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
        } catch {
          setError(`${label} must be a valid image URL.`);
          setSaving(false);
          return;
        }
      }
    }
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      router.replace("/login");
      setSaving(false);
      return;
    }

    const currentRestaurant = restaurant;
    async function uploadImage(file: File, kind: "logo" | "cover") {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const imagePath = `restaurant/${currentRestaurant.id}/menu/profile-${kind}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(IMAGE_BUCKET).upload(imagePath, file, { cacheControl: "3600", contentType: file.type, upsert: false });
      if (uploadError) throw new Error(`${kind === "logo" ? "Logo" : "Cover image"} upload failed: ${uploadError.message}`);
      return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(imagePath).data.publicUrl;
    }

    let logoUrl = form.logo_url?.trim() || null;
    let coverImageUrl = form.cover_image_url?.trim() || null;
    try {
      if (logoFile) logoUrl = await uploadImage(logoFile, "logo");
      if (coverFile) coverImageUrl = await uploadImage(coverFile, "cover");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Image upload failed.");
      setSaving(false);
      return;
    }

    const { data, error: updateError } = await supabase
      .from("restaurants")
      .update({ name, description: form.description?.trim() || null, address: form.address?.trim() || null, phone: form.phone?.trim() || null, logo_url: logoUrl, cover_image_url: coverImageUrl })
      .eq("id", restaurant.id)
      .eq("owner_id", authData.user.id)
      .select("id, name, description, address, phone, logo_url, cover_image_url")
      .single();

    if (updateError) {
      setError(updateError.message);
    } else {
      setRestaurant(data as Restaurant);
      setForm({ name: data.name ?? "", description: data.description ?? "", address: data.address ?? "", phone: data.phone ?? "", logo_url: data.logo_url ?? "", cover_image_url: data.cover_image_url ?? "" });
      setLogoFile(null);
      setCoverFile(null);
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
            <ImageField label="Logo image" url={form.logo_url ?? ""} file={logoFile} onFileChange={setLogoFile} onRemove={() => { setLogoFile(null); setForm({ ...form, logo_url: "" }); }} />
            <ImageField label="Cover image" url={form.cover_image_url ?? ""} file={coverFile} onFileChange={setCoverFile} onRemove={() => { setCoverFile(null); setForm({ ...form, cover_image_url: "" }); }} />
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

function ImageField({ label, url, file, onFileChange, onRemove }: { label: string; url: string; file: File | null; onFileChange: (file: File | null) => void; onRemove: () => void }) {
  const [fileError, setFileError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function selectFile(selectedFile: File | undefined) {
    setFileError("");
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith("image/")) {
      setFileError("Choose an image file.");
      return;
    }
    if (selectedFile.size > MAX_IMAGE_SIZE) {
      setFileError("Images must be 5 MB or smaller.");
      return;
    }
    setPreviewUrl(URL.createObjectURL(selectedFile));
    onFileChange(selectedFile);
  }

  function removeImage() {
    setPreviewUrl("");
    onRemove();
  }

  const preview = previewUrl || url;
  return <div className="rounded-xl border border-slate-200 p-4"><div className="flex items-start gap-4"><div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">{preview ? <Image src={preview} alt={`${label} preview`} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-400">No image</div>}</div><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-700">{label}</p><p className="mt-1 text-xs text-slate-500">Upload a JPG, PNG, or other image up to 5 MB.</p><div className="mt-3 flex flex-wrap gap-2"><label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-orange-300 hover:text-orange-600"><span>{file ? "Replace image" : "Choose image"}</span><input type="file" accept="image/*" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0])} /></label>{preview && <button type="button" onClick={removeImage} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50">Remove</button>}</div>{fileError && <p className="mt-2 text-xs text-red-600">{fileError}</p>}</div></div></div>;
}
