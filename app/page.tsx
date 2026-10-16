"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ARViewer from "@/components/ar/ARViewer";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { supabase } from "@/lib/supabase";

/* --------------------------------------------------------------------------
   Data & Configuration — Spatial Luxury Design System
   -------------------------------------------------------------------------- */

type JourneyStep = {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  metric: string;
};

const JOURNEY_STEPS: JourneyStep[] = [
  {
    id: "scan",
    step: "01",
    title: "SCAN",
    subtitle: "Tabletop QR Gateway",
    description:
      "Guests open their native camera and glance at the table QR. Zero app install, zero sign-in barrier. The spatial dining portal unlocks in under a second.",
    tag: "INSTANT ACCESS",
    metric: "0.8s Open Speed",
  },
  {
    id: "explore",
    step: "02",
    title: "EXPLORE",
    subtitle: "Curated Digital Menu",
    description:
      "Diners browse high-definition dish artistry, clear dietary indications, allergen transparency, and sommelier pairing notes in real time.",
    tag: "LIVE MENU SYNC",
    metric: "100% Up to Date",
  },
  {
    id: "visualize",
    step: "03",
    title: "VISUALIZE",
    subtitle: "Spatial 3D & Tabletop AR",
    description:
      "With one tap, the dish is placed physically on the guest's dining table. Real 6DoF hardware anchoring keeps the food fixed while guests walk 360° around it.",
    tag: "6DoF WORLD ANCHOR",
    metric: "1:1 True Scale",
  },
  {
    id: "order",
    step: "04",
    title: "ORDER",
    subtitle: "Direct Kitchen Dispatch",
    description:
      "Guests configure dishes and push their order directly to the kitchen console, complete with table identification and special preparation notes.",
    tag: "DIRECT DISPATCH",
    metric: "Instant Kitchen Push",
  },
];

type MenuDish = {
  id: string;
  name: string;
  category: string;
  price: string;
  isVeg: boolean;
  image: string;
  description: string;
  pairing: string;
  modelReady: boolean;
};

const CURATED_DISHES: MenuDish[] = [
  {
    id: "wagyu-burger",
    name: "Truffle Wagyu Smash Burger",
    category: "Signature Mains",
    price: "₹549",
    isVeg: false,
    image: "/images/hero-dish.jpg",
    description:
      "Double dry-aged Wagyu beef patties, melted aged cheddar, caramelized shallot glaze, crisp micro arugula on toasted golden brioche.",
    pairing: "Pairs with Pinot Noir Reserve",
    modelReady: true,
  },
  {
    id: "burrata-pizza",
    name: "Artisanal Burrata Margherita",
    category: "Wood-Fired Hearth",
    price: "₹449",
    isVeg: true,
    image: "/images/artisan-pizza.jpg",
    description:
      "72-hour cold-fermented sourdough, blistered crust, creamy Puglia buffalo burrata core, San Marzano tomato reduction, cold-pressed olive oil, fragrant basil.",
    pairing: "Pairs with Chianti Classico",
    modelReady: true,
  },
  {
    id: "seared-salmon",
    name: "Pan-Seared King Salmon",
    category: "Seafood Specialties",
    price: "₹699",
    isVeg: false,
    image: "/images/seared-salmon.jpg",
    description:
      "Crispy-skin wild salmon fillet atop a saffron velouté emulsion, charred garden asparagus spears, aromatic cold-pressed dill oil, and edible violas.",
    pairing: "Pairs with Sancerre Blanc",
    modelReady: true,
  },
];

type ARDemoDish = {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  description: string;
  price: string;
  isVeg: boolean;
  image: string;
  modelUrl: string;
  badge: string;
  scaleMetric: string;
  arReady: boolean;
};

const DEMO_RESTAURANT_ID = "923d62b5-7d99-495f-9d9a-c4bbc1602cd0";
const DEMO_PANEER_TIKKA_ID = "68b6adef-f946-45f8-aa71-d516690d2fec";
const DEMO_BURGER_ID = "86bf2bf1-581a-4e52-9643-650bce9f7a3f";

const INITIAL_DEMO_DISHES: ARDemoDish[] = [
  {
    id: DEMO_PANEER_TIKKA_ID,
    name: "Paneer Tikka",
    subtitle: "Clay Oven Charred Cottage Cheese",
    category: "Signature Clay Oven",
    description:
      "Tender cubes of cottage cheese marinated in hung curd, spices, and mustard oil, charred to perfection in a traditional clay oven with crisp bell peppers.",
    price: "₹250",
    isVeg: true,
    image: "/images/paneer-tikka.jpg",
    modelUrl:
      "https://xwyofduioqxruycjpaih.supabase.co/storage/v1/object/public/menu-3d-models/restaurant/923d62b5-7d99-495f-9d9a-c4bbc1602cd0/models/afa94f26-bce4-43e0-b1b3-a12b662f6174.glb",
    badge: "AR READY",
    scaleMetric: "1:1 Physical Scale",
    arReady: true,
  },
  {
    id: DEMO_BURGER_ID,
    name: "Burger",
    subtitle: "Dry-Aged Brioche Gourmet Stack",
    category: "Artisanal Mains",
    description:
      "A crafted gourmet patty layered with melted aged cheddar, caramelized shallot glaze, crisp micro greens, and toasted golden brioche.",
    price: "₹80",
    isVeg: true,
    image: "/images/hero-dish.jpg",
    modelUrl:
      "https://xwyofduioqxruycjpaih.supabase.co/storage/v1/object/public/menu-3d-models/restaurant/923d62b5-7d99-495f-9d9a-c4bbc1602cd0/models/b1c12128-8e93-425c-aee8-c23a8f4e89d9.glb",
    badge: "AR READY",
    scaleMetric: "1:1 Physical Scale",
    arReady: true,
  },
];

type DashboardTab = "menu" | "tables" | "orders";

type HeroScene = {
  id: string;
  stageNum: string;
  title: string;
  actionLabel: string;
  videoSrc?: string;
  imageFallback: string;
  alt: string;
};

const HERO_SCENES: HeroScene[] = [
  {
    id: "chef-cooking",
    stageNum: "01",
    title: "Culinary Craft & Heat",
    actionLabel: "PREPARATION",
    // Video asset placeholder: set to "/videos/hero/chef-cooking.mp4" when video is added
    videoSrc: undefined,
    imageFallback: "/images/hero/chef-cooking-fallback.jpg",
    alt: "Professional chef preparing an artisanal dish in a luxury restaurant kitchen with steam and pan sear",
  },
  {
    id: "dish-plating",
    stageNum: "02",
    title: "Artisanal Precision Plating",
    actionLabel: "PLATING",
    // Video asset placeholder: set to "/videos/hero/dish-plating.mp4" when video is added
    videoSrc: undefined,
    imageFallback: "/images/hero/dish-plating-fallback.jpg",
    alt: "Master chef delicately plating and garnishing an exquisite culinary dish with microgreens",
  },
  {
    id: "finished-dish",
    stageNum: "03",
    title: "Signature Plated Presentation",
    actionLabel: "TABLE PRESENTATION",
    // Video asset placeholder: set to "/videos/hero/finished-dish.mp4" when video is added
    videoSrc: undefined,
    imageFallback: "/images/hero/finished-dish.jpg",
    alt: "Gourmet dish resting on an upscale textured oak dining table with candle ambiance",
  },
  {
    id: "ar-table",
    stageNum: "04",
    title: "Spatial AR Tabletop Anchor",
    actionLabel: "SPATIAL AR",
    // Video asset placeholder: set to "/videos/hero/ar-table.mp4" when video is added
    videoSrc: undefined,
    imageFallback: "/images/hero/ar-table-fallback.jpg",
    alt: "Diner holding smartphone viewing 3D dish anchored on dining table in Augmented Reality",
  },
];

/* --------------------------------------------------------------------------
   Main Component: Spatial Luxury Homepage
   -------------------------------------------------------------------------- */

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeDashboardTab, setActiveDashboardTab] = useState<DashboardTab>("menu");
  const [selectedDishForModal, setSelectedDishForModal] = useState<MenuDish | null>(null);

  // Interactive AR Demo Section state (Dynamically synced from demo restaurant menu_items)
  const [demoDishes, setDemoDishes] = useState<ARDemoDish[]>(INITIAL_DEMO_DISHES);
  const [activeDemoDishId, setActiveDemoDishId] = useState<string>(DEMO_PANEER_TIKKA_ID);
  const [arViewerDish, setArViewerDish] = useState<ARDemoDish | null>(null);

  const activeDemoDish =
    demoDishes.find((dish) => dish.id === activeDemoDishId) ?? demoDishes[0];
  const secondaryDemoDish =
    demoDishes.find((dish) => dish.id !== activeDemoDishId) ?? demoDishes[1];

  // Fetch live menu items for designated demo dishes from Supabase
  useEffect(() => {
    let isMounted = true;

    async function loadLiveDemoDishes() {
      try {
        const { data, error } = await supabase
          .from("menu_items")
          .select("id, name, description, price, image_url, model_url, has_3d_model, is_veg, is_available")
          .eq("restaurant_id", DEMO_RESTAURANT_ID)
          .in("id", [DEMO_PANEER_TIKKA_ID, DEMO_BURGER_ID]);

        if (error || !data || !isMounted) return;

        setDemoDishes((prev) =>
          prev.map((fallback) => {
            const liveItem = data.find((row) => row.id === fallback.id);
            if (!liveItem) return fallback;

            const hasModel = Boolean(liveItem.has_3d_model && liveItem.model_url);
            return {
              ...fallback,
              name: liveItem.name?.trim() || fallback.name,
              description: liveItem.description?.trim() || fallback.description,
              price:
                liveItem.price !== null && liveItem.price !== undefined
                  ? `₹${liveItem.price}`
                  : fallback.price,
              isVeg: Boolean(liveItem.is_veg),
              image: liveItem.image_url?.trim() || fallback.image,
              modelUrl: liveItem.model_url || "",
              arReady: hasModel,
              badge: hasModel ? "AR READY" : "AR MODEL UNAVAILABLE",
            };
          })
        );
      } catch (err) {
        console.warn("[homepage-demo] Live dish sync error:", err);
      }
    }

    void loadLiveDemoDishes();

    return () => {
      isMounted = false;
    };
  }, []);

  // Cinematic Living Food Background state
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveSceneIndex((prev) => (prev + 1) % HERO_SCENES.length);
    }, 3800);

    return () => window.clearInterval(interval);
  }, []);

  const handleVideoError = (id: string) => {
    setVideoErrors((prev) => ({ ...prev, [id]: true }));
  };

  // Controlled Hero Parallax (Restrained 8–10px subtle shift)
  const heroCardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, px: 0, py: 0 });
  const [showSpatialOverlay, setShowSpatialOverlay] = useState(true);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!heroCardRef.current) return;
    const rect = heroCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: (y / (rect.height / 2)) * -3.5,
      y: (x / (rect.width / 2)) * 3.5,
      px: (x / (rect.width / 2)) * 8,
      py: (y / (rect.height / 2)) * 8,
    });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0, px: 0, py: 0 });
  }

  function scrollToSection(id: string) {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedDishForModal(null);
        setArViewerDish(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      {/* ====================================================================
          LIVING BACKGROUND SYSTEM: GLOBAL AMBIENT LAYERS
         ==================================================================== */}

      {/* LAYER 1: AMBIENT LIGHT FIELDS (Electric Indigo + Purple + Cyan) */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden -z-20"
        aria-hidden="true"
      >
        {/* Soft Deep Indigo/Purple Glow Field */}
        <div className="absolute -top-32 right-1/4 w-[680px] h-[680px] rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.18)_0%,rgba(139,92,246,0.08)_45%,transparent_70%)] blur-3xl animate-ambient-glow-1" />

        {/* Soft Electric Cyan Atmospheric Field */}
        <div className="absolute top-1/3 -left-32 w-[620px] h-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.14)_0%,rgba(56,189,248,0.03)_50%,transparent_70%)] blur-3xl animate-ambient-glow-2" />

        {/* Soft Violet/Warm Accent Glow */}
        <div className="absolute top-2/3 right-10 w-[540px] h-[540px] rounded-full bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.12)_0%,rgba(99,102,241,0.03)_45%,transparent_70%)] blur-3xl animate-ambient-glow-3" />
      </div>

      {/* LAYER 2: SPATIAL CONTOUR TOPOGRAPHY LINES */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.06] overflow-hidden -z-10 animate-contour-drift"
        aria-hidden="true"
      >
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-100 250C300 200 450 380 800 280C1150 180 1350 420 1600 350"
            stroke="#6366F1"
            strokeWidth="1.2"
            strokeDasharray="6 6"
          />
          <path
            d="M-120 420C280 370 520 540 860 460C1200 380 1380 580 1620 520"
            stroke="#38BDF8"
            strokeWidth="1"
          />
          <path
            d="M-80 620C320 580 580 720 920 640C1260 560 1420 740 1650 680"
            stroke="#8B5CF6"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
          <path
            d="M-50 780C350 740 640 860 980 800C1320 740 1460 890 1700 840"
            stroke="#6366F1"
            strokeWidth="1.2"
          />
        </svg>
      </div>

      {/* LAYER 4: FLOATING AMBIENT LIGHT MOTES */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden -z-10"
        aria-hidden="true"
      >
        <div className="absolute top-[18%] left-[22%] w-2 h-2 rounded-full bg-indigo-400 blur-[0.5px] animate-float-gentle opacity-40" />
        <div className="absolute top-[34%] right-[28%] w-1.5 h-1.5 rounded-full bg-cyan-400 blur-[0.5px] animate-pulse-glow opacity-30" />
        <div className="absolute top-[52%] left-[15%] w-2.5 h-2.5 rounded-full bg-purple-400 blur-[1px] animate-float-gentle opacity-35" />
        <div className="absolute top-[68%] right-[18%] w-1.5 h-1.5 rounded-full bg-indigo-400 blur-[0.5px] animate-pulse-glow opacity-30" />
        <div className="absolute top-[82%] left-[35%] w-2 h-2 rounded-full bg-amber-400 blur-[0.5px] animate-float-gentle opacity-25" />
      </div>

      {/* ====================================================================
          1. NAVIGATION BAR
         ==================================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0B1120]/80 border-b border-white/[0.08] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          {/* Brand Mark */}
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white border border-indigo-400/30 flex items-center justify-center font-mono font-bold text-xs tracking-widest shadow-lg shadow-indigo-500/25 group-hover:scale-105 group-hover:shadow-indigo-500/40 transition-all duration-300">
              AR
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-lg leading-tight text-white group-hover:text-indigo-200 transition-colors">
                AR MENU
              </span>
              <span className="font-mono text-[10px] tracking-[0.25em] text-indigo-400 uppercase font-semibold">
                Spatial Luxury Dining
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <button
              type="button"
              onClick={() => scrollToSection("experience")}
              className="hover:text-white hover:underline underline-offset-8 decoration-indigo-400 transition-all cursor-pointer"
            >
              Experience
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("how-it-works")}
              className="hover:text-white hover:underline underline-offset-8 decoration-indigo-400 transition-all cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("dishes")}
              className="hover:text-white hover:underline underline-offset-8 decoration-indigo-400 transition-all cursor-pointer"
            >
              Curated Dishes
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("for-restaurants")}
              className="hover:text-white hover:underline underline-offset-8 decoration-indigo-400 transition-all cursor-pointer"
            >
              For Restaurants
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3.5">
            <Link
              href="/login"
              className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 rounded-full hover:bg-white/[0.06] transition-all"
            >
              Restaurant Login
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection("ar-demo")}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:brightness-110 px-5 py-2.5 rounded-full shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all border border-white/20 active:scale-95 cursor-pointer"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
              <span>Bring Your Menu to Life</span>
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/80 text-white cursor-pointer"
          >
            <span
              className={`w-5 h-[1.8px] bg-white transition-transform duration-300 ${
                mobileMenuOpen ? "rotate-45 translate-y-[5px]" : ""
              }`}
            />
            <span
              className={`w-5 h-[1.8px] bg-white transition-opacity duration-300 ${
                mobileMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`w-5 h-[1.8px] bg-white transition-transform duration-300 ${
                mobileMenuOpen ? "-rotate-45 -translate-y-[5px]" : ""
              }`}
            />
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/[0.08] bg-[#0B1120]/95 backdrop-blur-2xl px-6 py-6 flex flex-col gap-4 shadow-2xl animate-fadeIn">
            <button
              type="button"
              onClick={() => scrollToSection("experience")}
              className="text-left font-medium text-slate-200 py-2 border-b border-white/[0.06]"
            >
              Experience
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("how-it-works")}
              className="text-left font-medium text-slate-200 py-2 border-b border-white/[0.06]"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("dishes")}
              className="text-left font-medium text-slate-200 py-2 border-b border-white/[0.06]"
            >
              Curated Dishes
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("for-restaurants")}
              className="text-left font-medium text-slate-200 py-2 border-b border-white/[0.06]"
            >
              For Restaurants
            </button>
            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-3 rounded-xl border border-white/10 font-semibold text-white bg-slate-900/80 shadow-xs"
              >
                Restaurant Login
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection("ar-demo")}
                className="w-full text-center py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 border border-white/20"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
                <span>Bring Your Menu to Life</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* ====================================================================
            2. HERO — SPATIAL LUXURY WITH CINEMATIC LIVING FOOD BACKGROUND
           ==================================================================== */}
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
          {/* z-0: CINEMATIC ROTATING LIVING FOOD BACKGROUND */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            {HERO_SCENES.map((scene, idx) => {
              const isActive = activeSceneIndex === idx;
              const hasVideo = Boolean(scene.videoSrc) && !videoErrors[scene.id];

              return (
                <div
                  key={scene.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <div className={`relative w-full h-full ${isActive ? "animate-ken-burns" : ""}`}>
                    <Image
                      src={scene.imageFallback}
                      alt={scene.alt}
                      fill
                      priority={idx === 0}
                      className="object-cover object-center brightness-[0.92] contrast-[1.05]"
                      sizes="100vw"
                    />

                    {hasVideo && (
                      <video
                        key={scene.videoSrc}
                        src={scene.videoSrc}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload={idx === 0 ? "auto" : "none"}
                        onError={() => handleVideoError(scene.id)}
                        className="absolute inset-0 w-full h-full object-cover object-center"
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {/* LOCALIZED READABILITY GRADIENTS ONLY */}
            {/* Desktop Left-to-Right localized gradient: soft falloff protecting headline typography */}
            <div
              className="hidden lg:block absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-[#0B1120]/95 via-[#0B1120]/60 via-[52%] to-transparent z-10 pointer-events-none"
              aria-hidden="true"
            />

            {/* Mobile / Tablet localized vertical gradient protecting headline when stacked */}
            <div
              className="lg:hidden absolute inset-0 bg-gradient-to-b from-[#0B1120]/95 via-[#0B1120]/60 to-[#0B1120]/90 z-10 pointer-events-none"
              aria-hidden="true"
            />

            {/* Soft top blend so navbar sits smoothly over the background */}
            <div
              className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-[#0B1120]/80 to-transparent z-10 pointer-events-none"
              aria-hidden="true"
            />

            {/* Soft bottom blend to transition smoothly into the next section */}
            <div
              className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#0B1120] to-transparent z-10 pointer-events-none"
              aria-hidden="true"
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Editorial Storytelling */}
              <ScrollReveal
                direction="up"
                distance={24}
                duration={750}
                className="lg:col-span-7 flex flex-col items-start pr-0 lg:pr-6"
              >
                {/* Eyebrow */}
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 font-mono text-xs uppercase tracking-[0.2em] mb-6 backdrop-blur-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>SPATIAL DINING TECHNOLOGY</span>
                </div>

                {/* Primary Headline */}
                <h1 className="font-serif text-4xl sm:text-6xl lg:text-[4.5rem] font-bold tracking-tight leading-[1.06] mb-6 text-white">
                  <span>Your Menu.</span> <br />
                  <span className="italic font-normal bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                    Beyond the Table.
                  </span>
                </h1>

                {/* Supporting Description */}
                <p className="text-lg sm:text-xl text-slate-300 max-w-xl leading-relaxed mb-8">
                  Experience food before you order. AR MENU transforms physical dining into an
                  immersive culinary journey. Guests explore chef-crafted dishes in true-scale 3D,
                  anchor food directly onto their physical dining table in Augmented Reality, and order
                  in seconds—with zero app download.
                </p>

                {/* CTA Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-8">
                  <button
                    type="button"
                    onClick={() => scrollToSection("ar-demo")}
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:brightness-110 text-white font-semibold text-base transition-all duration-300 shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] border border-white/20 active:scale-95 cursor-pointer"
                  >
                    <span>Bring Your Menu to Life</span>
                    <svg
                      className="w-4 h-4 text-cyan-200"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </button>

                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-7 py-4 rounded-full border border-white/15 hover:border-indigo-400 text-white hover:bg-white/[0.08] font-medium text-base transition-all bg-white/[0.04] backdrop-blur-md active:scale-95"
                  >
                    Restaurant Portal
                  </Link>
                </div>

                {/* Spatial Standards Metadata */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/[0.08] w-full max-w-lg">
                  <div>
                    <span className="block font-mono text-[11px] text-indigo-400/80 uppercase tracking-wider">
                      Setup
                    </span>
                    <span className="font-semibold text-sm text-white mt-0.5 block">
                      Zero App Install
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-[11px] text-indigo-400/80 uppercase tracking-wider">
                      Tracking
                    </span>
                    <span className="font-semibold text-sm text-white mt-0.5 block">
                      6DoF World Anchor
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-[11px] text-indigo-400/80 uppercase tracking-wider">
                      Scale
                    </span>
                    <span className="font-semibold text-sm text-white mt-0.5 block">
                      1:1 True Dining Size
                    </span>
                  </div>
                </div>

                {/* LIVE CINEMATIC SCENE PROGRESSION PILL */}
                <div className="flex items-center gap-3 pt-6 w-full max-w-lg">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    SCENE SEQUENCE
                  </span>
                  <div className="flex items-center gap-1.5">
                    {HERO_SCENES.map((scene, idx) => (
                      <button
                        key={scene.id}
                        type="button"
                        onClick={() => setActiveSceneIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                          activeSceneIndex === idx
                            ? "w-7 bg-indigo-500 shadow-sm shadow-indigo-500/50"
                            : "w-2 bg-slate-700 hover:bg-slate-500"
                        }`}
                        aria-label={`Jump to scene: ${scene.title}`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-white">
                    {HERO_SCENES[activeSceneIndex].stageNum} {HERO_SCENES[activeSceneIndex].actionLabel}
                  </span>
                </div>
              </ScrollReveal>

              {/* Right Column: Hero Visual Centerpiece with Layer 3 Spatial Scan Arc */}
              <ScrollReveal
                direction="up"
                distance={30}
                delay={150}
                className="lg:col-span-5 flex justify-center relative z-20"
              >
                {/* LAYER 3: SPATIAL SCAN ARC (Sweeping around centerpiece) */}
                <div
                  className="pointer-events-none absolute -inset-6 flex items-center justify-center -z-10"
                  aria-hidden="true"
                >
                  <svg
                    className="w-[125%] h-[125%] animate-scan-arc-sweep"
                    viewBox="0 0 500 500"
                    fill="none"
                  >
                    <circle
                      cx="250"
                      cy="250"
                      r="230"
                      stroke="#6366F1"
                      strokeWidth="1.2"
                      strokeDasharray="40 240 60 140"
                    />
                    <circle cx="250" cy="20" r="3" fill="#38BDF8" />
                  </svg>
                  <svg
                    className="absolute w-[112%] h-[112%] animate-scan-arc-reverse"
                    viewBox="0 0 460 460"
                    fill="none"
                  >
                    <circle
                      cx="230"
                      cy="230"
                      r="215"
                      stroke="#38BDF8"
                      strokeWidth="0.8"
                      strokeDasharray="18 120"
                    />
                  </svg>
                </div>

                {/* Controlled Parallax Card (Restrained 8–10px shift) */}
                <div
                  ref={heroCardRef}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translate3d(${tilt.px}px, ${tilt.py}px, 0)`,
                    transition: tilt.x === 0 ? "transform 0.6s ease-out" : "transform 0.1s ease-out",
                  }}
                  className="relative w-full max-w-md rounded-3xl bg-slate-900 shadow-2xl shadow-indigo-950/60 overflow-hidden border border-indigo-500/30 group cursor-default"
                >
                  {/* Dish Presentation on Oak Table */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
                    <Image
                      src="/images/hero-dish.jpg"
                      alt="Truffle Wagyu Smash Burger realistically sitting on an upscale restaurant oak dining table"
                      width={1200}
                      height={900}
                      priority
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Dining Table Soft Vignette */}
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/95 via-transparent to-slate-950/40"
                      aria-hidden="true"
                    />

                    {/* Apple-Style Spatial AR Reticle & Coordinates */}
                    {showSpatialOverlay && (
                      <div className="pointer-events-none absolute inset-0 p-5 flex flex-col justify-between">
                        {/* Top Badges */}
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-indigo-500/40 text-[10px] font-mono tracking-widest text-indigo-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                            <span>SURFACE DETECTED</span>
                          </div>

                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/20 text-[10px] font-mono tracking-wider text-slate-300">
                            <span>TRUE SCALE 1:1</span>
                          </div>
                        </div>

                        {/* Center Tracking Reticle */}
                        <div className="self-center flex flex-col items-center">
                          <div className="relative w-16 h-16 rounded-full border border-indigo-400/50 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                            {/* Reticle Crosshairs */}
                            <div className="absolute top-0 w-[1px] h-2 bg-indigo-400/70" />
                            <div className="absolute bottom-0 w-[1px] h-2 bg-indigo-400/70" />
                            <div className="absolute left-0 w-2 h-[1px] bg-indigo-400/70" />
                            <div className="absolute right-0 w-2 h-[1px] bg-indigo-400/70" />
                          </div>
                          <span className="mt-1 text-[9px] font-mono tracking-[0.25em] text-slate-300 uppercase">
                            TABLE 04 • 6DoF ANCHOR
                          </span>
                        </div>

                        {/* Bottom Metadata */}
                        <div className="flex items-end justify-between text-[10px] font-mono text-slate-300">
                          <div>
                            <span className="text-indigo-400 block">COORDINATES</span>
                            <span className="text-white">X: 0.00m • Y: -0.42m</span>
                          </div>
                          <div className="text-right">
                            <span className="text-indigo-400 block">MODEL STATE</span>
                            <span className="text-emerald-400 font-semibold">AR READY</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Panel */}
                  <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-t border-white/[0.08]">
                    <div>
                      <span className="font-mono text-xs text-indigo-400 uppercase tracking-wider font-semibold">
                        Signature Main • ₹549
                      </span>
                      <h2 className="font-semibold text-lg text-white">
                        Truffle Wagyu Burger
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Double patty • Farmhouse aged cheddar
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSpatialOverlay(!showSpatialOverlay)}
                      className="px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/70 text-[11px] font-mono text-indigo-300 hover:bg-indigo-900/60 hover:border-indigo-400 transition-colors cursor-pointer"
                    >
                      {showSpatialOverlay ? "Hide Reticle" : "Show Reticle"}
                    </button>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ====================================================================
            3. SIGNATURE PRODUCT MOMENT — CONTINUOUS VISUAL JOURNEY
           ==================================================================== */}
        <section
          id="how-it-works"
          className="py-20 md:py-28 bg-[#070B14] border-y border-white/[0.08] relative overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            {/* Section Header */}
            <ScrollReveal direction="up" className="max-w-2xl mx-auto text-center mb-16">
              <span className="font-mono text-xs text-indigo-400 uppercase tracking-[0.25em] block mb-2 font-semibold">
                THE TRANSFORMATION JOURNEY
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white">
                From physical table to{" "}
                <span className="italic font-normal bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                  interactive dining.
                </span>
              </h2>
              <p className="text-slate-300 mt-3 text-base sm:text-lg">
                Four seamless steps engineered for guest delight and zero operational friction.
              </p>
            </ScrollReveal>

            {/* Continuous Journey Step Rail */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
              {JOURNEY_STEPS.map((item, idx) => {
                const isActive = activeStepIndex === idx;
                return (
                  <ScrollReveal
                    key={item.id}
                    staggerIndex={idx}
                    direction="up"
                    className="h-full"
                  >
                    <div
                      onClick={() => setActiveStepIndex(idx)}
                      className={`relative h-full p-6 sm:p-7 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                        isActive
                          ? "bg-slate-900/95 shadow-xl shadow-indigo-500/15 border-2 border-indigo-500 -translate-y-1.5"
                          : "bg-slate-900/50 hover:bg-slate-800/60 border border-white/[0.08] hover:border-indigo-500/40 hover:-translate-y-1"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <span
                            className={`font-mono text-2xl font-bold ${
                              isActive ? "text-indigo-400" : "text-slate-500"
                            }`}
                          >
                            {item.step}
                          </span>
                          <span className="font-mono text-[10px] tracking-widest px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 uppercase">
                            {item.tag}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-white mb-1">{item.title}</h3>
                        <h4 className="text-sm font-medium text-indigo-400/90 mb-3">{item.subtitle}</h4>

                        <p className="text-sm text-slate-300 leading-relaxed mb-6">
                          {item.description}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                        <span className="text-[11px] font-mono text-slate-400">Benchmark</span>
                        <span className="text-xs font-mono font-semibold text-indigo-300">
                          {item.metric}
                        </span>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ====================================================================
            4. AR SHOWCASE — IMMERSIVE WALKAROUND EXPERIENCE
           ==================================================================== */}
        <section
          id="experience"
          className="py-24 sm:py-32 bg-[#0B1120] text-slate-100 relative overflow-hidden"
        >
          {/* Subtle Ambient Radial Electric Glow */}
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.18)_0%,rgba(139,92,246,0.12)_45%,transparent_75%)] -z-10"
            aria-hidden="true"
          />

          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              {/* Left Column: Device Mockup displaying real AR Table Anchoring */}
              <ScrollReveal
                direction="left"
                distance={30}
                className="lg:col-span-6 flex justify-center order-2 lg:order-1 relative"
              >
                {/* Background Rotating Spatial Rings behind phone */}
                <div
                  className="pointer-events-none absolute -inset-8 flex items-center justify-center -z-10"
                  aria-hidden="true"
                >
                  <svg
                    className="w-[120%] h-[120%] animate-scan-arc-sweep opacity-30"
                    viewBox="0 0 400 400"
                    fill="none"
                  >
                    <circle
                      cx="200"
                      cy="200"
                      r="180"
                      stroke="#6366F1"
                      strokeWidth="1.2"
                      strokeDasharray="16 32"
                    />
                  </svg>
                </div>

                <div className="relative w-full max-w-sm rounded-[2.5rem] bg-slate-950 p-3 shadow-2xl shadow-indigo-950/80 border border-indigo-500/30">
                  {/* Smartphone Screen */}
                  <div className="relative aspect-[3/4] w-full rounded-[2rem] overflow-hidden bg-slate-900">
                    <Image
                      src="/images/ar-showcase-phone.jpg"
                      alt="Real diner holding a smartphone over a wooden table viewing an anchored 3D dish in Augmented Reality"
                      width={900}
                      height={1200}
                      className="w-full h-full object-cover"
                    />

                    {/* Native AR Spatial HUD Overlay */}
                    <div className="pointer-events-none absolute inset-0 p-5 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-slate-950/90 text-indigo-300 border border-indigo-500/40">
                          ● ANCHORED (6DoF)
                        </span>
                        <span className="text-[10px] font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-slate-950/90 text-slate-300 border border-white/20">
                          TABLE 04
                        </span>
                      </div>

                      <div className="self-center px-4 py-2 rounded-full bg-slate-950/90 backdrop-blur-md border border-indigo-500/40 text-xs font-medium text-white shadow-lg text-center">
                        Walk 360° around table to inspect angles
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Right Column: Exact AR Capabilities Communication */}
              <ScrollReveal
                direction="right"
                distance={30}
                className="lg:col-span-6 order-1 lg:order-2 flex flex-col items-start"
              >
                <span className="font-mono text-xs text-indigo-400 uppercase tracking-[0.25em] block mb-3 font-semibold">
                  SPATIAL DINING EXPERIENCE
                </span>

                <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight mb-6">
                  Don&apos;t just read the menu. <br />
                  <span className="italic font-normal bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                    See it on your table.
                  </span>
                </h2>

                <p className="text-lg text-slate-300 leading-relaxed mb-8">
                  Unlike generic 3D viewers that float within a web browser window, AR MENU anchors
                  the dish physically to the dining surface using native hardware tracking.
                </p>

                {/* Core Feature Pillars */}
                <div className="space-y-5 w-full">
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.08] hover:border-indigo-500/30 hover:bg-slate-800/40 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-mono text-xs font-bold mt-0.5 shrink-0">
                        01
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-base">Place it on your table</h4>
                        <p className="text-sm text-slate-300/80 mt-1">
                          Detects the horizontal tabletop surface using Google Scene Viewer on Android
                          and Apple Quick Look on iOS.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.08] hover:border-indigo-500/30 hover:bg-slate-800/40 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-mono text-xs font-bold mt-0.5 shrink-0">
                        02
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-base">Walk around it in 360°</h4>
                        <p className="text-sm text-slate-300/80 mt-1">
                          The dish stays spatially locked to the wood or linen tabletop while you move
                          your phone around it. No phone-following drift.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.08] hover:border-indigo-500/30 hover:bg-slate-800/40 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-mono text-xs font-bold mt-0.5 shrink-0">
                        03
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-base">See true scale before ordering</h4>
                        <p className="text-sm text-slate-300/80 mt-1">
                          Guests can examine plating artistry, garnish details, and actual portion
                          sizes with 1:1 physical accuracy.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => scrollToSection("ar-demo")}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:brightness-110 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-lg shadow-indigo-500/25 cursor-pointer"
                    >
                      <span>Try Live AR Demo Below</span>
                      <span>↓</span>
                    </button>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ====================================================================
            4B. INTERACTIVE AR DEMO SECTION — THE DISH, IN YOUR SPACE
           ==================================================================== */}
        <section
          id="ar-demo"
          className="py-24 sm:py-32 bg-[#070B14] border-t border-white/[0.08] relative overflow-hidden"
        >
          {/* Subtle Ambient Spatial Glow and Grid Matrix */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            aria-hidden="true"
          >
            {/* Soft Warm Radial Glow */}
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.14)_0%,rgba(56,189,248,0.06)_45%,transparent_70%)] blur-2xl" />

            {/* Subtle Surface Coordinate Grid */}
            <svg
              className="absolute inset-0 w-full h-full opacity-[0.035]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="spatial-demo-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FFFFFF" strokeWidth="1" />
                  <circle cx="0" cy="0" r="1.5" fill="#6366F1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#spatial-demo-grid)" />
            </svg>
          </div>

          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              {/* Left Column: Editorial Typography & Spatial Controls */}
              <ScrollReveal
                direction="left"
                distance={30}
                className="lg:col-span-6 flex flex-col items-start pr-0 lg:pr-6"
              >
                {/* Eyebrow Label */}
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-indigo-300 font-mono text-xs uppercase tracking-[0.2em] mb-6 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="font-semibold text-white">INTERACTIVE AR DEMO</span>
                  <span className="text-indigo-400">•</span>
                  <span className="text-indigo-400">THE DISH, IN YOUR SPACE</span>
                </div>

                {/* Primary Heading */}
                <h2 className="font-serif text-3xl sm:text-5xl lg:text-[3.75rem] font-bold tracking-tight text-white leading-[1.08] mb-6">
                  Taste It Before <br />
                  <span className="italic font-normal bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                    You Order.
                  </span>
                </h2>

                {/* Supporting Text */}
                <p className="text-lg sm:text-xl text-slate-300 max-w-xl leading-relaxed mb-8">
                  Step into the future of dining. Place a dish in your own space with augmented
                  reality and explore it from every angle.
                </p>

                {/* Interactive Demo Dish Switcher */}
                <div className="w-full max-w-lg mb-8">
                  <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center justify-between font-semibold">
                    <span>SELECT DEMO DISH</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {demoDishes.filter((d) => d.arReady && d.modelUrl).length} MODELS READY
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-slate-900/80 border border-white/[0.1] shadow-xl">
                    {demoDishes.map((dish) => {
                      const isCurrent = activeDemoDish.id === dish.id;
                      return (
                        <button
                          key={dish.id}
                          type="button"
                          onClick={() => setActiveDemoDishId(dish.id)}
                          className={`py-3 px-3.5 rounded-xl text-left transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                            isCurrent
                              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20"
                              : "text-slate-300 hover:bg-slate-800/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span
                              className={`text-[10px] font-mono tracking-wider uppercase font-semibold ${
                                isCurrent ? "text-cyan-200" : "text-slate-400"
                              }`}
                            >
                              {dish.category}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                dish.isVeg ? "bg-emerald-400" : "bg-red-400"
                              }`}
                            />
                          </div>
                          <span className="font-semibold text-sm truncate text-white">
                            {dish.name}
                          </span>
                          <span
                            className={`font-mono text-xs font-bold mt-1 ${
                              isCurrent ? "text-white" : "text-indigo-400"
                            }`}
                          >
                            {dish.price}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Launch Action */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-4">
                  <button
                    type="button"
                    disabled={!activeDemoDish.arReady || !activeDemoDish.modelUrl}
                    onClick={() => {
                      if (activeDemoDish.arReady && activeDemoDish.modelUrl) {
                        setArViewerDish(activeDemoDish);
                      }
                    }}
                    className={`inline-flex items-center justify-center gap-3.5 px-8 py-4.5 rounded-full font-semibold text-base transition-all duration-300 shadow-lg ${
                      activeDemoDish.arReady && activeDemoDish.modelUrl
                        ? "bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:brightness-110 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] border border-white/20 group cursor-pointer active:scale-95"
                        : "bg-slate-800/60 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-80"
                    }`}
                  >
                    {/* Spatial 3D Cube Icon */}
                    <svg
                      className="w-5 h-5 text-cyan-300 group-hover:scale-110 transition-transform"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                      <path d="m3.3 7 8.7 5 8.7-5" />
                      <path d="M12 22V12" />
                    </svg>
                    <span>
                      {activeDemoDish.arReady && activeDemoDish.modelUrl
                        ? "VIEW IN AR"
                        : "AR MODEL UNAVAILABLE"}
                    </span>
                    {activeDemoDish.arReady && activeDemoDish.modelUrl && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    )}
                  </button>
                </div>

                {/* Secondary Micro Text */}
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>No login required • Camera enabled • Instant table placement</span>
                </div>

                {/* Spatial Standards Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg pt-6 border-t border-white/[0.08]">
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-white/[0.08]">
                    <span className="block font-mono text-[10px] text-indigo-400/80 uppercase tracking-wider font-semibold">
                      Tracking
                    </span>
                    <span className="font-semibold text-xs text-white mt-0.5 block">
                      6DoF World Anchor
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/70 border border-white/[0.08]">
                    <span className="block font-mono text-[10px] text-indigo-400/80 uppercase tracking-wider font-semibold">
                      Scale
                    </span>
                    <span className="font-semibold text-xs text-white mt-0.5 block">
                      1:1 True-to-Plate
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-900/70 border border-white/[0.08]">
                    <span className="block font-mono text-[10px] text-indigo-400/80 uppercase tracking-wider font-semibold">
                      Surface Status
                    </span>
                    <span
                      className={`font-semibold text-xs mt-0.5 flex items-center gap-1.5 ${
                        activeDemoDish.arReady && activeDemoDish.modelUrl
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          activeDemoDish.arReady && activeDemoDish.modelUrl
                            ? "bg-emerald-400 animate-pulse"
                            : "bg-amber-400"
                        }`}
                      />
                      {activeDemoDish.arReady && activeDemoDish.modelUrl
                        ? "SURFACE READY"
                        : "MODEL PENDING"}
                    </span>
                  </div>
                </div>
              </ScrollReveal>

              {/* Right Column: Spatial Frame Showcase (Asymmetric Composition) */}
              <ScrollReveal
                direction="right"
                distance={30}
                delay={150}
                className="lg:col-span-6 relative flex flex-col items-center"
              >
                {/* Outer Spatial Frame with Corner Crosshairs */}
                <div className="relative w-full max-w-lg">
                  {/* Coordinate Crosshairs */}
                  <div className="pointer-events-none absolute -top-3.5 -left-3.5 font-mono text-sm text-indigo-400 select-none z-20">
                    +
                  </div>
                  <div className="pointer-events-none absolute -top-3.5 -right-3.5 font-mono text-sm text-indigo-400 select-none z-20">
                    +
                  </div>
                  <div className="pointer-events-none absolute -bottom-3.5 -left-3.5 font-mono text-sm text-indigo-400 select-none z-20">
                    +
                  </div>
                  <div className="pointer-events-none absolute -bottom-3.5 -right-3.5 font-mono text-sm text-indigo-400 select-none z-20">
                    +
                  </div>

                  {/* Thin Rotating AR Scanning Rings */}
                  <div
                    className="pointer-events-none absolute inset-0 flex items-center justify-center -z-10"
                    aria-hidden="true"
                  >
                    <svg
                      className="w-[125%] h-[125%] animate-scan-arc-sweep"
                      viewBox="0 0 500 500"
                      fill="none"
                    >
                      <circle
                        cx="250"
                        cy="250"
                        r="215"
                        stroke="#6366F1"
                        strokeWidth="1.2"
                        strokeDasharray="14 26"
                        opacity="0.4"
                      />
                      <circle
                        cx="250"
                        cy="250"
                        r="240"
                        stroke="#38BDF8"
                        strokeWidth="0.8"
                        strokeDasharray="6 32"
                        opacity="0.3"
                      />
                    </svg>
                  </div>

                  {/* Main Hero Dish Card */}
                  <div className="relative w-full rounded-3xl bg-slate-900 border border-white/[0.1] shadow-2xl overflow-hidden group hover:shadow-indigo-500/10 hover:border-indigo-500/50 transition-all duration-500">
                    {/* Dish Photography with 4:3 Aspect Ratio */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
                      <Image
                        src={activeDemoDish.image}
                        alt={activeDemoDish.name}
                        width={1200}
                        height={900}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                        priority
                      />

                      {/* Top Badges */}
                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-[10px] font-mono tracking-widest text-slate-200 uppercase border border-white/10">
                            {activeDemoDish.category}
                          </span>
                          {activeDemoDish.arReady && activeDemoDish.modelUrl ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 backdrop-blur-md text-[10px] font-mono tracking-wider text-emerald-300 uppercase border border-emerald-500/30 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              SURFACE READY
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-amber-950/80 backdrop-blur-md text-[10px] font-mono tracking-wider text-amber-300 uppercase border border-amber-500/30 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              AR MODEL PENDING
                            </span>
                          )}
                        </div>

                        <div
                          className="w-6 h-6 rounded-md border border-white/10 bg-slate-900/90 flex items-center justify-center p-0.5 shadow-sm"
                          title={activeDemoDish.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                        >
                          <span
                            className={`w-3 h-3 rounded-full ${
                              activeDemoDish.isVeg ? "bg-emerald-400" : "bg-red-400"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Subtle Spatial Coordinate Telemetry */}
                      <div className="absolute bottom-3 left-4 font-mono text-[10px] text-white/95 bg-slate-950/75 backdrop-blur-sm px-2.5 py-1 rounded-md tracking-wider border border-white/10">
                        6DoF • [X: 0.00, Y: -0.42, Z: +0.65]
                      </div>

                      {/* Quick "VIEW IN AR" action over image */}
                      <div className="absolute bottom-3 right-4">
                        <button
                          type="button"
                          disabled={!activeDemoDish.arReady || !activeDemoDish.modelUrl}
                          onClick={() => {
                            if (activeDemoDish.arReady && activeDemoDish.modelUrl) {
                              setArViewerDish(activeDemoDish);
                            }
                          }}
                          className={`px-4 py-2 rounded-full font-bold text-xs shadow-lg transition-all flex items-center gap-1.5 border ${
                            activeDemoDish.arReady && activeDemoDish.modelUrl
                              ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white border-white/20 hover:shadow-indigo-500/30 cursor-pointer"
                              : "bg-slate-900/80 text-slate-500 border-white/10 cursor-not-allowed opacity-80"
                          }`}
                        >
                          <span>
                            {activeDemoDish.arReady && activeDemoDish.modelUrl
                              ? "VIEW IN AR"
                              : "AR UNAVAILABLE"}
                          </span>
                          {activeDemoDish.arReady && activeDemoDish.modelUrl && (
                            <svg
                              className="w-3.5 h-3.5 text-cyan-200"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                            >
                              <path d="M5 12h14" />
                              <path d="m12 5 7 7-7 7" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Dish Content Details */}
                    <div className="p-6 sm:p-7 bg-slate-900">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <h3 className="font-bold text-2xl text-white">
                          {activeDemoDish.name}
                        </h3>
                        <span className="font-mono font-bold text-2xl text-indigo-300">
                          {activeDemoDish.price}
                        </span>
                      </div>

                      <p className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-3 font-semibold">
                        {activeDemoDish.subtitle}
                      </p>

                      <p className="text-sm text-slate-300 leading-relaxed mb-5">
                        {activeDemoDish.description}
                      </p>

                      <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/[0.08]">
                            {activeDemoDish.arReady && activeDemoDish.modelUrl
                              ? "3D MODEL READY"
                              : "3D MODEL PENDING"}
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                            {activeDemoDish.scaleMetric}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={!activeDemoDish.arReady || !activeDemoDish.modelUrl}
                          onClick={() => {
                            if (activeDemoDish.arReady && activeDemoDish.modelUrl) {
                              setArViewerDish(activeDemoDish);
                            }
                          }}
                          className={`text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                            activeDemoDish.arReady && activeDemoDish.modelUrl
                              ? "text-indigo-400 hover:text-indigo-300 cursor-pointer"
                              : "text-slate-500 cursor-not-allowed"
                          }`}
                        >
                          <span>
                            {activeDemoDish.arReady && activeDemoDish.modelUrl
                              ? "Launch Table AR"
                              : "AR Model Unavailable"}
                          </span>
                          {activeDemoDish.arReady && activeDemoDish.modelUrl && <span>→</span>}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Second Smaller Demo Dish (Asymmetric Overlapping Card) */}
                  <div
                    onClick={() => setActiveDemoDishId(secondaryDemoDish.id)}
                    className="mt-6 sm:-mt-8 sm:-mr-6 sm:self-end w-full sm:max-w-md rounded-2xl bg-slate-900/95 backdrop-blur-xl p-4 sm:p-4.5 border border-indigo-500/40 shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 flex items-center gap-4 cursor-pointer group hover:border-indigo-400 relative z-10"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-18 h-18 rounded-xl overflow-hidden bg-slate-950 shrink-0 border border-white/[0.08]">
                      <Image
                        src={secondaryDemoDish.image}
                        alt={secondaryDemoDish.name}
                        width={160}
                        height={160}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute top-1 left-1">
                        <span
                          className={`w-2 h-2 rounded-full block ${
                            secondaryDemoDish.isVeg ? "bg-emerald-400" : "bg-red-400"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-[10px] font-mono tracking-wider text-indigo-400 uppercase font-semibold">
                          ALSO IN AR • DEMO 2
                        </span>
                        <span className="font-mono font-bold text-sm text-indigo-300">
                          {secondaryDemoDish.price}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm sm:text-base text-white truncate group-hover:text-indigo-300 transition-colors">
                        {secondaryDemoDish.name}
                      </h4>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {secondaryDemoDish.subtitle}
                      </p>
                    </div>

                    {/* Direct AR Action */}
                    <button
                      type="button"
                      disabled={!secondaryDemoDish.arReady || !secondaryDemoDish.modelUrl}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (secondaryDemoDish.arReady && secondaryDemoDish.modelUrl) {
                          setArViewerDish(secondaryDemoDish);
                        }
                      }}
                      aria-label={`View ${secondaryDemoDish.name} in AR`}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold shrink-0 transition-all flex items-center gap-1 shadow-sm ${
                        secondaryDemoDish.arReady && secondaryDemoDish.modelUrl
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white group-hover:scale-105 cursor-pointer shadow-indigo-500/20"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      <span>
                        {secondaryDemoDish.arReady && secondaryDemoDish.modelUrl
                          ? "AR"
                          : "PENDING"}
                      </span>
                      {secondaryDemoDish.arReady && secondaryDemoDish.modelUrl && (
                        <svg
                          className="w-3.5 h-3.5 text-cyan-200"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ====================================================================
            5. CURATED DISHES — EDITORIAL RESTAURANT MENU (IN RUPEES)
           ==================================================================== */}
        <section id="dishes" className="py-20 md:py-32 bg-[#0B1120] border-t border-white/[0.08]">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            {/* Header */}
            <ScrollReveal direction="up" className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <span className="font-mono text-xs text-indigo-400 uppercase tracking-[0.25em] block mb-2 font-semibold">
                  CURATED COLLECTION
                </span>
                <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white">
                  Crafted for the{" "}
                  <span className="italic font-normal bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                    senses.
                  </span>
                </h2>
              </div>
              <p className="text-slate-300 max-w-md text-base">
                Explore signature culinary creations presented in high-fidelity photography,
                volumetric 3D, and augmented reality.
              </p>
            </ScrollReveal>

            {/* Menu Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {CURATED_DISHES.map((dish, idx) => (
                <ScrollReveal
                  key={dish.id}
                  staggerIndex={idx}
                  direction="up"
                  className="h-full"
                >
                  <article className="h-full rounded-3xl bg-slate-900/90 border border-white/[0.08] shadow-lg overflow-hidden flex flex-col group hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/40 transition-all duration-300">
                    {/* Dish Image */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
                      <Image
                        src={dish.image}
                        alt={dish.name}
                        width={1200}
                        height={900}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />

                      {/* Top Tags */}
                      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                        <span className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-[10px] font-mono tracking-widest text-slate-200 uppercase border border-white/10">
                          {dish.category}
                        </span>

                        {/* Veg / Non-Veg Indicator */}
                        <div
                          className="w-5 h-5 rounded border border-white/10 bg-slate-900/90 flex items-center justify-center p-0.5 shadow-sm"
                          title={dish.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              dish.isVeg ? "bg-emerald-400" : "bg-red-400"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Indigo Hairline Highlight on Hover */}
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    {/* Dish Content */}
                    <div className="p-7 flex flex-col flex-grow justify-between">
                      <div>
                        <div className="flex items-baseline justify-between mb-2">
                          <h3 className="font-bold text-xl text-white">{dish.name}</h3>
                          <span className="font-mono font-bold text-xl text-indigo-300">
                            {dish.price}
                          </span>
                        </div>

                        <p className="text-sm text-slate-300 leading-relaxed mb-4">
                          {dish.description}
                        </p>

                        <div className="text-xs font-mono text-indigo-400/90 italic mb-6">
                          {dish.pairing}
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/[0.08]">
                            3D READY
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                            AR READY
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedDishForModal(dish)}
                          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>View Details</span>
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================================
            6. RESTAURANT OWNER SECTION — SAAS CONSOLE PREVIEW
           ==================================================================== */}
        <section
          id="for-restaurants"
          className="py-20 md:py-32 bg-[#070B14] border-y border-white/[0.08]"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <ScrollReveal direction="up" className="max-w-3xl mx-auto text-center mb-16">
              <span className="font-mono text-xs text-indigo-400 uppercase tracking-[0.25em] block mb-2 font-semibold">
                RESTAURANT MANAGEMENT CONSOLE
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white">
                One platform. <br />
                <span className="italic font-normal bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                  Your entire dining room.
                </span>
              </h2>
              <p className="text-slate-300 mt-4 text-base sm:text-lg">
                Empower your culinary and floor team with real-time menu synchronization, 3D model
                uploads, table QR generation, and live kitchen order routing.
              </p>
            </ScrollReveal>

            {/* Deep Modern Console Mockup Container */}
            <ScrollReveal direction="up" distance={30} className="max-w-5xl mx-auto">
              <div className="rounded-3xl bg-slate-950 border border-indigo-500/30 shadow-2xl shadow-indigo-950/80 overflow-hidden">
                {/* Console Window Header Bar */}
                <div className="bg-slate-900/90 px-6 py-4 flex items-center justify-between text-white border-b border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                    </div>
                    <span className="text-xs font-mono text-slate-300 ml-2">
                      AR MENU • Management Portal [Preview]
                    </span>
                  </div>

                  {/* Animated Pulsing Status Badges */}
                  <div className="hidden sm:flex items-center gap-4 text-[11px] font-mono">
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      MENU SYNCED
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-indigo-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                      3D MODEL READY
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-sky-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                      ORDERS LIVE
                    </span>
                  </div>
                </div>

                {/* Console Tabs */}
                <div className="flex border-b border-white/[0.08] bg-slate-900/60 px-6 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveDashboardTab("menu")}
                    className={`py-3.5 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                      activeDashboardTab === "menu"
                        ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
                        : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    Digital Menu & 3D Models
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDashboardTab("tables")}
                    className={`py-3.5 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                      activeDashboardTab === "tables"
                        ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
                        : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    Tables & QR Provisioning
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDashboardTab("orders")}
                    className={`py-3.5 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                      activeDashboardTab === "orders"
                        ? "border-indigo-500 text-indigo-400 bg-indigo-500/10"
                        : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    Live Kitchen Orders
                  </button>
                </div>

                {/* Console Inner SaaS Workspace */}
                <div className="bg-slate-900/90 text-slate-100">
                  {/* Tab 1: Menu Management Preview */}
                  {activeDashboardTab === "menu" && (
                    <div className="p-6 sm:p-8 space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-mono text-slate-400 uppercase font-semibold">
                          Configured Menu Items (3 Active)
                        </span>
                        <span className="text-xs font-mono text-indigo-300 font-semibold bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-500/40">
                          + Add 3D Dish (.glb up to 50MB)
                        </span>
                      </div>

                      <div className="divide-y divide-white/[0.06] border border-white/[0.08] rounded-xl overflow-hidden bg-slate-800/40">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-950 overflow-hidden relative border border-white/[0.08]">
                              <Image
                                src="/images/hero-dish.jpg"
                                alt="Burger"
                                width={80}
                                height={80}
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-white">
                                Truffle Wagyu Smash Burger
                              </h4>
                              <span className="text-xs text-slate-400">₹549 • Signature Mains</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 text-xs font-mono font-medium border border-emerald-500/30">
                              3D Model (.glb) Attached
                            </span>
                            <span className="text-xs text-slate-400">Published</span>
                          </div>
                        </div>

                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-950 overflow-hidden relative border border-white/[0.08]">
                              <Image
                                src="/images/artisan-pizza.jpg"
                                alt="Pizza"
                                width={80}
                                height={80}
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-white">
                                Artisanal Burrata Margherita
                              </h4>
                              <span className="text-xs text-slate-400">
                                ₹449 • Wood-Fired Hearth (Veg)
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 text-xs font-mono font-medium border border-emerald-500/30">
                              3D Model (.glb) Attached
                            </span>
                            <span className="text-xs text-slate-400">Published</span>
                          </div>
                        </div>

                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-950 overflow-hidden relative border border-white/[0.08]">
                              <Image
                                src="/images/seared-salmon.jpg"
                                alt="Salmon"
                                width={80}
                                height={80}
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-white">
                                Pan-Seared King Salmon
                              </h4>
                              <span className="text-xs text-slate-400">
                                ₹699 • Seafood Specialties
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 text-xs font-mono font-medium border border-emerald-500/30">
                              3D Model (.glb) Attached
                            </span>
                            <span className="text-xs text-slate-400">Published</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Tables & QR Preview */}
                  {activeDashboardTab === "tables" && (
                    <div className="p-6 sm:p-8 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl border border-white/[0.08] bg-slate-800/40 text-center">
                          <span className="font-mono text-xs text-indigo-400 uppercase font-semibold">Dining Room</span>
                          <h4 className="font-bold text-xl text-white mt-1">Table 01</h4>
                          <div className="w-24 h-24 mx-auto my-3 bg-slate-950 border border-white/[0.08] rounded-xl flex items-center justify-center font-mono text-[10px] text-slate-400">
                            [ QR CODE ]
                          </div>
                          <span className="text-xs font-mono text-emerald-400 block">● Active</span>
                        </div>

                        <div className="p-5 rounded-2xl border border-white/[0.08] bg-slate-800/40 text-center">
                          <span className="font-mono text-xs text-indigo-400 uppercase font-semibold">Dining Room</span>
                          <h4 className="font-bold text-xl text-white mt-1">Table 02</h4>
                          <div className="w-24 h-24 mx-auto my-3 bg-slate-950 border border-white/[0.08] rounded-xl flex items-center justify-center font-mono text-[10px] text-slate-400">
                            [ QR CODE ]
                          </div>
                          <span className="text-xs font-mono text-emerald-400 block">● Active</span>
                        </div>

                        <div className="p-5 rounded-2xl border border-white/[0.08] bg-slate-800/40 text-center">
                          <span className="font-mono text-xs text-indigo-400 uppercase font-semibold">Terrace</span>
                          <h4 className="font-bold text-xl text-white mt-1">Table 03</h4>
                          <div className="w-24 h-24 mx-auto my-3 bg-slate-950 border border-white/[0.08] rounded-xl flex items-center justify-center font-mono text-[10px] text-slate-400">
                            [ QR CODE ]
                          </div>
                          <span className="text-xs font-mono text-emerald-400 block">● Active</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Live Orders Preview */}
                  {activeDashboardTab === "orders" && (
                    <div className="p-6 sm:p-8 space-y-4">
                      <div className="border border-white/[0.08] rounded-xl overflow-hidden divide-y divide-white/[0.06] bg-slate-800/40">
                        <div className="p-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">Order #2891</span>
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/[0.08]">
                                Table 04
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              1x Truffle Wagyu Burger, 1x Artisanal Burrata Margherita
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              Preparing
                            </span>
                            <span className="block text-xs font-mono text-indigo-300 font-bold mt-1">
                              ₹998
                            </span>
                          </div>
                        </div>

                        <div className="p-4 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">Order #2890</span>
                              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/[0.08]">
                                Table 02
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              2x Pan-Seared King Salmon, 2x Sparkling Mineral Water
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium">
                              Ready for Service
                            </span>
                            <span className="block text-xs font-mono text-indigo-300 font-bold mt-1">
                              ₹1,598
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Console Action Bar */}
                  <div className="bg-slate-950 px-8 py-5 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <span className="text-xs text-slate-400 font-mono">
                      Product Preview • Powered by PostgreSQL Realtime
                    </span>
                    <Link
                      href="/login"
                      className="font-semibold text-sm text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span>Launch Restaurant Console</span>
                      <svg
                        className="w-4 h-4 text-indigo-400"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ====================================================================
            7. WHY AR MENU — PARADIGM SHIFT COMPARISON
           ==================================================================== */}
        <section className="py-20 md:py-28 bg-[#0B1120] border-t border-white/[0.08]">
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            <ScrollReveal direction="up" className="text-center mb-16">
              <span className="font-mono text-xs text-indigo-400 uppercase tracking-[0.25em] block mb-2 font-semibold">
                THE PARADIGM SHIFT
              </span>
              <h2 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white">
                A fundamental upgrade to the{" "}
                <span className="italic font-normal bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                  dining ritual.
                </span>
              </h2>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Old Experience */}
              <ScrollReveal direction="left" className="h-full">
                <div className="h-full p-8 rounded-3xl bg-slate-900/40 border border-white/[0.08] flex flex-col justify-between text-slate-400">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider text-slate-500 block mb-3 font-semibold">
                      Traditional Dining
                    </span>
                    <h3 className="text-2xl font-bold text-slate-200 mb-4">The Paper Menu</h3>
                    <ul className="space-y-3.5 text-slate-400 text-sm">
                      <li className="flex items-start gap-2.5">
                        <span className="text-slate-500 mt-0.5 font-mono">—</span>
                        <span>Text-heavy descriptions that leave portion size to guesswork.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-slate-500 mt-0.5 font-mono">—</span>
                        <span>No visual confirmation of presentation or garnishes.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-slate-500 mt-0.5 font-mono">—</span>
                        <span>Ordering delays waiting for available floor staff.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-slate-500 mt-0.5 font-mono">—</span>
                        <span>Expensive menu reprints whenever seasonal dishes change.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-8 pt-4 border-t border-white/[0.06] text-xs font-mono text-slate-500">
                    Static • High Friction • No Visual Context
                  </div>
                </div>
              </ScrollReveal>

              {/* The AR Menu Experience */}
              <ScrollReveal direction="right" className="h-full">
                <div className="h-full p-8 rounded-3xl bg-slate-900/90 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/15 flex flex-col justify-between text-slate-200">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs uppercase tracking-wider text-indigo-400 font-bold">
                        Spatial Dining
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 font-bold border border-indigo-500/40">
                        ACTIVE
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-4">The AR Menu</h3>
                    <ul className="space-y-3.5 text-slate-300 text-sm">
                      <li className="flex items-start gap-2.5">
                        <span className="text-cyan-400 font-bold">✓</span>
                        <span>True 1:1 scale food model anchored directly onto the real tabletop.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-cyan-400 font-bold">✓</span>
                        <span>Guests walk 360° around the dish to verify ingredients and plating.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-cyan-400 font-bold">✓</span>
                        <span>One-tap table ordering pushed directly into the kitchen console.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="text-cyan-400 font-bold">✓</span>
                        <span>Instant zero-cost menu updates and 3D asset uploads anytime.</span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-8 pt-4 border-t border-white/[0.08] text-xs font-mono text-indigo-300 font-bold">
                    Interactive • 6DoF Anchored • Frictionless
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ====================================================================
            8. FINAL CTA — IMMERSIVE MODERN SAAS CLOSING
           ==================================================================== */}
        <section className="py-24 sm:py-32 bg-gradient-to-b from-[#0B1120] via-[#0D152A] to-[#070B14] text-white relative overflow-hidden border-t border-indigo-500/20">
          {/* Subtle Ambient Spatial Glow */}
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.22)_0%,transparent_65%)]"
            aria-hidden="true"
          />

          <ScrollReveal direction="up" className="max-w-4xl mx-auto px-5 sm:px-8 text-center relative z-10">
            <span className="font-mono text-xs text-indigo-400 uppercase tracking-[0.25em] block mb-3 font-semibold">
              BEGIN YOUR RESTAURANT ELEVATION
            </span>

            <h2 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-white mb-6">
              Make your menu{" "}
              <span className="italic font-normal bg-gradient-to-r from-indigo-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                worth exploring.
              </span>
            </h2>

            <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              Turn every dining table into an interactive spatial experience. Deploy your restaurant
              portal in minutes with no hardware investment.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-9 py-4 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:brightness-110 text-white font-semibold text-base shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] border border-white/20 active:scale-95 transition-all text-center"
              >
                Get Started
              </Link>

              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-full border border-white/15 hover:border-indigo-400 text-white hover:bg-white/[0.08] font-medium text-base transition-all bg-white/[0.04] text-center"
              >
                Restaurant Login
              </Link>
            </div>

            <p className="text-xs font-mono text-slate-400 mt-8">
              Works natively on iOS Safari (ARKit) & Android Chrome (ARCore / Google Scene Viewer).
            </p>
          </ScrollReveal>
        </section>
      </main>

      {/* ====================================================================
          9. ARCHITECTURAL FOOTER
         ==================================================================== */}
      <footer className="bg-[#070B14] text-slate-400 py-16 border-t border-white/[0.08] text-sm">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-white/[0.08]">
            {/* Col 1: Brand Info */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white border border-indigo-400/30 flex items-center justify-center font-mono font-bold text-xs shadow-md shadow-indigo-500/25">
                  AR
                </div>
                <span className="font-bold text-white tracking-tight text-base">AR MENU</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Augmented Reality Based Smart Restaurant Menu. Bridging culinary artistry and
                spatial computing directly to the diner&apos;s table.
              </p>
            </div>

            {/* Col 2: Product */}
            <div>
              <h5 className="font-mono text-xs font-semibold text-white uppercase tracking-wider mb-4">
                Product
              </h5>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("experience")}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Table AR Experience
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("how-it-works")}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Continuous Flow
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("dishes")}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Curated Dishes
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: For Restaurants */}
            <div>
              <h5 className="font-mono text-xs font-semibold text-white uppercase tracking-wider mb-4">
                Restaurants
              </h5>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Restaurant Login
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-white transition-colors">
                    Create Account
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("for-restaurants")}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Management Console
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Technology */}
            <div>
              <h5 className="font-mono text-xs font-semibold text-white uppercase tracking-wider mb-4">
                Technology
              </h5>
              <ul className="space-y-2.5 text-xs text-slate-400">
                <li>Google Scene Viewer</li>
                <li>Apple ARKit Quick Look</li>
                <li>Native WebXR 6DoF</li>
                <li>Supabase PostgreSQL</li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Status */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <div>© 2026 AR MENU. All rights reserved.</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Spatial Engine & Menu Dispatch: Operational</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ====================================================================
          10. DISH DETAIL PREVIEW MODAL
         ==================================================================== */}
      {selectedDishForModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedDishForModal(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-slate-900/95 p-6 sm:p-8 shadow-2xl border border-white/[0.12] text-slate-100 overflow-hidden backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedDishForModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              ✕
            </button>

            {/* Modal Image */}
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden mb-6 bg-slate-950">
              <Image
                src={selectedDishForModal.image}
                alt={selectedDishForModal.name}
                width={1200}
                height={900}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-2xl font-bold text-white">
                {selectedDishForModal.name}
              </h3>
              <span className="font-mono font-bold text-2xl text-indigo-300">
                {selectedDishForModal.price}
              </span>
            </div>

            <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider block mb-4 font-semibold">
              {selectedDishForModal.category}
            </span>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              {selectedDishForModal.description}
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-white/[0.08] text-xs font-mono text-slate-300 mb-6 flex items-center justify-between">
              <span>Sommelier Recommendation:</span>
              <span className="font-semibold text-indigo-300">{selectedDishForModal.pairing}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedDishForModal(null);
                  scrollToSection("experience");
                }}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:brightness-110 text-white font-semibold text-sm transition-all text-center border border-white/20 shadow-lg shadow-indigo-500/25 cursor-pointer"
              >
                Experience in Table AR
              </button>
              <button
                type="button"
                onClick={() => setSelectedDishForModal(null)}
                className="py-3.5 px-6 rounded-xl border border-white/10 hover:bg-white/[0.06] font-medium text-sm text-slate-300 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          11. INTERACTIVE AR DEMO VIEWER (REUSING components/ar/ARViewer.tsx)
         ==================================================================== */}
      {arViewerDish && (
        <ARViewer
          modelUrl={arViewerDish.modelUrl}
          itemName={arViewerDish.name}
          poster={arViewerDish.image}
          onClose={() => setArViewerDish(null)}
        />
      )}
    </div>
  );
}