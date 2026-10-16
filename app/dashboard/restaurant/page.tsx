"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ExternalLinkIcon,
  CopyIcon,
  CheckIcon,
  StoreIcon,
} from "@/components/ui/Icons";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

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
  const [copiedLink, setCopiedLink] = useState(false);

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
      setError("No restaurant was found for this account. Please create one in Menu Management.");
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
      setError("Enter a valid phone number or leave the field blank.");
      setSaving(false);
      return;
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
      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(imagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`${kind === "logo" ? "Logo" : "Cover image"} upload failed: ${uploadError.message}`);
      }

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
      .update({
        name,
        description: form.description?.trim() || null,
        address: form.address?.trim() || null,
        phone: form.phone?.trim() || null,
        logo_url: logoUrl,
        cover_image_url: coverImageUrl,
      })
      .eq("id", restaurant.id)
      .eq("owner_id", authData.user.id)
      .select("id, name, description, address, phone, logo_url, cover_image_url")
      .single();

    if (updateError) {
      setError(updateError.message);
    } else {
      const updated = data as Restaurant;
      setRestaurant(updated);
      setForm({
        name: updated.name ?? "",
        description: updated.description ?? "",
        address: updated.address ?? "",
        phone: updated.phone ?? "",
        logo_url: updated.logo_url ?? "",
        cover_image_url: updated.cover_image_url ?? "",
      });
      setLogoFile(null);
      setCoverFile(null);
      setSuccess("Restaurant profile saved successfully.");
      window.setTimeout(() => setSuccess(""), 4000);
    }
    setSaving(false);
  }

  function handleCopyMenuLink() {
    if (!restaurant) return;
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    const url = `${origin}/menu/${restaurant.id}/1`;
    void navigator.clipboard.writeText(url);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 2000);
  }

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingIndicator message="Loading restaurant profile..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="pb-3 border-b border-[#EAE6DF]">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#092C29]">
          Restaurant Profile
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1 font-medium">
          Public brand assets, contact information, and dining venue presentation.
        </p>
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

      {/* Customer Menu Link Quick Card */}
      {restaurant && (
        <div className="p-5 rounded-2xl bg-white border border-[#EAE6DF] shadow-sm shadow-stone-900/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#EBF4F1] border border-[#CDE3DC] flex items-center justify-center shrink-0 text-[#092C29]">
              <StoreIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#092C29]">
                Live Public Digital Menu
              </p>
              <p className="text-[11px] font-mono text-stone-400 truncate max-w-xs sm:max-w-md font-medium">
                {typeof window !== "undefined" ? window.location.origin : ""}/menu/{restaurant.id}/1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyMenuLink}
              className="px-3 py-2 rounded-xl border border-[#EAE6DF] hover:bg-[#FAF8F2] text-xs font-bold text-stone-700 flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            >
              {copiedLink ? (
                <>
                  <CheckIcon className="w-3.5 h-3.5 text-[#123F38]" />
                  <span className="text-[#092C29] font-bold">Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon className="w-3.5 h-3.5 text-stone-400" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <Link
              href={`/menu/${restaurant.id}/1`}
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-[#092C29] hover:bg-[#123F38] text-[#FAF8F2] text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <span>Preview Menu</span>
              <ExternalLinkIcon className="w-3.5 h-3.5 text-stone-300" />
            </Link>
          </div>
        </div>
      )}

      {/* Profile Form */}
      {restaurant && (
        <form onSubmit={saveProfile} className="space-y-6">
          {/* Section 1: Brand Imagery */}
          <div className="rounded-2xl border border-[#EAE6DF] bg-white p-6 shadow-sm shadow-stone-900/5 space-y-5">
            <h2 className="text-sm font-bold text-[#092C29] uppercase tracking-wider font-mono">
              Brand Assets &amp; Media
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Logo Upload */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Restaurant Logo
                </label>
                <div className="flex items-start gap-4 p-4 rounded-xl border border-[#EAE6DF] bg-[#FAF8F2]/60">
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white border border-[#EAE6DF] shrink-0 shadow-2xs">
                    {logoFile ? (
                      <Image
                        src={URL.createObjectURL(logoFile)}
                        alt="Logo preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : form.logo_url ? (
                      <Image
                        src={form.logo_url}
                        alt="Restaurant logo"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-mono font-bold text-lg text-stone-400">
                        {form.name ? form.name.charAt(0).toUpperCase() : "R"}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <p className="text-xs text-stone-500 font-medium">
                      Square format (500×500px). JPG, PNG, or WebP up to 5 MB.
                    </p>
                    <div className="flex items-center gap-2">
                      <label className="px-3 py-1.5 rounded-xl border border-[#EAE6DF] bg-white hover:bg-[#FAF8F2] text-xs font-bold text-stone-700 cursor-pointer transition shadow-2xs">
                        <span>{logoFile || form.logo_url ? "Change" : "Upload"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > MAX_IMAGE_SIZE) {
                                setError("Logo must be 5 MB or smaller.");
                                return;
                              }
                              setLogoFile(file);
                            }
                          }}
                        />
                      </label>
                      {(logoFile || form.logo_url) && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null);
                            setForm({ ...form, logo_url: "" });
                          }}
                          className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cover Banner Upload */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Cover Banner
                </label>
                <div className="p-4 rounded-xl border border-[#EAE6DF] bg-[#FAF8F2]/60 space-y-3">
                  <div className="relative w-full h-20 rounded-xl overflow-hidden bg-white border border-[#EAE6DF] shadow-2xs">
                    {coverFile ? (
                      <Image
                        src={URL.createObjectURL(coverFile)}
                        alt="Cover preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : form.cover_image_url ? (
                      <Image
                        src={form.cover_image_url}
                        alt="Cover banner"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-mono text-xs text-stone-400 font-medium">
                        No cover banner uploaded
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-400 font-medium">16:9 widescreen recommended</span>
                    <label className="px-3 py-1.5 rounded-xl border border-[#EAE6DF] bg-white hover:bg-[#FAF8F2] text-xs font-bold text-stone-700 cursor-pointer transition shadow-2xs">
                      <span>{coverFile || form.cover_image_url ? "Change Banner" : "Upload Banner"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > MAX_IMAGE_SIZE) {
                              setError("Cover must be 5 MB or smaller.");
                              return;
                            }
                            setCoverFile(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: General Details */}
          <div className="rounded-2xl border border-[#EAE6DF] bg-white p-6 shadow-sm shadow-stone-900/5 space-y-4">
            <h2 className="text-sm font-bold text-[#092C29] uppercase tracking-wider font-mono">
              Restaurant Details
            </h2>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                Restaurant Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#EAE6DF] text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#092C29]/10 focus:border-[#092C29]"
                placeholder="e.g. The Grand Bistro"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                About &amp; Culinary Concept
              </label>
              <textarea
                rows={3}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[#EAE6DF] text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#092C29]/10 focus:border-[#092C29]"
                placeholder="Short description of your culinary offerings and dining atmosphere..."
              />
            </div>
          </div>

          {/* Section 3: Contact & Address */}
          <div className="rounded-2xl border border-[#EAE6DF] bg-white p-6 shadow-sm shadow-stone-900/5 space-y-4">
            <h2 className="text-sm font-bold text-[#092C29] uppercase tracking-wider font-mono">
              Location &amp; Contact
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form.phone ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#EAE6DF] text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#092C29]/10 focus:border-[#092C29]"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                  Dining Address
                </label>
                <input
                  type="text"
                  value={form.address ?? ""}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#EAE6DF] text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#092C29]/10 focus:border-[#092C29]"
                  placeholder="123 Luxury Blvd, Indiranagar"
                />
              </div>
            </div>
          </div>

          {/* Form Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-[#092C29] hover:bg-[#123F38] text-[#FAF8F2] font-bold text-sm transition shadow-md shadow-stone-900/10 disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Saving Changes..." : "Save Restaurant Profile"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
