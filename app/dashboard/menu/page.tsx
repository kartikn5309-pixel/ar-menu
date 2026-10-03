"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  SearchIcon,
  PlusIcon,
  VegBadge,
  NonVegBadge,
  EditIcon,
  TrashIcon,
  ArCubeIcon,
  CloseIcon,
} from "@/components/ui/Icons";

type Restaurant = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  phone: string | null;
  address: string | null;
};

type Category = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

type MenuItem = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  model_url: string | null;
  has_3d_model: boolean;
  is_available: boolean;
  is_veg: boolean;
  sort_order: number;
};

type RestaurantForm = Omit<Restaurant, "id" | "owner_id">;
type CategoryForm = Omit<Category, "id">;
type MenuItemForm = Omit<MenuItem, "id">;

const emptyRestaurant: RestaurantForm = {
  name: "",
  description: "",
  phone: "",
  address: "",
};

const emptyCategory: CategoryForm = {
  name: "",
  description: "",
  sort_order: 0,
  is_active: true,
};

const emptyMenuItem: MenuItemForm = {
  category_id: "",
  name: "",
  description: "",
  price: 0,
  image_url: "",
  model_url: "",
  has_3d_model: false,
  is_available: true,
  is_veg: false,
  sort_order: 0,
};

const MODEL_BUCKET = "menu-3d-models";
const MAX_MODEL_SIZE = 50 * 1024 * 1024;

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
  const [selectedModelFile, setSelectedModelFile] = useState<File | null>(null);
  const [uploadingModel, setUploadingModel] = useState(false);
  const [removeExistingModel, setRemoveExistingModel] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "available" | "unavailable">("all");
  const [dietFilter, setDietFilter] = useState<"all" | "veg" | "non-veg">("all");
  const [arOnlyFilter, setArOnlyFilter] = useState(false);

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = (item.description || "").toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      // Category filter
      if (selectedCategoryId !== "all" && item.category_id !== selectedCategoryId) {
        return false;
      }
      // Availability filter
      if (availabilityFilter === "available" && !item.is_available) return false;
      if (availabilityFilter === "unavailable" && item.is_available) return false;
      // Diet filter
      if (dietFilter === "veg" && !item.is_veg) return false;
      if (dietFilter === "non-veg" && item.is_veg) return false;
      // AR filter
      if (arOnlyFilter && !item.has_3d_model) return false;

      return true;
    });
  }, [items, searchQuery, selectedCategoryId, availabilityFilter, dietFilter, arOnlyFilter]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const activeCats = selectedCategoryId === "all" 
      ? categories 
      : categories.filter((c) => c.id === selectedCategoryId);

    return activeCats.map((category) => ({
      category,
      items: filteredItems
        .filter((item) => item.category_id === category.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }));
  }, [categories, filteredItems, selectedCategoryId]);

  // Items with uncategorized or missing category
  const uncategorizedItems = useMemo(() => {
    if (selectedCategoryId !== "all") return [];
    return filteredItems.filter(
      (item) => !item.category_id || !categories.some((c) => c.id === item.category_id)
    );
  }, [filteredItems, categories, selectedCategoryId]);

  useEffect(() => {
    void loadPage();
  }, []);

  useEffect(() => {
    if (!restaurant || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "add") {
      openItemForm();
      window.history.replaceState(null, "", "/dashboard/menu");
    } else if (params.get("action") === "category") {
      openCategoryForm();
      window.history.replaceState(null, "", "/dashboard/menu");
    }
  }, [restaurant]);

  async function loadPage() {
    setLoading(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    const currentUserId = authData.user.id;
    const { data, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, owner_id, name, description, phone, address")
      .eq("owner_id", currentUserId)
      .maybeSingle();

    if (restaurantError) {
      setError(restaurantError.message);
      setLoading(false);
      return;
    }
    if (!data) {
      setRestaurant(null);
      setLoading(false);
      return;
    }

    setRestaurant(data as Restaurant);
    await loadMenuData(data.id);
    setLoading(false);
  }

  async function loadMenuData(restaurantId: string) {
    const [categoryResult, itemResult] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name, description, sort_order, is_active")
        .eq("restaurant_id", restaurantId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("menu_items")
        .select("id, category_id, name, description, price, image_url, model_url, has_3d_model, is_available, is_veg, sort_order")
        .eq("restaurant_id", restaurantId)
        .order("sort_order", { ascending: true }),
    ]);

    if (categoryResult.error || itemResult.error) {
      setError(categoryResult.error?.message ?? itemResult.error?.message ?? "Could not load menu data.");
      return;
    }

    setCategories((categoryResult.data ?? []) as Category[]);
    setItems((itemResult.data ?? []) as MenuItem[]);
  }

  function notify(message: string) {
    setSuccess(message);
    window.setTimeout(() => setSuccess(""), 3500);
  }

  async function createRestaurant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      router.replace("/login");
      return;
    }
    const { data, error: createError } = await supabase
      .from("restaurants")
      .insert({ ...restaurantForm, owner_id: authData.user.id })
      .select("id, owner_id, name, description, phone, address")
      .single();

    if (createError) {
      setError(createError.message);
    } else {
      setRestaurant(data as Restaurant);
      notify("Restaurant created successfully.");
    }
    setSaving(false);
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurant) return;
    setSaving(true);
    setError("");

    const result = editingCategory
      ? await supabase
          .from("categories")
          .update(categoryForm)
          .eq("id", editingCategory.id)
          .eq("restaurant_id", restaurant.id)
      : await supabase
          .from("categories")
          .insert({ ...categoryForm, restaurant_id: restaurant.id });

    if (result.error) {
      setError(result.error.message);
    } else {
      closeCategoryForm();
      await loadMenuData(restaurant.id);
      notify(editingCategory ? "Category updated." : "Category created.");
    }
    setSaving(false);
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!restaurant) return;
    setSaving(true);
    setError("");

    if (
      itemForm.category_id &&
      !categories.some((category) => category.id === itemForm.category_id)
    ) {
      setError("Choose a valid category belonging to this restaurant.");
      setSaving(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setError("Your session has expired. Please sign in again.");
      setSaving(false);
      return;
    }

    const existingModelUrl = editingItem?.model_url ?? null;
    const payload = {
      ...itemForm,
      category_id: itemForm.category_id || null,
      image_url: itemForm.image_url || null,
      model_url:
        selectedModelFile && editingItem
          ? existingModelUrl
          : selectedModelFile || removeExistingModel
          ? null
          : existingModelUrl,
      has_3d_model: selectedModelFile
        ? Boolean(existingModelUrl)
        : !removeExistingModel && Boolean(existingModelUrl),
    };

    const result = editingItem
      ? await supabase
          .from("menu_items")
          .update(payload)
          .eq("id", editingItem.id)
          .eq("restaurant_id", restaurant.id)
          .select("id, image_url, model_url, has_3d_model")
          .single()
      : await supabase
          .from("menu_items")
          .insert({ ...payload, restaurant_id: restaurant.id })
          .select("id, image_url, model_url, has_3d_model")
          .single();

    if (result.error || !result.data) {
      setError(result.error?.message ?? "Could not save menu item.");
      setSaving(false);
      return;
    }

    let imageUrl = result.data.image_url as string | null;
    if (selectedImageFile) {
      setUploadingImage(true);
      const extension = selectedImageFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const imagePath = `restaurant/${restaurant.id}/menu/${crypto.randomUUID()}.${extension}`;
      const bucketName = "menu-images";

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(imagePath, selectedImageFile, {
          cacheControl: "3600",
          contentType: selectedImageFile.type,
          upsert: false,
        });

      if (uploadError) {
        if (!editingItem) {
          await supabase.from("menu_items").delete().eq("id", result.data.id).eq("restaurant_id", restaurant.id);
        }
        setError(`Image upload failed: ${uploadError.message}`);
        setUploadingImage(false);
        setSaving(false);
        return;
      }
      imageUrl = supabase.storage.from("menu-images").getPublicUrl(imagePath).data.publicUrl;
    }

    if (imageUrl !== result.data.image_url) {
      const { error: imageUpdateError } = await supabase
        .from("menu_items")
        .update({ image_url: imageUrl })
        .eq("id", result.data.id)
        .eq("restaurant_id", restaurant.id);

      if (imageUpdateError) {
        setError(imageUpdateError.message);
        setUploadingImage(false);
        setSaving(false);
        return;
      }
    }

    let modelUrl = result.data.model_url as string | null;
    const previousModelUrl = editingItem?.model_url ?? null;
    if (selectedModelFile) {
      setUploadingModel(true);
      const extension = selectedModelFile.name.split(".").pop()?.toLowerCase() || "glb";
      const modelPath = `restaurant/${restaurant.id}/models/${crypto.randomUUID()}.${extension}`;
      const contentType = selectedModelFile.type || (extension === "gltf" ? "model/gltf+json" : "model/gltf-binary");

      const { error: uploadError } = await supabase.storage
        .from(MODEL_BUCKET)
        .upload(modelPath, selectedModelFile, {
          cacheControl: "3600",
          contentType,
          upsert: false,
        });

      if (uploadError) {
        if (!editingItem) {
          await supabase.from("menu_items").delete().eq("id", result.data.id).eq("restaurant_id", restaurant.id);
        }
        setError(`3D model upload failed: ${uploadError.message}`);
        setUploadingModel(false);
        setSaving(false);
        return;
      }

      modelUrl = supabase.storage.from(MODEL_BUCKET).getPublicUrl(modelPath).data.publicUrl;
      const { error: modelUpdateError } = await supabase
        .from("menu_items")
        .update({ model_url: modelUrl, has_3d_model: true })
        .eq("id", result.data.id)
        .eq("restaurant_id", restaurant.id);

      if (modelUpdateError) {
        setError(modelUpdateError.message);
        setUploadingModel(false);
        setSaving(false);
        return;
      }
      if (previousModelUrl && previousModelUrl !== modelUrl) {
        void removeModelObject(previousModelUrl);
      }
    }

    if (removeExistingModel && previousModelUrl) {
      const { error: clearModelError } = await supabase
        .from("menu_items")
        .update({ model_url: null, has_3d_model: false })
        .eq("id", result.data.id)
        .eq("restaurant_id", restaurant.id);

      if (clearModelError) {
        setError(clearModelError.message);
        setSaving(false);
        return;
      }
      void removeModelObject(previousModelUrl);
    }

    closeItemForm();
    await loadMenuData(restaurant.id);
    notify(editingItem ? "Menu item updated." : "Menu item added.");
    setSaving(false);
    setUploadingImage(false);
    setUploadingModel(false);
  }

  async function toggleCategory(category: Category) {
    if (!restaurant) return;
    setError("");
    const { error: toggleError } = await supabase
      .from("categories")
      .update({ is_active: !category.is_active })
      .eq("id", category.id)
      .eq("restaurant_id", restaurant.id);

    if (toggleError) setError(toggleError.message);
    else await loadMenuData(restaurant.id);
  }

  async function deleteCategory(category: Category) {
    if (!restaurant) return;
    if (!confirm(`Are you sure you want to delete "${category.name}"? Items in this category will be uncategorized.`)) return;
    setError("");
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("id", category.id)
      .eq("restaurant_id", restaurant.id);

    if (deleteError) setError(deleteError.message);
    else {
      await loadMenuData(restaurant.id);
      notify("Category deleted.");
    }
  }

  async function toggleItem(item: MenuItem) {
    if (!restaurant) return;
    setError("");
    const { error: toggleError } = await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id)
      .eq("restaurant_id", restaurant.id);

    if (toggleError) setError(toggleError.message);
    else await loadMenuData(restaurant.id);
  }

  async function deleteItem(item: MenuItem) {
    if (!restaurant) return;
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    setError("");
    const { error: deleteError } = await supabase
      .from("menu_items")
      .delete()
      .eq("id", item.id)
      .eq("restaurant_id", restaurant.id);

    if (deleteError) setError(deleteError.message);
    else {
      if (item.model_url) void removeModelObject(item.model_url);
      await loadMenuData(restaurant.id);
      notify("Menu item deleted.");
    }
  }

  function openCategoryForm(category?: Category) {
    setEditingCategory(category ?? null);
    setCategoryForm(
      category
        ? {
            name: category.name,
            description: category.description ?? "",
            sort_order: category.sort_order,
            is_active: category.is_active,
          }
        : { ...emptyCategory, sort_order: categories.length }
    );
    setShowCategoryForm(true);
  }

  function closeCategoryForm() {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryForm({ ...emptyCategory });
  }

  function openItemForm(item?: MenuItem) {
    setEditingItem(item ?? null);
    setItemForm(
      item
        ? {
            category_id: item.category_id ?? "",
            name: item.name,
            description: item.description ?? "",
            price: item.price,
            image_url: item.image_url ?? "",
            model_url: item.model_url ?? "",
            has_3d_model: item.has_3d_model,
            is_available: item.is_available,
            is_veg: item.is_veg,
            sort_order: item.sort_order,
          }
        : {
            ...emptyMenuItem,
            category_id: categories[0]?.id ?? "",
            sort_order: items.length,
          }
    );
    setImagePreview(item?.image_url ?? "");
    setSelectedImageFile(null);
    setSelectedModelFile(null);
    setRemoveExistingModel(false);
    setShowItemForm(true);
  }

  function closeItemForm() {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setShowItemForm(false);
    setEditingItem(null);
    setItemForm({ ...emptyMenuItem });
    setSelectedImageFile(null);
    setSelectedModelFile(null);
    setRemoveExistingModel(false);
    setImagePreview("");
  }

  function selectImage(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setSelectedImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  }

  function removeImage() {
    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setSelectedImageFile(null);
    setImagePreview("");
    setItemForm({ ...itemForm, image_url: "" });
  }

  function selectModel(file: File | undefined) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["glb", "gltf"].includes(extension)) {
      setError("Choose a .glb or .gltf model.");
      return;
    }
    if (file.size > MAX_MODEL_SIZE) {
      setError("3D model must be 50 MB or smaller.");
      return;
    }
    setSelectedModelFile(file);
    setRemoveExistingModel(false);
    setError("");
  }

  function removeModel() {
    setSelectedModelFile(null);
    setRemoveExistingModel(true);
    setItemForm({ ...itemForm, model_url: "", has_3d_model: false });
  }

  function getModelFilename(modelUrl: string | null | undefined) {
    if (!modelUrl) return "Uploaded 3D model";
    return decodeURIComponent(modelUrl.split("/").pop() ?? "Uploaded 3D model");
  }

  async function removeModelObject(modelUrl: string) {
    const marker = `/storage/v1/object/public/${MODEL_BUCKET}/`;
    const markerIndex = modelUrl.indexOf(marker);
    if (markerIndex >= 0) {
      await supabase.storage
        .from(MODEL_BUCKET)
        .remove([decodeURIComponent(modelUrl.slice(markerIndex + marker.length))]);
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-sm font-mono text-zinc-400">
        Loading restaurant menu...
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-2xl border border-zinc-200 bg-white shadow-2xs">
        <h1 className="text-xl font-bold text-zinc-900">Set Up Restaurant Profile</h1>
        <p className="text-sm text-zinc-500 mt-1 mb-6">
          Add your restaurant details to start creating your digital menu and QR codes.
        </p>
        <form onSubmit={createRestaurant} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
              Restaurant Name *
            </label>
            <input
              type="text"
              required
              value={restaurantForm.name}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="e.g. The Grand Bistro"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
              Phone
            </label>
            <input
              type="tel"
              value={restaurantForm.phone ?? ""}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="+91 98765 43210"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
              Address
            </label>
            <input
              type="text"
              value={restaurantForm.address ?? ""}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
              placeholder="123 Luxury Blvd, Indiranagar"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm transition"
          >
            {saving ? "Creating..." : "Create Restaurant"}
          </button>
        </form>
      </div>
    );
  }

  const model3dCount = items.filter((i) => i.has_3d_model).length;
  const availableCount = items.filter((i) => i.is_available).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
            Menu Management
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Organize categories, dishes, prices, and 3D spatial models.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => openCategoryForm()}
            className="px-3.5 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition shadow-2xs"
          >
            + Add Category
          </button>
          <button
            type="button"
            onClick={() => openItemForm()}
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition shadow-xs flex items-center gap-1.5"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Dish</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          {success}
        </div>
      )}

      {/* Metrics Row */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
            Total Dishes
          </span>
          <span className="text-xl font-bold text-zinc-900 mt-1 block">
            {items.length}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
            Available Now
          </span>
          <span className="text-xl font-bold text-emerald-600 mt-1 block">
            {availableCount}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
            Spatial 3D Ready
          </span>
          <span className="text-xl font-bold text-zinc-900 mt-1 block flex items-center gap-1.5">
            <span>{model3dCount}</span>
            <span className="text-xs font-mono font-normal text-zinc-400">models</span>
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold block">
            Categories
          </span>
          <span className="text-xl font-bold text-zinc-900 mt-1 block">
            {categories.length}
          </span>
        </div>
      </section>

      {/* Search & Filter Toolbar */}
      <section className="p-3.5 rounded-xl bg-white border border-zinc-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes by name or description..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Availability Filter */}
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value as "all" | "available" | "unavailable")}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          >
            <option value="all">All Availability</option>
            <option value="available">Available Only</option>
            <option value="unavailable">Unavailable Only</option>
          </select>

          {/* Dietary Filter */}
          <select
            value={dietFilter}
            onChange={(e) => setDietFilter(e.target.value as "all" | "veg" | "non-veg")}
            className="px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
          >
            <option value="all">All Diets</option>
            <option value="veg">Vegetarian</option>
            <option value="non-veg">Non-Vegetarian</option>
          </select>

          {/* 3D Model Toggle */}
          <button
            type="button"
            onClick={() => setArOnlyFilter(!arOnlyFilter)}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
              arOnlyFilter
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600"
            }`}
          >
            <ArCubeIcon className="w-3.5 h-3.5" />
            <span>3D Ready</span>
          </button>
        </div>
      </section>

      {/* Menu Categories & Items List */}
      <section className="space-y-6">
        {categories.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-2xs">
            <p className="text-base font-bold text-zinc-900">
              No categories created yet
            </p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Start by creating menu categories like Starters, Mains, Desserts, or Beverages.
            </p>
            <button
              type="button"
              onClick={() => openCategoryForm()}
              className="mt-4 px-4 py-2 rounded-lg bg-zinc-900 text-white font-semibold text-xs hover:bg-zinc-800 transition"
            >
              + Create Category
            </button>
          </div>
        ) : filteredItems.length === 0 && (searchQuery || selectedCategoryId !== "all" || availabilityFilter !== "all" || dietFilter !== "all" || arOnlyFilter) ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-10 text-center shadow-2xs">
            <p className="text-sm font-semibold text-zinc-700">No matching dishes found</p>
            <p className="text-xs text-zinc-400 mt-1">
              Try adjusting your search terms or filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategoryId("all");
                setAvailabilityFilter("all");
                setDietFilter("all");
                setArOnlyFilter(false);
              }}
              className="mt-3 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50"
            >
              Clear filters
            </button>
          </div>
        ) : (
          groupedItems.map(({ category, items: categoryItems }) => {
            if (categoryItems.length === 0 && selectedCategoryId === "all" && (searchQuery || arOnlyFilter || availabilityFilter !== "all" || dietFilter !== "all")) {
              return null; // Don't show empty categories during active search if they have no matches
            }

            return (
              <div
                key={category.id}
                className="rounded-xl border border-zinc-200 bg-white shadow-2xs overflow-hidden"
              >
                {/* Category Header */}
                <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/60 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-zinc-900">
                      {category.name}
                    </h2>
                    <span className="text-xs font-mono text-zinc-400">
                      ({categoryItems.length} {categoryItems.length === 1 ? "item" : "items"})
                    </span>
                    {!category.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-200 text-zinc-600">
                        HIDDEN
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="px-2.5 py-1 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-[11px] font-medium text-zinc-600 transition"
                    >
                      {category.is_active ? "Hide" : "Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openCategoryForm(category)}
                      className="p-1.5 rounded-md hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition"
                      title="Edit Category"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCategory(category)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-zinc-400 hover:text-red-600 transition"
                      title="Delete Category"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Category Items List */}
                {categoryItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-400">
                    No items in this category yet. Click &quot;Add Dish&quot; above to add one.
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100">
                    {categoryItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          !item.is_available ? "opacity-60 bg-zinc-50/40" : "hover:bg-zinc-50/50"
                        }`}
                      >
                        {/* Dish Details & Thumbnail */}
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          {/* Image Thumbnail */}
                          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200 shrink-0">
                            {item.image_url ? (
                              <Image
                                src={item.image_url}
                                alt={item.name}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-mono text-zinc-400">
                                NO PIC
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {item.is_veg ? <VegBadge /> : <NonVegBadge />}
                              <h3 className="font-semibold text-sm text-zinc-900 truncate">
                                {item.name}
                              </h3>
                              <span className="font-mono font-bold text-sm text-zinc-900">
                                ₹{Number(item.price).toFixed(2)}
                              </span>
                            </div>

                            {item.description && (
                              <p className="text-xs text-zinc-500 line-clamp-1 mt-0.5 max-w-xl">
                                {item.description}
                              </p>
                            )}

                            {/* Tags */}
                            <div className="flex items-center gap-2 mt-1.5">
                              {item.has_3d_model ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <ArCubeIcon className="w-3 h-3 text-emerald-600" />
                                  <span>Spatial 3D Ready</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono text-zinc-400">
                                  Photo Only
                                </span>
                              )}

                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                  item.is_available
                                    ? "bg-zinc-100 text-zinc-700"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {item.is_available ? "In Stock" : "Unavailable"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleItem(item)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                              item.is_available
                                ? "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700"
                                : "border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {item.is_available ? "Disable" : "Enable"}
                          </button>

                          <button
                            type="button"
                            onClick={() => openItemForm(item)}
                            className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition"
                            title="Edit dish"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteItem(item)}
                            className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-red-50 text-zinc-400 hover:text-red-600 transition"
                            title="Delete dish"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Uncategorized Items (if any) */}
        {uncategorizedItems.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white shadow-2xs overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 bg-zinc-50/60">
              <h2 className="text-base font-bold text-zinc-900">
                Uncategorized Items ({uncategorizedItems.length})
              </h2>
            </div>
            <div className="divide-y divide-zinc-100">
              {uncategorizedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    {item.is_veg ? <VegBadge /> : <NonVegBadge />}
                    <span className="font-semibold text-sm">{item.name}</span>
                    <span className="font-mono text-sm">₹{Number(item.price).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openItemForm(item)}
                      className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700"
                    >
                      Assign Category
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ====================================================================
          CATEGORY MODAL
         ==================================================================== */}
      {showCategoryForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-white border border-zinc-200 shadow-xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4">
              <h3 className="font-bold text-base text-zinc-900">
                {editingCategory ? "Edit Category" : "Add New Category"}
              </h3>
              <button
                type="button"
                onClick={closeCategoryForm}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. Starters, Main Course, Artisanal Hearth"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={categoryForm.description ?? ""}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Brief description shown to guests..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="cat-active"
                  checked={categoryForm.is_active}
                  onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <label htmlFor="cat-active" className="text-sm font-medium text-zinc-700 select-none">
                  Category is visible to customers
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={closeCategoryForm}
                  className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition"
                >
                  {saving ? "Saving..." : editingCategory ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MENU ITEM MODAL
         ==================================================================== */}
      {showItemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-white border border-zinc-200 shadow-xl p-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-base text-zinc-900">
                {editingItem ? "Edit Menu Dish" : "Add Menu Dish"}
              </h3>
              <button
                type="button"
                onClick={closeItemForm}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Artisanal Paneer Tikka"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Category *
                </label>
                <select
                  required
                  value={itemForm.category_id ?? ""}
                  onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                >
                  <option value="">Select Category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={itemForm.sort_order}
                    onChange={(e) => setItemForm({ ...itemForm, sort_order: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={itemForm.description ?? ""}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Ingredients, preparation, and culinary notes..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>

              {/* Food Image Upload */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                  Food Photography
                </label>

                {imagePreview ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 bg-zinc-50">
                    <div className="relative w-16 h-16 rounded-md overflow-hidden bg-zinc-100 border border-zinc-300 shrink-0">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-900 truncate">
                        {selectedImageFile?.name || "Uploaded Photo"}
                      </p>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="text-xs font-medium text-red-600 hover:underline mt-1"
                      >
                        Remove photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="block p-4 border border-dashed border-zinc-300 rounded-lg text-center cursor-pointer hover:bg-zinc-50 transition">
                    <span className="text-xs font-semibold text-zinc-700 block">
                      Click to upload dish photo
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      JPG, PNG, or WebP up to 5 MB
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => selectImage(e.target.files?.[0])}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>

              {/* 3D Spatial Model Upload */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                    <ArCubeIcon className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Spatial 3D Model (.GLB)</span>
                  </label>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Optional for AR view
                  </span>
                </div>

                {(selectedModelFile || (editingItem?.has_3d_model && !removeExistingModel)) ? (
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <ArCubeIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-mono font-medium text-emerald-900 truncate">
                        {selectedModelFile?.name ?? getModelFilename(editingItem?.model_url)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removeModel}
                      className="text-xs font-semibold text-red-600 hover:underline shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="block p-4 border border-dashed border-zinc-300 rounded-lg text-center cursor-pointer hover:bg-zinc-50 transition">
                    <span className="text-xs font-semibold text-zinc-700 block">
                      Click to upload .GLB 3D model
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      Standard GLB model up to 50 MB
                    </span>
                    <input
                      type="file"
                      accept=".glb,.gltf"
                      onChange={(e) => selectModel(e.target.files?.[0])}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="item-avail"
                    checked={itemForm.is_available}
                    onChange={(e) => setItemForm({ ...itemForm, is_available: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                  <label htmlFor="item-avail" className="text-xs font-medium text-zinc-700 select-none">
                    Available to order
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="item-veg"
                    checked={itemForm.is_veg}
                    onChange={(e) => setItemForm({ ...itemForm, is_veg: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />
                  <label htmlFor="item-veg" className="text-xs font-medium text-zinc-700 select-none flex items-center gap-1.5">
                    <VegBadge className="h-3 w-3" />
                    <span>Vegetarian</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={closeItemForm}
                  className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingImage || uploadingModel}
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition"
                >
                  {saving || uploadingImage || uploadingModel
                    ? "Saving Dish..."
                    : editingItem
                    ? "Save Changes"
                    : "Create Dish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
