"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ARViewer from "@/components/ar/ARViewer";

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

const AR_DEMO_DISHES: ARDemoDish[] = [
  {
    id: "paneer-tikka",
    name: "Tandoori Paneer Tikka",
    subtitle: "Clay Oven Charred Cottage Cheese",
    category: "Signature Clay Oven",
    description:
      "Tender cubes of cottage cheese marinated in hung curd, Kashmiri chilli, and roasted cumin, charred with bell peppers in a clay oven. Experience the aroma and texture directly on your table in 1:1 scale.",
    price: "₹250",
    isVeg: true,
    image: "/images/paneer-tikka.jpg",
    modelUrl:
      "https://xwyofduioqxruycjpaih.supabase.co/storage/v1/object/public/menu-3d-models/restaurant/923d62b5-7d99-495f-9d9a-c4bbc1602cd0/models/f4858bb8-ebf3-4017-bff3-510bce582316.glb",
    badge: "AR READY",
    scaleMetric: "1:1 Physical Scale",
    arReady: true,
  },
  {
    id: "signature-burger",
    name: "Signature Gourmet Burger",
    subtitle: "Dry-Aged Brioche Gourmet Stack",
    category: "Artisanal Mains",
    description:
      "A crafted gourmet patty layered with melted aged cheddar, caramelized shallot glaze, crisp micro greens, and toasted golden brioche. Test 360° walkaround inspection in your physical dining space.",
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

  // Interactive AR Demo Section state (Static Showcase Data)
  const [activeDemoDishId, setActiveDemoDishId] = useState<string>("paneer-tikka");
  const [arViewerDish, setArViewerDish] = useState<ARDemoDish | null>(null);

  const activeDemoDish =
    AR_DEMO_DISHES.find((dish) => dish.id === activeDemoDishId) ?? AR_DEMO_DISHES[0];
  const secondaryDemoDish =
    AR_DEMO_DISHES.find((dish) => dish.id !== activeDemoDishId) ?? AR_DEMO_DISHES[1];

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
    <div className="min-h-screen bg-[#FAF8F2] text-[#17211F] font-sans antialiased selection:bg-[#C6A15B]/20 selection:text-[#092C29] relative overflow-x-hidden">
      {/* ====================================================================
          LIVING BACKGROUND SYSTEM: GLOBAL AMBIENT LAYERS
         ==================================================================== */}

      {/* LAYER 1: AMBIENT LIGHT FIELDS (Emerald + Champagne + Muted Teal) */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden -z-20"
        aria-hidden="true"
      >
        {/* Soft Deep Emerald Glow Field */}
        <div className="absolute -top-32 right-1/4 w-[680px] h-[680px] rounded-full bg-[radial-gradient(circle_at_center,rgba(18,63,56,0.18)_0%,rgba(9,44,41,0.06)_45%,transparent_70%)] blur-3xl animate-ambient-glow-1" />

        {/* Soft Champagne Gold Warm Field */}
        <div className="absolute top-1/3 -left-32 w-[620px] h-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(198,161,91,0.14)_0%,rgba(198,161,91,0.03)_50%,transparent_70%)] blur-3xl animate-ambient-glow-2" />

        {/* Soft Muted Teal Atmospheric Field */}
        <div className="absolute top-2/3 right-10 w-[540px] h-[540px] rounded-full bg-[radial-gradient(circle_at_center,rgba(93,139,130,0.12)_0%,rgba(93,139,130,0.02)_45%,transparent_70%)] blur-3xl animate-ambient-glow-3" />
      </div>

      {/* LAYER 2: SPATIAL CONTOUR TOPOGRAPHY LINES */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.07] overflow-hidden -z-10 animate-contour-drift"
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
            stroke="#C6A15B"
            strokeWidth="1.2"
            strokeDasharray="6 6"
          />
          <path
            d="M-120 420C280 370 520 540 860 460C1200 380 1380 580 1620 520"
            stroke="#5D8B82"
            strokeWidth="1"
          />
          <path
            d="M-80 620C320 580 580 720 920 640C1260 560 1420 740 1650 680"
            stroke="#C6A15B"
            strokeWidth="1"
            strokeDasharray="4 8"
          />
          <path
            d="M-50 780C350 740 640 860 980 800C1320 740 1460 890 1700 840"
            stroke="#123F38"
            strokeWidth="1.2"
          />
        </svg>
      </div>

      {/* LAYER 4: FLOATING AMBIENT LIGHT MOTES */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden -z-10"
        aria-hidden="true"
      >
        <div className="absolute top-[18%] left-[22%] w-2 h-2 rounded-full bg-[#C6A15B] blur-[0.5px] animate-mote-1" />
        <div className="absolute top-[34%] right-[28%] w-1.5 h-1.5 rounded-full bg-[#5D8B82] blur-[0.5px] animate-mote-2" />
        <div className="absolute top-[52%] left-[15%] w-2.5 h-2.5 rounded-full bg-[#C6A15B] blur-[1px] animate-mote-3" />
        <div className="absolute top-[68%] right-[18%] w-1.5 h-1.5 rounded-full bg-[#123F38] blur-[0.5px] animate-mote-1" />
        <div className="absolute top-[82%] left-[35%] w-2 h-2 rounded-full bg-[#C6A15B] blur-[0.5px] animate-mote-2" />
      </div>

      {/* ====================================================================
          1. NAVIGATION BAR
         ==================================================================== */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FAF8F2]/90 border-b border-[#D9D4C8]/60 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between">
          {/* Brand Mark */}
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#092C29] text-[#C6A15B] border border-[#C6A15B]/30 flex items-center justify-center font-mono font-bold text-xs tracking-widest shadow-sm group-hover:border-[#C6A15B] transition-colors duration-300">
              AR
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-lg leading-tight text-[#092C29]">
                AR MENU
              </span>
              <span className="font-mono text-[10px] tracking-[0.25em] text-[#5D8B82] uppercase">
                Spatial Luxury Dining
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#17211F]/80">
            <button
              type="button"
              onClick={() => scrollToSection("experience")}
              className="hover:text-[#092C29] hover:underline underline-offset-8 decoration-[#C6A15B] transition-all"
            >
              Experience
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("how-it-works")}
              className="hover:text-[#092C29] hover:underline underline-offset-8 decoration-[#C6A15B] transition-all"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("dishes")}
              className="hover:text-[#092C29] hover:underline underline-offset-8 decoration-[#C6A15B] transition-all"
            >
              Curated Dishes
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("for-restaurants")}
              className="hover:text-[#092C29] hover:underline underline-offset-8 decoration-[#C6A15B] transition-all"
            >
              For Restaurants
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-[#092C29] hover:text-[#123F38] px-4 py-2 rounded-full hover:bg-[#F5F2EA] transition-all"
            >
              Restaurant Login
            </Link>
            <Link
              href="/signup"
              className="text-sm font-semibold text-[#092C29] bg-[#C6A15B] hover:bg-[#b8924b] px-5 py-2.5 rounded-full shadow-sm hover:shadow transition-all border border-[#C6A15B]"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-[#D9D4C8] bg-white/70 text-[#092C29]"
          >
            <span
              className={`w-5 h-[1.8px] bg-[#092C29] transition-transform duration-300 ${
                mobileMenuOpen ? "rotate-45 translate-y-[5px]" : ""
              }`}
            />
            <span
              className={`w-5 h-[1.8px] bg-[#092C29] transition-opacity duration-300 ${
                mobileMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`w-5 h-[1.8px] bg-[#092C29] transition-transform duration-300 ${
                mobileMenuOpen ? "-rotate-45 -translate-y-[5px]" : ""
              }`}
            />
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#D9D4C8] bg-[#FAF8F2] px-6 py-6 flex flex-col gap-4 shadow-xl animate-fadeIn">
            <button
              type="button"
              onClick={() => scrollToSection("experience")}
              className="text-left font-medium text-[#092C29] py-2 border-b border-[#D9D4C8]/50"
            >
              Experience
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("how-it-works")}
              className="text-left font-medium text-[#092C29] py-2 border-b border-[#D9D4C8]/50"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("dishes")}
              className="text-left font-medium text-[#092C29] py-2 border-b border-[#D9D4C8]/50"
            >
              Curated Dishes
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("for-restaurants")}
              className="text-left font-medium text-[#092C29] py-2 border-b border-[#D9D4C8]/50"
            >
              For Restaurants
            </button>
            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/login"
                className="w-full text-center py-3 rounded-xl border border-[#D9D4C8] font-medium text-[#092C29] bg-white"
              >
                Restaurant Login
              </Link>
              <Link
                href="/signup"
                className="w-full text-center py-3 rounded-xl bg-[#C6A15B] text-[#092C29] font-semibold"
              >
                Get Started
              </Link>
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
            {/* Desktop Left-to-Right localized gradient: soft cinematic light falloff protecting dark headline typography, leaving center & right food scene 100% transparent */}
            <div
              className="hidden lg:block absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-[#FAF8F2]/88 via-[#FAF8F2]/35 via-[52%] to-transparent z-10 pointer-events-none"
              aria-hidden="true"
            />

            {/* Mobile / Tablet localized vertical gradient protecting headline when stacked */}
            <div
              className="lg:hidden absolute inset-0 bg-gradient-to-b from-[#FAF8F2]/88 via-[#FAF8F2]/45 to-transparent z-10 pointer-events-none"
              aria-hidden="true"
            />

            {/* Soft top blend so navbar sits smoothly over the background */}
            <div
              className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-[#FAF8F2]/75 to-transparent z-10 pointer-events-none"
              aria-hidden="true"
            />

            {/* Soft bottom blend to transition smoothly into the next section */}
            <div
              className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-[#FAF8F2] to-transparent z-10 pointer-events-none"
              aria-hidden="true"
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Column: Editorial Storytelling */}
              <div className="lg:col-span-7 flex flex-col items-start pr-0 lg:pr-6">
                {/* Eyebrow */}
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-[#123F38]/10 border border-[#123F38]/20 text-[#092C29] font-mono text-xs uppercase tracking-[0.2em] mb-6 backdrop-blur-sm bg-white/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B] animate-pulse" />
                  <span>SPATIAL DINING TECHNOLOGY</span>
                </div>

                {/* Primary Headline */}
                <h1 className="text-4xl sm:text-6xl lg:text-[4.25rem] font-bold tracking-tight leading-[1.08] mb-6">
                  <span className="text-[#321F1A]">Your Menu.</span> <br />
                  <span className="text-[#5A2928]">Now in the Real World.</span>
                </h1>

                {/* Supporting Description */}
                <p className="text-lg sm:text-xl text-[#17211F]/75 max-w-xl leading-relaxed mb-8">
                  Turn a simple table QR code into an interactive dining experience where guests
                  explore signature dishes, visualize them directly on the table in true-to-scale AR,
                  and place their orders with zero friction.
                </p>

                {/* CTA Row */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto mb-8">
                  <button
                    type="button"
                    onClick={() => scrollToSection("experience")}
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-[#092C29] text-[#FAF8F2] hover:bg-[#123F38] font-semibold text-base transition-all duration-300 shadow-sm hover:shadow-md border border-[#C6A15B]/30"
                  >
                    <span>Experience Table AR</span>
                    <svg
                      className="w-4 h-4 text-[#C6A15B]"
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
                    href="/signup"
                    className="inline-flex items-center justify-center px-7 py-4 rounded-full border border-[#D9D4C8] hover:border-[#092C29] text-[#092C29] hover:bg-white font-medium text-base transition-all bg-white/60 backdrop-blur-sm"
                  >
                    For Restaurants
                  </Link>
                </div>

                {/* Spatial Standards Metadata */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#D9D4C8]/80 w-full max-w-lg">
                  <div>
                    <span className="block font-mono text-[11px] text-[#5D8B82] uppercase tracking-wider">
                      Setup
                    </span>
                    <span className="font-semibold text-sm text-[#092C29] mt-0.5 block">
                      Zero App Install
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-[11px] text-[#5D8B82] uppercase tracking-wider">
                      Tracking
                    </span>
                    <span className="font-semibold text-sm text-[#092C29] mt-0.5 block">
                      6DoF World Anchor
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-[11px] text-[#5D8B82] uppercase tracking-wider">
                      Scale
                    </span>
                    <span className="font-semibold text-sm text-[#092C29] mt-0.5 block">
                      1:1 True Dining Size
                    </span>
                  </div>
                </div>

                {/* LIVE CINEMATIC SCENE PROGRESSION PILL */}
                <div className="flex items-center gap-3 pt-6 w-full max-w-lg">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#5D8B82]">
                    SCENE SEQUENCE
                  </span>
                  <div className="flex items-center gap-1.5">
                    {HERO_SCENES.map((scene, idx) => (
                      <button
                        key={scene.id}
                        type="button"
                        onClick={() => setActiveSceneIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          activeSceneIndex === idx
                            ? "w-7 bg-[#C6A15B]"
                            : "w-2 bg-[#D9D4C8] hover:bg-[#5D8B82]"
                        }`}
                        aria-label={`Jump to scene: ${scene.title}`}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-[#092C29]">
                    {HERO_SCENES[activeSceneIndex].stageNum} {HERO_SCENES[activeSceneIndex].actionLabel}
                  </span>
                </div>
              </div>

              {/* Right Column: Hero Visual Centerpiece with Layer 3 Spatial Scan Arc */}
              <div className="lg:col-span-5 flex justify-center relative z-20">
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
                      stroke="#C6A15B"
                      strokeWidth="1.2"
                      strokeDasharray="40 240 60 140"
                    />
                    <circle cx="250" cy="20" r="3" fill="#C6A15B" />
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
                      stroke="#5D8B82"
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
                  className="relative w-full max-w-md rounded-3xl bg-[#092C29] shadow-2xl overflow-hidden border border-[#C6A15B]/30 group cursor-default"
                >
                  {/* Dish Presentation on Oak Table */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#061F1D]">
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
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#092C29]/95 via-transparent to-[#092C29]/35"
                      aria-hidden="true"
                    />

                    {/* Apple-Style Spatial AR Reticle & Coordinates */}
                    {showSpatialOverlay && (
                      <div className="pointer-events-none absolute inset-0 p-5 flex flex-col justify-between">
                        {/* Top Badges */}
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#092C29]/85 backdrop-blur-md border border-[#C6A15B]/40 text-[10px] font-mono tracking-widest text-[#C6A15B]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B] animate-ping" />
                            <span>SURFACE DETECTED</span>
                          </div>

                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#092C29]/85 backdrop-blur-md border border-[#5D8B82]/40 text-[10px] font-mono tracking-wider text-[#D9D4C8]">
                            <span>TRUE SCALE 1:1</span>
                          </div>
                        </div>

                        {/* Center Tracking Reticle */}
                        <div className="self-center flex flex-col items-center">
                          <div className="relative w-16 h-16 rounded-full border border-[#C6A15B]/50 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-[#C6A15B]/90" />
                            {/* Reticle Crosshairs */}
                            <div className="absolute top-0 w-[1px] h-2 bg-[#C6A15B]/70" />
                            <div className="absolute bottom-0 w-[1px] h-2 bg-[#C6A15B]/70" />
                            <div className="absolute left-0 w-2 h-[1px] bg-[#C6A15B]/70" />
                            <div className="absolute right-0 w-2 h-[1px] bg-[#C6A15B]/70" />
                          </div>
                          <span className="mt-1 text-[9px] font-mono tracking-[0.25em] text-[#D9D4C8]/80 uppercase">
                            TABLE 04 • 6DoF ANCHOR
                          </span>
                        </div>

                        {/* Bottom Metadata */}
                        <div className="flex items-end justify-between text-[10px] font-mono text-[#D9D4C8]">
                          <div>
                            <span className="text-[#5D8B82] block">COORDINATES</span>
                            <span>X: 0.00m • Y: -0.42m</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#5D8B82] block">MODEL STATE</span>
                            <span className="text-[#C6A15B] font-semibold">AR READY</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Panel */}
                  <div className="p-6 bg-[#092C29] text-[#FAF8F2] flex items-center justify-between border-t border-[#C6A15B]/20">
                    <div>
                      <span className="font-mono text-xs text-[#C6A15B] uppercase tracking-wider">
                        Signature Main • ₹549
                      </span>
                      <h2 className="font-semibold text-lg text-white">
                        Truffle Wagyu Burger
                      </h2>
                      <p className="text-xs text-[#D9D4C8]/80 mt-0.5">
                        Double patty • Farmhouse aged cheddar
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSpatialOverlay(!showSpatialOverlay)}
                      className="px-3 py-1.5 rounded-lg border border-[#C6A15B]/40 bg-[#123F38]/60 text-[11px] font-mono text-[#C6A15B] hover:bg-[#123F38] hover:border-[#C6A15B] transition-colors"
                    >
                      {showSpatialOverlay ? "Hide Reticle" : "Show Reticle"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            3. SIGNATURE PRODUCT MOMENT — CONTINUOUS VISUAL JOURNEY
           ==================================================================== */}
        <section
          id="how-it-works"
          className="py-20 md:py-28 bg-[#F5F2EA] border-y border-[#D9D4C8]/70 relative overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            {/* Section Header */}
            <div className="max-w-2xl mx-auto text-center mb-16">
              <span className="font-mono text-xs text-[#C6A15B] uppercase tracking-[0.25em] block mb-2">
                THE TRANSFORMATION JOURNEY
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#092C29]">
                From physical table to interactive dining.
              </h2>
              <p className="text-[#17211F]/70 mt-3 text-base sm:text-lg">
                Four seamless steps engineered for guest delight and zero operational friction.
              </p>
            </div>

            {/* Continuous Journey Step Rail */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
              {JOURNEY_STEPS.map((item, idx) => {
                const isActive = activeStepIndex === idx;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveStepIndex(idx)}
                    className={`relative p-6 sm:p-7 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                      isActive
                        ? "bg-white shadow-xl border-2 border-[#C6A15B] -translate-y-1.5"
                        : "bg-white/70 hover:bg-white border border-[#D9D4C8] shadow-sm"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`font-mono text-2xl font-bold ${
                            isActive ? "text-[#C6A15B]" : "text-[#5D8B82]/60"
                          }`}
                        >
                          {item.step}
                        </span>
                        <span className="font-mono text-[10px] tracking-widest px-2 py-0.5 rounded bg-[#FAF8F2] text-[#092C29] border border-[#D9D4C8] uppercase">
                          {item.tag}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-[#092C29]">{item.title}</h3>
                      <h4 className="text-sm font-medium text-[#5D8B82] mb-3">{item.subtitle}</h4>

                      <p className="text-sm text-[#17211F]/75 leading-relaxed mb-6">
                        {item.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#D9D4C8]/50 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-[#5D8B82]">Benchmark</span>
                      <span className="text-xs font-mono font-semibold text-[#092C29]">
                        {item.metric}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ====================================================================
            4. AR SHOWCASE — DEEP EMERALD IMMERSIVE WALKAROUND EXPERIENCE
           ==================================================================== */}
        <section
          id="experience"
          className="py-24 sm:py-32 bg-[#092C29] text-[#FAF8F2] relative overflow-hidden"
        >
          {/* Subtle Ambient Radial Champagne Glow */}
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] bg-[radial-gradient(circle_at_center,rgba(198,161,91,0.14)_0%,rgba(18,63,56,0.25)_45%,transparent_75%)] -z-10"
            aria-hidden="true"
          />

          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              {/* Left Column: Device Mockup displaying real AR Table Anchoring */}
              <div className="lg:col-span-6 flex justify-center order-2 lg:order-1 relative">
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
                      stroke="#C6A15B"
                      strokeWidth="1.2"
                      strokeDasharray="16 32"
                    />
                  </svg>
                </div>

                <div className="relative w-full max-w-sm rounded-[2.5rem] bg-[#061F1D] p-3 shadow-2xl border border-[#C6A15B]/35">
                  {/* Smartphone Screen */}
                  <div className="relative aspect-[3/4] w-full rounded-[2rem] overflow-hidden bg-[#041513]">
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
                        <span className="text-[10px] font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-[#092C29]/90 text-[#C6A15B] border border-[#C6A15B]/40">
                          ● ANCHORED (6DoF)
                        </span>
                        <span className="text-[10px] font-mono tracking-wider px-2.5 py-0.5 rounded-full bg-[#092C29]/90 text-[#D9D4C8] border border-[#5D8B82]/40">
                          TABLE 04
                        </span>
                      </div>

                      <div className="self-center px-4 py-2 rounded-full bg-[#092C29]/90 backdrop-blur-md border border-[#C6A15B]/40 text-xs font-medium text-[#FAF8F2] shadow-lg text-center">
                        Walk 360° around table to inspect angles
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Exact AR Capabilities Communication */}
              <div className="lg:col-span-6 order-1 lg:order-2 flex flex-col items-start">
                <span className="font-mono text-xs text-[#C6A15B] uppercase tracking-[0.25em] block mb-3">
                  SPATIAL DINING EXPERIENCE
                </span>

                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight mb-6">
                  Don&apos;t just read the menu. <br />
                  <span className="text-[#C6A15B]">See it.</span>
                </h2>

                <p className="text-lg text-[#D9D4C8] leading-relaxed mb-8">
                  Unlike generic 3D viewers that float within a web browser window, AR MENU anchors
                  the dish physically to the dining surface using native hardware tracking.
                </p>

                {/* Core Feature Pillars */}
                <div className="space-y-5 w-full">
                  <div className="p-4 rounded-2xl bg-[#061F1D]/80 border border-[#C6A15B]/20 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[#C6A15B]/15 border border-[#C6A15B]/40 flex items-center justify-center text-[#C6A15B] font-mono text-xs font-bold mt-0.5 shrink-0">
                      01
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-base">Place it on your table</h4>
                      <p className="text-sm text-[#D9D4C8]/80 mt-1">
                        Detects the horizontal tabletop surface using Google Scene Viewer on Android
                        and Apple Quick Look on iOS.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#061F1D]/80 border border-[#C6A15B]/20 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[#C6A15B]/15 border border-[#C6A15B]/40 flex items-center justify-center text-[#C6A15B] font-mono text-xs font-bold mt-0.5 shrink-0">
                      02
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-base">Walk around it in 360°</h4>
                      <p className="text-sm text-[#D9D4C8]/80 mt-1">
                        The dish stays spatially locked to the wood or linen tabletop while you move
                        your phone around it. No phone-following drift.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#061F1D]/80 border border-[#C6A15B]/20 flex items-start gap-4">
                    <div className="w-8 h-8 rounded-lg bg-[#C6A15B]/15 border border-[#C6A15B]/40 flex items-center justify-center text-[#C6A15B] font-mono text-xs font-bold mt-0.5 shrink-0">
                      03
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-base">See true scale before ordering</h4>
                      <p className="text-sm text-[#D9D4C8]/80 mt-1">
                        Guests can examine plating artistry, garnish details, and actual portion
                        sizes with 1:1 physical accuracy.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => scrollToSection("ar-demo")}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#C6A15B] hover:bg-[#b8924b] text-[#092C29] font-bold text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer"
                    >
                      <span>Try Live AR Demo Below</span>
                      <span>↓</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            4B. INTERACTIVE AR DEMO SECTION — THE DISH, IN YOUR SPACE
           ==================================================================== */}
        <section
          id="ar-demo"
          className="py-24 sm:py-32 bg-[#FAF8F2] border-t border-[#D9D4C8]/80 relative overflow-hidden"
        >
          {/* Subtle Ambient Spatial Glow and Grid Matrix */}
          <div
            className="pointer-events-none absolute inset-0 -z-10"
            aria-hidden="true"
          >
            {/* Soft Warm Radial Glow */}
            <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(198,161,91,0.12)_0%,rgba(93,139,130,0.06)_45%,transparent_70%)] blur-2xl" />

            {/* Subtle Surface Coordinate Grid */}
            <svg
              className="absolute inset-0 w-full h-full opacity-[0.035]"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <pattern id="spatial-demo-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#092C29" strokeWidth="1" />
                  <circle cx="0" cy="0" r="1.5" fill="#C6A15B" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#spatial-demo-grid)" />
            </svg>
          </div>

          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              {/* Left Column: Editorial Typography & Spatial Controls */}
              <div className="lg:col-span-6 flex flex-col items-start pr-0 lg:pr-6">
                {/* Eyebrow Label */}
                <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#123F38]/10 border border-[#123F38]/20 text-[#092C29] font-mono text-xs uppercase tracking-[0.2em] mb-6 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-[#C6A15B] animate-pulse" />
                  <span className="font-semibold text-[#092C29]">INTERACTIVE AR DEMO</span>
                  <span className="text-[#5D8B82]">•</span>
                  <span className="text-[#5D8B82]">THE DISH, IN YOUR SPACE</span>
                </div>

                {/* Primary Heading */}
                <h2 className="text-3xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-[#092C29] leading-[1.1] mb-6">
                  Taste It Before <br />
                  <span className="text-[#C6A15B]">You Order.</span>
                </h2>

                {/* Supporting Text */}
                <p className="text-lg sm:text-xl text-[#17211F]/75 max-w-xl leading-relaxed mb-8">
                  Step into the future of dining. Place a dish in your own space with augmented
                  reality and explore it from every angle.
                </p>

                {/* Interactive Demo Dish Switcher */}
                <div className="w-full max-w-lg mb-8">
                  <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#5D8B82] mb-3 flex items-center justify-between">
                    <span>SELECT DEMO DISH</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      2 MODELS READY
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-white border border-[#D9D4C8] shadow-xs">
                    {AR_DEMO_DISHES.map((dish) => {
                      const isCurrent = activeDemoDish.id === dish.id;
                      return (
                        <button
                          key={dish.id}
                          type="button"
                          onClick={() => setActiveDemoDishId(dish.id)}
                          className={`py-3 px-3.5 rounded-xl text-left transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                            isCurrent
                              ? "bg-[#092C29] text-[#FAF8F2] shadow-sm"
                              : "text-[#092C29] hover:bg-[#F5F2EA]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span
                              className={`text-[10px] font-mono tracking-wider uppercase ${
                                isCurrent ? "text-[#C6A15B]" : "text-[#5D8B82]"
                              }`}
                            >
                              {dish.category}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                dish.isVeg ? "bg-emerald-500" : "bg-red-500"
                              }`}
                            />
                          </div>
                          <span className="font-semibold text-sm truncate">
                            {dish.name}
                          </span>
                          <span
                            className={`font-mono text-xs font-bold mt-1 ${
                              isCurrent ? "text-[#C6A15B]" : "text-[#092C29]"
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
                    onClick={() => setArViewerDish(activeDemoDish)}
                    className="inline-flex items-center justify-center gap-3.5 px-8 py-4.5 rounded-full bg-[#092C29] hover:bg-[#123F38] text-[#FAF8F2] font-semibold text-base transition-all duration-300 shadow-md hover:shadow-xl border border-[#C6A15B]/40 group cursor-pointer"
                  >
                    {/* Spatial 3D Cube Icon */}
                    <svg
                      className="w-5 h-5 text-[#C6A15B] group-hover:scale-110 transition-transform"
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
                    <span>VIEW IN AR</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B] animate-ping" />
                  </button>
                </div>

                {/* Secondary Micro Text */}
                <div className="flex items-center gap-2 text-xs font-mono text-[#5D8B82] mb-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>No login required • Camera enabled • Instant table placement</span>
                </div>

                {/* Spatial Standards Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg pt-6 border-t border-[#D9D4C8]/80">
                  <div className="p-3 rounded-xl bg-white/80 border border-[#D9D4C8]/60">
                    <span className="block font-mono text-[10px] text-[#5D8B82] uppercase tracking-wider">
                      Tracking
                    </span>
                    <span className="font-semibold text-xs text-[#092C29] mt-0.5 block">
                      6DoF World Anchor
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/80 border border-[#D9D4C8]/60">
                    <span className="block font-mono text-[10px] text-[#5D8B82] uppercase tracking-wider">
                      Scale
                    </span>
                    <span className="font-semibold text-xs text-[#092C29] mt-0.5 block">
                      1:1 True-to-Plate
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-white/80 border border-[#D9D4C8]/60">
                    <span className="block font-mono text-[10px] text-[#5D8B82] uppercase tracking-wider">
                      Surface Status
                    </span>
                    <span className="font-semibold text-xs text-emerald-700 mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      SURFACE READY
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Spatial Frame Showcase (Asymmetric Composition) */}
              <div className="lg:col-span-6 relative flex flex-col items-center">
                {/* Outer Spatial Frame with Corner Crosshairs */}
                <div className="relative w-full max-w-lg">
                  {/* Coordinate Crosshairs */}
                  <div className="pointer-events-none absolute -top-3.5 -left-3.5 font-mono text-sm text-[#C6A15B] select-none z-20">
                    +
                  </div>
                  <div className="pointer-events-none absolute -top-3.5 -right-3.5 font-mono text-sm text-[#C6A15B] select-none z-20">
                    +
                  </div>
                  <div className="pointer-events-none absolute -bottom-3.5 -left-3.5 font-mono text-sm text-[#C6A15B] select-none z-20">
                    +
                  </div>
                  <div className="pointer-events-none absolute -bottom-3.5 -right-3.5 font-mono text-sm text-[#C6A15B] select-none z-20">
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
                        stroke="#C6A15B"
                        strokeWidth="1.2"
                        strokeDasharray="14 26"
                        opacity="0.4"
                      />
                      <circle
                        cx="250"
                        cy="250"
                        r="240"
                        stroke="#5D8B82"
                        strokeWidth="0.8"
                        strokeDasharray="6 32"
                        opacity="0.3"
                      />
                    </svg>
                  </div>

                  {/* Main Hero Dish Card */}
                  <div className="relative w-full rounded-3xl bg-white border border-[#D9D4C8] shadow-xl overflow-hidden group hover:shadow-2xl hover:border-[#C6A15B] transition-all duration-500">
                    {/* Dish Photography with 4:3 Aspect Ratio */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F5F2EA]">
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
                          <span className="px-3 py-1 rounded-full bg-[#092C29]/85 backdrop-blur-md text-[10px] font-mono tracking-widest text-[#FAF8F2] uppercase border border-[#C6A15B]/30">
                            {activeDemoDish.category}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-950/75 backdrop-blur-md text-[10px] font-mono tracking-wider text-emerald-300 uppercase border border-emerald-500/30 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            SURFACE READY
                          </span>
                        </div>

                        <div
                          className="w-6 h-6 rounded-md border border-[#D9D4C8] bg-white flex items-center justify-center p-0.5 shadow-sm"
                          title={activeDemoDish.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                        >
                          <span
                            className={`w-3 h-3 rounded-full ${
                              activeDemoDish.isVeg ? "bg-[#16a34a]" : "bg-[#dc2626]"
                            }`}
                          />
                        </div>
                      </div>

                      {/* Subtle Spatial Coordinate Telemetry */}
                      <div className="absolute bottom-3 left-4 font-mono text-[10px] text-white/95 bg-black/45 backdrop-blur-sm px-2.5 py-1 rounded-md tracking-wider">
                        6DoF • [X: 0.00, Y: -0.42, Z: +0.65]
                      </div>

                      {/* Quick "VIEW IN AR" action over image */}
                      <div className="absolute bottom-3 right-4">
                        <button
                          type="button"
                          onClick={() => setArViewerDish(activeDemoDish)}
                          className="px-4 py-2 rounded-full bg-[#C6A15B] hover:bg-[#b8924b] text-[#092C29] font-bold text-xs shadow-lg hover:shadow-xl transition-all flex items-center gap-1.5 cursor-pointer border border-[#C6A15B]"
                        >
                          <span>VIEW IN AR</span>
                          <svg
                            className="w-3.5 h-3.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Dish Content Details */}
                    <div className="p-6 sm:p-7">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <h3 className="font-bold text-2xl text-[#092C29]">
                          {activeDemoDish.name}
                        </h3>
                        <span className="font-mono font-bold text-2xl text-[#092C29]">
                          {activeDemoDish.price}
                        </span>
                      </div>

                      <p className="text-xs font-mono text-[#5D8B82] uppercase tracking-wider mb-3">
                        {activeDemoDish.subtitle}
                      </p>

                      <p className="text-sm text-[#17211F]/75 leading-relaxed mb-5">
                        {activeDemoDish.description}
                      </p>

                      <div className="pt-4 border-t border-[#D9D4C8]/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#FAF8F2] text-[#092C29] border border-[#D9D4C8]">
                            3D MODEL READY
                          </span>
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#C6A15B]/15 text-[#092C29] border border-[#C6A15B]/30">
                            {activeDemoDish.scaleMetric}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setArViewerDish(activeDemoDish)}
                          className="text-xs font-semibold text-[#092C29] hover:text-[#C6A15B] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Launch Table AR</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Second Smaller Demo Dish (Asymmetric Overlapping Card) */}
                  <div
                    onClick={() => setActiveDemoDishId(secondaryDemoDish.id)}
                    className="mt-6 sm:-mt-8 sm:-mr-6 sm:self-end w-full sm:max-w-md rounded-2xl bg-white/95 backdrop-blur-md p-4 sm:p-4.5 border border-[#C6A15B]/50 shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-4 cursor-pointer group hover:border-[#092C29] relative z-10"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-18 h-18 rounded-xl overflow-hidden bg-[#F5F2EA] shrink-0 border border-[#D9D4C8]">
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
                            secondaryDemoDish.isVeg ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-[10px] font-mono tracking-wider text-[#5D8B82] uppercase">
                          ALSO IN AR • DEMO 2
                        </span>
                        <span className="font-mono font-bold text-sm text-[#092C29]">
                          {secondaryDemoDish.price}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm sm:text-base text-[#092C29] truncate group-hover:text-[#C6A15B] transition-colors">
                        {secondaryDemoDish.name}
                      </h4>
                      <p className="text-xs text-[#17211F]/70 truncate mt-0.5">
                        {secondaryDemoDish.subtitle}
                      </p>
                    </div>

                    {/* Direct AR Action */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setArViewerDish(secondaryDemoDish);
                      }}
                      aria-label={`View ${secondaryDemoDish.name} in AR`}
                      className="px-3.5 py-2.5 rounded-xl bg-[#092C29] hover:bg-[#123F38] text-[#FAF8F2] text-xs font-semibold shrink-0 transition-all flex items-center gap-1 shadow-sm group-hover:scale-105 cursor-pointer"
                    >
                      <span>AR</span>
                      <svg
                        className="w-3 h-3 text-[#C6A15B]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            5. CURATED DISHES — EDITORIAL RESTAURANT MENU (IN RUPEES)
           ==================================================================== */}
        <section id="dishes" className="py-20 md:py-32 bg-[#FAF8F2]">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <span className="font-mono text-xs text-[#C6A15B] uppercase tracking-[0.25em] block mb-2">
                  CURATED COLLECTION
                </span>
                <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#092C29]">
                  Crafted for the senses.
                </h2>
              </div>
              <p className="text-[#17211F]/70 max-w-md text-base">
                Explore signature culinary creations presented in high-fidelity photography,
                volumetric 3D, and augmented reality.
              </p>
            </div>

            {/* Menu Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {CURATED_DISHES.map((dish) => (
                <article
                  key={dish.id}
                  className="rounded-3xl bg-white border border-[#D9D4C8] shadow-sm overflow-hidden flex flex-col group hover:-translate-y-1 hover:shadow-xl hover:border-[#C6A15B] transition-all duration-300"
                >
                  {/* Dish Image */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F5F2EA]">
                    <Image
                      src={dish.image}
                      alt={dish.name}
                      width={1200}
                      height={900}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Top Tags */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-[#092C29]/85 backdrop-blur-md text-[10px] font-mono tracking-widest text-[#FAF8F2] uppercase border border-[#C6A15B]/30">
                        {dish.category}
                      </span>

                      {/* Veg / Non-Veg Indicator */}
                      <div
                        className="w-5 h-5 rounded border border-[#D9D4C8] bg-white flex items-center justify-center p-0.5"
                        title={dish.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            dish.isVeg ? "bg-[#16a34a]" : "bg-[#dc2626]"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Champagne Hairline Highlight on Hover */}
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C6A15B] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  {/* Dish Content */}
                  <div className="p-7 flex flex-col flex-grow justify-between">
                    <div>
                      <div className="flex items-baseline justify-between mb-2">
                        <h3 className="font-bold text-xl text-[#092C29]">{dish.name}</h3>
                        <span className="font-mono font-bold text-xl text-[#092C29]">
                          {dish.price}
                        </span>
                      </div>

                      <p className="text-sm text-[#17211F]/75 leading-relaxed mb-4">
                        {dish.description}
                      </p>

                      <div className="text-xs font-mono text-[#5D8B82] italic mb-6">
                        {dish.pairing}
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-4 border-t border-[#D9D4C8]/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#FAF8F2] text-[#092C29] border border-[#D9D4C8]">
                          3D READY
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#C6A15B]/15 text-[#092C29] border border-[#C6A15B]/30">
                          AR READY
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedDishForModal(dish)}
                        className="text-xs font-semibold text-[#092C29] hover:text-[#C6A15B] inline-flex items-center gap-1 transition-colors"
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
              ))}
            </div>
          </div>
        </section>

        {/* ====================================================================
            6. RESTAURANT OWNER SECTION — DEEP EMERALD CONSOLE PREVIEW
           ==================================================================== */}
        <section
          id="for-restaurants"
          className="py-20 md:py-32 bg-[#F5F2EA] border-y border-[#D9D4C8]/70"
        >
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="font-mono text-xs text-[#C6A15B] uppercase tracking-[0.25em] block mb-2">
                RESTAURANT MANAGEMENT CONSOLE
              </span>
              <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#092C29]">
                One platform. <br />
                Your entire digital menu.
              </h2>
              <p className="text-[#17211F]/70 mt-4 text-base sm:text-lg">
                Empower your culinary and floor team with real-time menu synchronization, 3D model
                uploads, table QR generation, and live kitchen order routing.
              </p>
            </div>

            {/* Deep Emerald Console Mockup Container */}
            <div className="rounded-3xl bg-[#092C29] border border-[#C6A15B]/40 shadow-2xl overflow-hidden max-w-5xl mx-auto">
              {/* Console Window Header Bar */}
              <div className="bg-[#061F1D] px-6 py-4 flex items-center justify-between text-[#FAF8F2] border-b border-[#C6A15B]/20">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-xs font-mono text-[#D9D4C8] ml-2">
                    AR MENU • Management Portal [Preview]
                  </span>
                </div>

                {/* Animated Pulsing Status Badges */}
                <div className="hidden sm:flex items-center gap-4 text-[11px] font-mono">
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    MENU SYNCED
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[#C6A15B]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C6A15B] animate-pulse" />
                    3D MODEL READY
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-sky-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                    ORDERS LIVE
                  </span>
                </div>
              </div>

              {/* Console Tabs */}
              <div className="flex border-b border-[#C6A15B]/20 bg-[#072421] px-6 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveDashboardTab("menu")}
                  className={`py-3.5 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                    activeDashboardTab === "menu"
                      ? "border-[#C6A15B] text-[#C6A15B]"
                      : "border-transparent text-[#D9D4C8]/70 hover:text-white"
                  }`}
                >
                  Digital Menu & 3D Models
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDashboardTab("tables")}
                  className={`py-3.5 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                    activeDashboardTab === "tables"
                      ? "border-[#C6A15B] text-[#C6A15B]"
                      : "border-transparent text-[#D9D4C8]/70 hover:text-white"
                  }`}
                >
                  Tables & QR Provisioning
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDashboardTab("orders")}
                  className={`py-3.5 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                    activeDashboardTab === "orders"
                      ? "border-[#C6A15B] text-[#C6A15B]"
                      : "border-transparent text-[#D9D4C8]/70 hover:text-white"
                  }`}
                >
                  Live Kitchen Orders
                </button>
              </div>

              {/* Console Inner Pearl Workspace */}
              <div className="bg-[#FAF8F2] text-[#17211F]">
                {/* Tab 1: Menu Management Preview */}
                {activeDashboardTab === "menu" && (
                  <div className="p-6 sm:p-8 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono text-[#5D8B82] uppercase">
                        Configured Menu Items (3 Active)
                      </span>
                      <span className="text-xs font-mono text-[#092C29] font-semibold bg-[#C6A15B]/20 px-2.5 py-1 rounded-full border border-[#C6A15B]/40">
                        + Add 3D Dish (.glb up to 50MB)
                      </span>
                    </div>

                    <div className="divide-y divide-[#D9D4C8] border border-[#D9D4C8] rounded-xl overflow-hidden bg-white">
                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#FAF8F2] overflow-hidden relative border border-[#D9D4C8]">
                            <Image
                              src="/images/hero-dish.jpg"
                              alt="Burger"
                              width={80}
                              height={80}
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-[#092C29]">
                              Truffle Wagyu Smash Burger
                            </h4>
                            <span className="text-xs text-[#5D8B82]">₹549 • Signature Mains</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-mono font-medium border border-emerald-200">
                            3D Model (.glb) Attached
                          </span>
                          <span className="text-xs text-[#5D8B82]">Published</span>
                        </div>
                      </div>

                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#FAF8F2] overflow-hidden relative border border-[#D9D4C8]">
                            <Image
                              src="/images/artisan-pizza.jpg"
                              alt="Pizza"
                              width={80}
                              height={80}
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-[#092C29]">
                              Artisanal Burrata Margherita
                            </h4>
                            <span className="text-xs text-[#5D8B82]">
                              ₹449 • Wood-Fired Hearth (Veg)
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-mono font-medium border border-emerald-200">
                            3D Model (.glb) Attached
                          </span>
                          <span className="text-xs text-[#5D8B82]">Published</span>
                        </div>
                      </div>

                      <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#FAF8F2] overflow-hidden relative border border-[#D9D4C8]">
                            <Image
                              src="/images/seared-salmon.jpg"
                              alt="Salmon"
                              width={80}
                              height={80}
                              className="object-cover"
                            />
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm text-[#092C29]">
                              Pan-Seared King Salmon
                            </h4>
                            <span className="text-xs text-[#5D8B82]">
                              ₹699 • Seafood Specialties
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-mono font-medium border border-emerald-200">
                            3D Model (.glb) Attached
                          </span>
                          <span className="text-xs text-[#5D8B82]">Published</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Tables & QR Preview */}
                {activeDashboardTab === "tables" && (
                  <div className="p-6 sm:p-8 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-5 rounded-2xl border border-[#D9D4C8] bg-white text-center">
                        <span className="font-mono text-xs text-[#5D8B82] uppercase">Dining Room</span>
                        <h4 className="font-bold text-xl text-[#092C29] mt-1">Table 01</h4>
                        <div className="w-24 h-24 mx-auto my-3 bg-[#FAF8F2] border border-[#D9D4C8] rounded-xl flex items-center justify-center font-mono text-[10px] text-[#5D8B82]">
                          [ QR CODE ]
                        </div>
                        <span className="text-xs font-mono text-emerald-700 block">● Active</span>
                      </div>

                      <div className="p-5 rounded-2xl border border-[#D9D4C8] bg-white text-center">
                        <span className="font-mono text-xs text-[#5D8B82] uppercase">Dining Room</span>
                        <h4 className="font-bold text-xl text-[#092C29] mt-1">Table 02</h4>
                        <div className="w-24 h-24 mx-auto my-3 bg-[#FAF8F2] border border-[#D9D4C8] rounded-xl flex items-center justify-center font-mono text-[10px] text-[#5D8B82]">
                          [ QR CODE ]
                        </div>
                        <span className="text-xs font-mono text-emerald-700 block">● Active</span>
                      </div>

                      <div className="p-5 rounded-2xl border border-[#D9D4C8] bg-white text-center">
                        <span className="font-mono text-xs text-[#5D8B82] uppercase">Terrace</span>
                        <h4 className="font-bold text-xl text-[#092C29] mt-1">Table 03</h4>
                        <div className="w-24 h-24 mx-auto my-3 bg-[#FAF8F2] border border-[#D9D4C8] rounded-xl flex items-center justify-center font-mono text-[10px] text-[#5D8B82]">
                          [ QR CODE ]
                        </div>
                        <span className="text-xs font-mono text-emerald-700 block">● Active</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Live Orders Preview */}
                {activeDashboardTab === "orders" && (
                  <div className="p-6 sm:p-8 space-y-4">
                    <div className="border border-[#D9D4C8] rounded-xl overflow-hidden divide-y divide-[#D9D4C8] bg-white">
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#092C29]">Order #2891</span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#FAF8F2] text-[#092C29] border border-[#D9D4C8]">
                              Table 04
                            </span>
                          </div>
                          <p className="text-xs text-[#5D8B82] mt-1">
                            1x Truffle Wagyu Burger, 1x Artisanal Burrata Margherita
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Preparing
                          </span>
                          <span className="block text-xs font-mono text-[#092C29] font-bold mt-1">
                            ₹998
                          </span>
                        </div>
                      </div>

                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#092C29]">Order #2890</span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#FAF8F2] text-[#092C29] border border-[#D9D4C8]">
                              Table 02
                            </span>
                          </div>
                          <p className="text-xs text-[#5D8B82] mt-1">
                            2x Pan-Seared King Salmon, 2x Sparkling Mineral Water
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-medium">
                            Ready for Service
                          </span>
                          <span className="block text-xs font-mono text-[#092C29] font-bold mt-1">
                            ₹1,598
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Console Action Bar */}
                <div className="bg-[#F5F2EA] px-8 py-5 border-t border-[#D9D4C8] flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs text-[#5D8B82] font-mono">
                    Product Preview • Powered by PostgreSQL Realtime
                  </span>
                  <Link
                    href="/login"
                    className="font-semibold text-sm text-[#092C29] hover:text-[#C6A15B] inline-flex items-center gap-1.5"
                  >
                    <span>Launch Restaurant Console</span>
                    <svg
                      className="w-4 h-4 text-[#C6A15B]"
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
          </div>
        </section>

        {/* ====================================================================
            7. WHY AR MENU — PARADIGM SHIFT COMPARISON
           ==================================================================== */}
        <section className="py-20 md:py-28 bg-[#FAF8F2]">
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            <div className="text-center mb-16">
              <span className="font-mono text-xs text-[#C6A15B] uppercase tracking-[0.25em] block mb-2">
                THE PARADIGM SHIFT
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#092C29]">
                A fundamental upgrade to the dining ritual.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Old Experience */}
              <div className="p-8 rounded-3xl bg-[#F5F2EA] border border-[#D9D4C8] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs uppercase tracking-wider text-[#5D8B82] block mb-3">
                    Traditional Dining
                  </span>
                  <h3 className="text-2xl font-bold text-[#17211F] mb-4">The Paper Menu</h3>
                  <ul className="space-y-3.5 text-[#17211F]/70 text-sm">
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#5D8B82] mt-0.5 font-mono">—</span>
                      <span>Text-heavy descriptions that leave portion size to guesswork.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#5D8B82] mt-0.5 font-mono">—</span>
                      <span>No visual confirmation of presentation or garnishes.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#5D8B82] mt-0.5 font-mono">—</span>
                      <span>Ordering delays waiting for available floor staff.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#5D8B82] mt-0.5 font-mono">—</span>
                      <span>Expensive menu reprints whenever seasonal dishes change.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-[#D9D4C8] text-xs font-mono text-[#5D8B82]">
                  Static • High Friction • No Visual Context
                </div>
              </div>

              {/* The AR Menu Experience */}
              <div className="p-8 rounded-3xl bg-white border-2 border-[#C6A15B] shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs uppercase tracking-wider text-[#092C29] font-bold">
                      Spatial Dining
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#C6A15B]/20 text-[#092C29] font-bold border border-[#C6A15B]/40">
                      ACTIVE
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-[#092C29] mb-4">The AR Menu</h3>
                  <ul className="space-y-3.5 text-[#17211F]/80 text-sm">
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#C6A15B] font-bold">✓</span>
                      <span>True 1:1 scale food model anchored directly onto the real tabletop.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#C6A15B] font-bold">✓</span>
                      <span>Guests walk 360° around the dish to verify ingredients and plating.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#C6A15B] font-bold">✓</span>
                      <span>One-tap table ordering pushed directly into the kitchen console.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-[#C6A15B] font-bold">✓</span>
                      <span>Instant zero-cost menu updates and 3D asset uploads anytime.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-[#D9D4C8] text-xs font-mono text-[#092C29] font-bold">
                  Interactive • 6DoF Anchored • Frictionless
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            8. FINAL CTA — DEEP EMERALD IMMERSIVE CLOSING
           ==================================================================== */}
        <section className="py-24 sm:py-32 bg-[#092C29] text-white relative overflow-hidden border-t border-[#C6A15B]/30">
          {/* Subtle Ambient Spatial Glow */}
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] h-[620px] bg-[radial-gradient(circle_at_center,rgba(198,161,91,0.18)_0%,transparent_65%)]"
            aria-hidden="true"
          />

          <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center relative z-10">
            <span className="font-mono text-xs text-[#C6A15B] uppercase tracking-[0.25em] block mb-3">
              BEGIN YOUR RESTAURANT ELEVATION
            </span>

            <h2 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-6">
              Make your menu worth exploring.
            </h2>

            <p className="text-lg sm:text-xl text-[#D9D4C8] max-w-2xl mx-auto mb-10 leading-relaxed">
              Turn every dining table into an interactive spatial experience. Deploy your restaurant
              portal in minutes with no hardware investment.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-9 py-4 rounded-full bg-[#C6A15B] hover:bg-[#b8924b] text-[#092C29] font-semibold text-base shadow-lg transition-all border border-[#C6A15B]"
              >
                Get Started
              </Link>

              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 rounded-full border border-[#D9D4C8]/50 hover:border-[#FAF8F2] text-[#FAF8F2] hover:text-white font-medium text-base transition-all bg-[#061F1D]"
              >
                Restaurant Login
              </Link>
            </div>

            <p className="text-xs font-mono text-[#5D8B82] mt-8">
              Works natively on iOS Safari (ARKit) & Android Chrome (ARCore / Google Scene Viewer).
            </p>
          </div>
        </section>
      </main>

      {/* ====================================================================
          9. ARCHITECTURAL FOOTER
         ==================================================================== */}
      <footer className="bg-[#061F1D] text-[#D9D4C8]/80 py-16 border-t border-[#C6A15B]/20 text-sm">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-[#D9D4C8]/20">
            {/* Col 1: Brand Info */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#092C29] text-[#C6A15B] border border-[#C6A15B]/30 flex items-center justify-center font-mono font-bold text-xs">
                  AR
                </div>
                <span className="font-bold text-white tracking-tight text-base">AR MENU</span>
              </div>
              <p className="text-xs text-[#D9D4C8]/70 leading-relaxed max-w-sm">
                Augmented Reality Based Smart Restaurant Menu. Bridging culinary artistry and
                spatial computing directly to the diner&apos;s table.
              </p>
            </div>

            {/* Col 2: Product */}
            <div>
              <h5 className="font-mono text-xs font-semibold text-[#FAF8F2] uppercase tracking-wider mb-4">
                Product
              </h5>
              <ul className="space-y-2.5 text-xs text-[#D9D4C8]/70">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("experience")}
                    className="hover:text-white transition-colors"
                  >
                    Table AR Experience
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("how-it-works")}
                    className="hover:text-white transition-colors"
                  >
                    Continuous Flow
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("dishes")}
                    className="hover:text-white transition-colors"
                  >
                    Curated Dishes
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: For Restaurants */}
            <div>
              <h5 className="font-mono text-xs font-semibold text-[#FAF8F2] uppercase tracking-wider mb-4">
                Restaurants
              </h5>
              <ul className="space-y-2.5 text-xs text-[#D9D4C8]/70">
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
                    className="hover:text-white transition-colors"
                  >
                    Management Console
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Technology */}
            <div>
              <h5 className="font-mono text-xs font-semibold text-[#FAF8F2] uppercase tracking-wider mb-4">
                Technology
              </h5>
              <ul className="space-y-2.5 text-xs text-[#D9D4C8]/70">
                <li>Google Scene Viewer</li>
                <li>Apple ARKit Quick Look</li>
                <li>Native WebXR 6DoF</li>
                <li>Supabase PostgreSQL</li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Status */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#5D8B82] gap-4">
            <div>© 2026 AR MENU. All rights reserved.</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedDishForModal(null)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-[#FAF8F2] p-6 sm:p-8 shadow-2xl border border-[#D9D4C8] text-[#17211F] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedDishForModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#F5F2EA] hover:bg-[#D9D4C8] flex items-center justify-center text-[#092C29] transition-colors"
              aria-label="Close modal"
            >
              ✕
            </button>

            {/* Modal Image */}
            <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden mb-6 bg-[#F5F2EA]">
              <Image
                src={selectedDishForModal.image}
                alt={selectedDishForModal.name}
                width={1200}
                height={900}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-2xl font-bold text-[#092C29]">
                {selectedDishForModal.name}
              </h3>
              <span className="font-mono font-bold text-2xl text-[#092C29]">
                {selectedDishForModal.price}
              </span>
            </div>

            <span className="text-xs font-mono text-[#5D8B82] uppercase tracking-wider block mb-4">
              {selectedDishForModal.category}
            </span>

            <p className="text-sm text-[#17211F]/80 leading-relaxed mb-6">
              {selectedDishForModal.description}
            </p>

            <div className="p-3.5 rounded-xl bg-white border border-[#D9D4C8] text-xs font-mono text-[#092C29] mb-6 flex items-center justify-between">
              <span>Sommelier Recommendation:</span>
              <span className="font-semibold text-[#092C29]">{selectedDishForModal.pairing}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedDishForModal(null);
                  scrollToSection("experience");
                }}
                className="flex-1 py-3.5 rounded-xl bg-[#092C29] hover:bg-[#123F38] text-[#FAF8F2] font-semibold text-sm transition-colors text-center border border-[#C6A15B]/30"
              >
                Experience in Table AR
              </button>
              <button
                type="button"
                onClick={() => setSelectedDishForModal(null)}
                className="py-3.5 px-6 rounded-xl border border-[#D9D4C8] hover:bg-white font-medium text-sm text-[#092C29] transition-colors"
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