"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Restaurant = { id: string; owner_id: string; name: string; description: string | null; phone: string | null; address: string | null };
type Category = { id: string; name: string; description: string | null; sort_order: number; is_active: boolean };
type MenuItem = { id: string; category_id: string | null; name: string; description: string | null; price: number; image_url: string | null; is_available: boolean; is_veg: boolean; sort_order: number };
type RestaurantForm = Omit<Restaurant, "id" | "owner_id">;
type CategoryForm = Omit<Category, "id">;
type MenuItemForm = Omit<MenuItem, "id">;

const emptyRestaurant: RestaurantForm = { name: "", description: "", phone: "", address: "" };
const emptyCategory: CategoryForm = { name: "", description: "", sort_order: 0, is_active: true };
const emptyMenuItem: MenuItemForm = { category_id: "", name: "", description: "", price: 0, image_url: "", is_available: true, is_veg: false, sort_order: 0 };

export default function MenuManagementPage() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [restaurantForm, setRestaurantForm] = useState(emptyRestaurant);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [itemForm, setItemForm] = useState(emptyMenuItem);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const groupedItems = useMemo(() => categories.map((category) => ({ category, items: items.filter((item) => item.category_id === category.id).sort((a, b) => a.sort_order - b.sort_order) })), [categories, items]);

  useEffect(() => { void loadPage(); }, []);

  useEffect(() => {
    if (!restaurant || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") !== "add") return;
    openItemForm();
    window.history.replaceState(null, "", "/dashboard/menu");
  }, [restaurant]);

  async function loadPage() {
    setLoading(true);
    setError("");
    setRestaurant(null);
    setCategories([]);
    setItems([]);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) { setLoading(false); router.replace("/login"); return; }

    const currentUserId = authData.user.id;
    const { data, error: restaurantError } = await supabase.from("restaurants").select("id, owner_id, name, description, phone, address").eq("owner_id", currentUserId).maybeSingle();
    if (restaurantError) { setError(restaurantError.message); setLoading(false); return; }
    if (!data) { setRestaurant(null); setLoading(false); return; }
    const belongsToCurrentUser = data.owner_id === currentUserId;
    if (!belongsToCurrentUser) { setError("The restaurant record does not belong to the currently signed-in account."); setLoading(false); return; }
    setRestaurant(data as Restaurant);
    await loadMenuData(data.id);
    setLoading(false);
  }

  async function loadMenuData(restaurantId: string) {
    const [categoryResult, itemResult] = await Promise.all([
      supabase.from("categories").select("id, name, description, sort_order, is_active").eq("restaurant_id", restaurantId).order("sort_order", { ascending: true }),
      supabase.from("menu_items").select("id, category_id, name, description, price, image_url, is_available, is_veg, sort_order").eq("restaurant_id", restaurantId).order("sort_order", { ascending: true }),
    ]);
    if (categoryResult.error || itemResult.error) { setError(categoryResult.error?.message ?? itemResult.error?.message ?? "Could not load menu data."); return; }
    setCategories((categoryResult.data ?? []) as Category[]);
    setItems((itemResult.data ?? []) as MenuItem[]);
  }

  function notify(message: string) {
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 3500);
  }

  async function createRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { router.replace("/login"); return; }
    const { data, error: createError } = await supabase.from("restaurants").insert({ ...restaurantForm, owner_id: authData.user.id }).select("id, owner_id, name, description, phone, address").single();
    if (createError) setError(createError.message);
    else { setRestaurant(data as Restaurant); notify("Restaurant created successfully."); }
    setSaving(false);
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!restaurant) return; setSaving(true); setError("");
    const result = editingCategory
      ? await supabase.from("categories").update(categoryForm).eq("id", editingCategory.id).eq("restaurant_id", restaurant.id)
      : await supabase.from("categories").insert({ ...categoryForm, restaurant_id: restaurant.id });
    if (result.error) setError(result.error.message);
    else { closeCategoryForm(); await loadMenuData(restaurant.id); notify(editingCategory ? "Category updated." : "Category created."); }
    setSaving(false);
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!restaurant) return; setSaving(true); setError("");
    if (itemForm.category_id && !categories.some((category) => category.id === itemForm.category_id)) {
      setError("Choose a category belonging to this restaurant."); setSaving(false); return;
    }
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setError("Your session has expired. Please sign in again before editing menu items."); setSaving(false); return;
    }
    const authenticatedUserId = authData.user.id;
    const belongsToCurrentUser = restaurant.owner_id === authenticatedUserId;
    if (!belongsToCurrentUser) {
      setError("This restaurant does not belong to the currently signed-in account."); setSaving(false); return;
    }
    const payload = { ...itemForm, category_id: itemForm.category_id || null, image_url: itemForm.image_url || null };
    const result = editingItem
      ? await supabase.from("menu_items").update(payload).eq("id", editingItem.id).eq("restaurant_id", restaurant.id).select("id, image_url").single()
      : await supabase.from("menu_items").insert({ ...payload, restaurant_id: restaurant.id }).select("id, image_url").single();
    if (result.error || !result.data) { setError(result.error?.message ?? "Could not save menu item."); setSaving(false); return; }

    let imageUrl = result.data.image_url as string | null;
    if (selectedImageFile) {
      setUploadingImage(true);
      const extension = selectedImageFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const imagePath = `restaurant/${restaurant.id}/menu/${crypto.randomUUID()}.${extension}`;
      const bucketName = "menu-images";
      const { data: ownershipCheck } = await supabase.from("restaurants").select("id").eq("id", restaurant.id).eq("owner_id", authenticatedUserId).maybeSingle();
      const restaurantBelongsToUser = ownershipCheck?.id === restaurant.id;
      console.info("[menu-image-upload] pre-upload", { userId: authenticatedUserId, restaurantId: restaurant.id, restaurantBelongsToUser, imagePath, bucketName });
      console.info("[menu-image-upload] file", { fileName: selectedImageFile.name, fileType: selectedImageFile.type, fileSize: selectedImageFile.size, imagePath, bucketName });
      const { error: uploadError } = await supabase.storage.from(bucketName).upload(imagePath, selectedImageFile, { cacheControl: "3600", contentType: selectedImageFile.type, upsert: false });
      if (uploadError) {
        console.error("[menu-image-upload] storage error", {
          message: uploadError.message,
          name: uploadError.name,
          statusCode: uploadError.statusCode,
        });
        if (!editingItem) await supabase.from("menu_items").delete().eq("id", result.data.id).eq("restaurant_id", restaurant.id);
        setError(`Image upload failed: ${uploadError.message}`); setUploadingImage(false); setSaving(false); return;
      }
      imageUrl = supabase.storage.from("menu-images").getPublicUrl(imagePath).data.publicUrl;
    }

    if (imageUrl !== result.data.image_url) {
      const { error: imageUpdateError } = await supabase.from("menu_items").update({ image_url: imageUrl }).eq("id", result.data.id).eq("restaurant_id", restaurant.id);
      if (imageUpdateError) { setError(imageUpdateError.message); setUploadingImage(false); setSaving(false); return; }
    }
    setUploadingImage(false);
    closeItemForm(); await loadMenuData(restaurant.id); notify(editingItem ? "Menu item updated." : "Menu item created.");
    setSaving(false);
  }

  async function deleteCategory(category: Category) {
    if (!restaurant || !window.confirm(`Delete "${category.name}"? Items in this category may also be affected.`)) return;
    const { error: deleteError } = await supabase.from("categories").delete().eq("id", category.id).eq("restaurant_id", restaurant.id);
    if (deleteError) setError(deleteError.message); else { await loadMenuData(restaurant.id); notify("Category deleted."); }
  }

  async function deleteItem(item: MenuItem) {
    if (!restaurant || !window.confirm(`Delete "${item.name}"?`)) return;
    const { error: deleteError } = await supabase.from("menu_items").delete().eq("id", item.id).eq("restaurant_id", restaurant.id);
    if (deleteError) setError(deleteError.message); else { await loadMenuData(restaurant.id); notify("Menu item deleted."); }
  }

  async function toggleCategory(category: Category) {
    if (!restaurant) return;
    const { error: toggleError } = await supabase.from("categories").update({ is_active: !category.is_active }).eq("id", category.id).eq("restaurant_id", restaurant.id);
    if (toggleError) setError(toggleError.message); else await loadMenuData(restaurant.id);
  }

  async function toggleItem(item: MenuItem) {
    if (!restaurant) return;
    const { error: toggleError } = await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id).eq("restaurant_id", restaurant.id);
    if (toggleError) setError(toggleError.message); else await loadMenuData(restaurant.id);
  }

  function openCategoryForm(category?: Category) { setEditingCategory(category ?? null); setCategoryForm(category ? { ...category } : { ...emptyCategory }); setShowCategoryForm(true); }
  function closeCategoryForm() { setShowCategoryForm(false); setEditingCategory(null); setCategoryForm({ ...emptyCategory }); }
  function openItemForm(item?: MenuItem) { setEditingItem(item ?? null); setItemForm(item ? { ...item, category_id: item.category_id ?? "" } : { ...emptyMenuItem }); setSelectedImageFile(null); setImagePreview(item?.image_url ?? ""); setShowItemForm(true); }
  function closeItemForm() { if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview); setShowItemForm(false); setEditingItem(null); setItemForm({ ...emptyMenuItem }); setSelectedImageFile(null); setImagePreview(""); }
  function selectImage(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPG, PNG, or WebP image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Image must be 5 MB or smaller."); return; }
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setSelectedImageFile(file); setImagePreview(URL.createObjectURL(file)); setError("");
  }
  function removeImage() { if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview); setSelectedImageFile(null); setImagePreview(""); setItemForm({ ...itemForm, image_url: "" }); }

  if (loading) return <StatusScreen message="Loading your menu..." />;

  if (!restaurant) return <SetupRestaurant form={restaurantForm} setForm={setRestaurantForm} saving={saving} error={error} onSubmit={createRestaurant} />;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b bg-white px-4 py-5 sm:px-6 md:px-10"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div><p className="text-sm text-slate-500">{restaurant.name}</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Menu Management</h1><p className="mt-2 text-sm text-slate-500">Organize categories and keep every dish current.</p></div><button onClick={() => openCategoryForm()} className="hidden rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-600 sm:block">+ Add Category</button></div></header>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 md:px-10 md:py-8">
        {error && <Alert message={error} />}{success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{success}</div>}
        <div className="flex gap-3 sm:hidden"><button onClick={() => openCategoryForm()} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700">+ Category</button><button onClick={() => openItemForm()} className="flex-1 rounded-xl bg-orange-500 px-3 py-3 text-sm font-semibold text-white">+ Menu Item</button></div>
        <section className="grid gap-4 sm:grid-cols-3"><SummaryCard label="Categories" value={categories.length} /><SummaryCard label="Menu items" value={items.length} /><SummaryCard label="Available now" value={items.filter((item) => item.is_available).length} /></section>
        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6"><div><h2 className="font-bold">Your menu</h2><p className="mt-1 text-sm text-slate-500">Items are grouped by category.</p></div><button onClick={() => openItemForm()} className="hidden rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 sm:block">+ Add Menu Item</button></div>
          {categories.length === 0 ? <EmptyState title="Your menu is ready for its first category" description="Create a category such as Starters, Mains, or Drinks, then add dishes to it." action="Add your first category" onClick={() => openCategoryForm()} /> : <div className="divide-y">{groupedItems.map(({ category, items: categoryItems }) => <div key={category.id} className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="text-lg font-bold">{category.name}</h3><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${category.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{category.is_active ? "Active" : "Hidden"}</span></div>{category.description && <p className="mt-1 text-sm text-slate-500">{category.description}</p>}</div><div className="flex items-center gap-1 text-sm"><button onClick={() => toggleCategory(category)} className="rounded-lg px-2 py-1.5 text-slate-500 hover:bg-slate-100">{category.is_active ? "Hide" : "Show"}</button><button onClick={() => openCategoryForm(category)} className="rounded-lg px-2 py-1.5 text-slate-500 hover:bg-slate-100">Edit</button><button onClick={() => deleteCategory(category)} className="rounded-lg px-2 py-1.5 text-red-500 hover:bg-red-50">Delete</button></div></div>{categoryItems.length === 0 ? <p className="mt-5 rounded-xl border border-dashed px-4 py-5 text-sm text-slate-400">No items in this category yet.</p> : <div className="mt-5 divide-y rounded-xl border">{categoryItems.map((item) => <MenuItemRow key={item.id} item={item} onToggle={() => toggleItem(item)} onEdit={() => openItemForm(item)} onDelete={() => deleteItem(item)} />)}</div>}</div>)}</div>}
        </section>
      </div>
      {showCategoryForm && <Modal title={editingCategory ? "Edit category" : "Add category"} onClose={closeCategoryForm}><form onSubmit={saveCategory} className="space-y-5"><TextField label="Name" value={categoryForm.name} required onChange={(value) => setCategoryForm({ ...categoryForm, name: value })} /><TextArea label="Description" value={categoryForm.description ?? ""} onChange={(value) => setCategoryForm({ ...categoryForm, description: value })} /><NumberField label="Sort order" value={categoryForm.sort_order} onChange={(value) => setCategoryForm({ ...categoryForm, sort_order: value })} /><Checkbox label="Category is active" checked={categoryForm.is_active} onChange={(checked) => setCategoryForm({ ...categoryForm, is_active: checked })} /><FormActions saving={saving} onCancel={closeCategoryForm} submitLabel={editingCategory ? "Save changes" : "Create category"} /></form></Modal>}
      {showItemForm && <Modal title={editingItem ? "Edit menu item" : "Add menu item"} onClose={closeItemForm}><form onSubmit={saveItem} className="space-y-5"><TextField label="Name" value={itemForm.name} required onChange={(value) => setItemForm({ ...itemForm, name: value })} /><TextArea label="Description" value={itemForm.description ?? ""} onChange={(value) => setItemForm({ ...itemForm, description: value })} /><div className="grid gap-5 sm:grid-cols-2"><NumberField label="Price" value={itemForm.price} min={0} step={0.01} onChange={(value) => setItemForm({ ...itemForm, price: value })} /><NumberField label="Sort order" value={itemForm.sort_order} onChange={(value) => setItemForm({ ...itemForm, sort_order: value })} /></div><SelectField label="Category" value={itemForm.category_id ?? ""} options={categories.map((category) => ({ label: category.name, value: category.id }))} onChange={(value) => setItemForm({ ...itemForm, category_id: value })} /><div><span className="mb-2 block text-sm font-medium text-slate-700">Food image</span>{imagePreview && <div className="mb-3 flex items-center gap-3"><div role="img" aria-label="Food preview" className="h-24 w-24 rounded-xl bg-cover bg-center" style={{ backgroundImage: `url("${imagePreview}")` }} /><button type="button" onClick={removeImage} className="text-sm font-semibold text-red-500 hover:text-red-600">Remove image</button></div>}<label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-orange-300 hover:text-orange-600"><span>{uploadingImage ? "Uploading image..." : imagePreview ? "Replace image" : "Upload image"}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectImage(event.target.files?.[0])} className="sr-only" disabled={saving} /></label><p className="mt-2 text-xs text-slate-400">JPG, PNG, or WebP up to 5 MB.</p></div><TextField label="Image URL (optional)" type="url" value={itemForm.image_url ?? ""} onChange={(value) => { setItemForm({ ...itemForm, image_url: value }); setImagePreview(value); setSelectedImageFile(null); }} /><div className="grid gap-3 sm:grid-cols-2"><Checkbox label="Available to order" checked={itemForm.is_available} onChange={(checked) => setItemForm({ ...itemForm, is_available: checked })} /><Checkbox label="Vegetarian" checked={itemForm.is_veg} onChange={(checked) => setItemForm({ ...itemForm, is_veg: checked })} /></div><FormActions saving={saving} onCancel={closeItemForm} submitLabel={editingItem ? "Save changes" : "Create menu item"} /></form></Modal>}
    </main>
  );
}

function SetupRestaurant({ form, setForm, saving, error, onSubmit }: { form: RestaurantForm; setForm: (form: RestaurantForm) => void; saving: boolean; error: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) { return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6"><div className="mx-auto max-w-2xl rounded-3xl border bg-white p-6 shadow-sm sm:p-10"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">First things first</p><h1 className="mt-3 text-3xl font-bold tracking-tight">Set Up Restaurant</h1><p className="mt-3 max-w-xl text-slate-500">Add your restaurant details to start building a menu your guests can explore.</p>{error && <Alert message={error} />}<form onSubmit={onSubmit} className="mt-8 grid gap-5 sm:grid-cols-2"><TextField label="Restaurant name" value={form.name} required onChange={(value) => setForm({ ...form, name: value })} className="sm:col-span-2" /><TextField label="Phone" value={form.phone ?? ""} onChange={(value) => setForm({ ...form, phone: value })} /><TextField label="Address" value={form.address ?? ""} onChange={(value) => setForm({ ...form, address: value })} /><TextArea label="Description" value={form.description ?? ""} onChange={(value) => setForm({ ...form, description: value })} className="sm:col-span-2" /><button disabled={saving} className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">{saving ? "Creating..." : "Create restaurant"}</button></form></div></main>; }
function StatusScreen({ message }: { message: string }) { return <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6"><div className="rounded-2xl border bg-white px-8 py-7 text-center shadow-sm"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" /><p className="mt-4 text-sm text-slate-500">{message}</p></div></main>; }
function Alert({ message }: { message: string }) { return <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>; }
function SummaryCard({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>; }
function EmptyState({ title, description, action, onClick }: { title: string; description: string; action: string; onClick: () => void }) { return <div className="px-6 py-16 text-center"><p className="text-lg font-bold">{title}</p><p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p><button onClick={onClick} className="mt-6 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white">{action}</button></div>; }
function MenuItemRow({ item, onToggle, onEdit, onDelete }: { item: MenuItem; onToggle: () => void; onEdit: () => void; onDelete: () => void }) { return <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{item.name}</p><span className="text-sm font-medium text-orange-600">₹{Number(item.price).toFixed(2)}</span>{item.is_veg && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Veg</span>}<span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.is_available ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.is_available ? "Available" : "Unavailable"}</span></div>{item.description && <p className="mt-1 truncate text-sm text-slate-500">{item.description}</p>}</div><div className="flex shrink-0 items-center gap-1 text-sm"><button onClick={onToggle} className="rounded-lg px-2 py-1.5 text-slate-500 hover:bg-slate-100">{item.is_available ? "Disable" : "Enable"}</button><button onClick={onEdit} className="rounded-lg px-2 py-1.5 text-slate-500 hover:bg-slate-100">Edit</button><button onClick={onDelete} className="rounded-lg px-2 py-1.5 text-red-500 hover:bg-red-50">Delete</button></div></div>; }
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) { return <div className="fixed inset-0 z-10 flex items-end justify-center bg-slate-950/40 p-0 sm:items-center sm:p-6"><div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{title}</h2><button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100">×</button></div><div className="mt-6">{children}</div></div></div>; }
function TextField({ label, value, onChange, required, type = "text", className = "" }: { label: string; value: string; onChange: (value: string) => void; required?: boolean; type?: string; className?: string }) { return <label className={`block ${className}`}><span className="mb-2 block text-sm font-medium text-slate-700">{label}{required && " *"}</span><input type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>; }
function TextArea({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) { return <label className={`block ${className}`}><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} rows={3} className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>; }
function NumberField({ label, value, onChange, min, step = 1 }: { label: string; value: number; onChange: (value: number) => void; min?: number; step?: number }) { return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span><input type="number" value={value} min={min} step={step} onChange={(event) => onChange(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { label: string; value: string }[]; onChange: (value: string) => void }) { return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span><select value={value} required onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"><option value="">Choose a category</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>; }
function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-orange-500" />{label}</label>; }
function FormActions({ saving, onCancel, submitLabel }: { saving: boolean; onCancel: () => void; submitLabel: string }) { return <div className="flex justify-end gap-3 border-t pt-5"><button type="button" onClick={onCancel} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button disabled={saving} className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60">{saving ? "Saving..." : submitLabel}</button></div>; }