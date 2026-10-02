"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [phaseText, setPhaseText] = useState("INITIALIZING SPATIAL ENGINE");
  const [isFading, setIsFading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Accessibility check: immediately dismiss if user prefers reduced motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      const skipTimer = window.setTimeout(() => {
        setIsDismissed(true);
      }, 0);
      return () => window.clearTimeout(skipTimer);
    }

    // Sequence 1: Environment Scan at 350ms
    const tScan = window.setTimeout(() => {
      setPhaseText("SCANNING ENVIRONMENT");
    }, 350);

    // Sequence 2: Surface Detection at 700ms
    const tSurface = window.setTimeout(() => {
      setPhaseText("SURFACE DETECTED");
    }, 700);

    // Sequence 3: AR Menu System Ready at 1250ms
    const tReady = window.setTimeout(() => {
      setPhaseText("AR MENU READY");
    }, 1250);

    // Sequence 4: Cinematic Exit Transition at 1750ms
    const tFade = window.setTimeout(() => {
      setIsFading(true);
    }, 1750);

    // Sequence 5: Complete unmount from DOM at 2150ms
    const tRemove = window.setTimeout(() => {
      setIsDismissed(true);
    }, 2150);

    return () => {
      window.clearTimeout(tScan);
      window.clearTimeout(tSurface);
      window.clearTimeout(tReady);
      window.clearTimeout(tFade);
      window.clearTimeout(tRemove);
    };
  }, []);

  // Immediate tactile tap/click dismissal so user is never blocked
  function handleDismiss() {
    setIsFading(true);
    window.setTimeout(() => {
      setIsDismissed(true);
    }, 160);
  }

  if (isDismissed) {
    return null;
  }

  return (
    <div
      onClick={handleDismiss}
      role="status"
      aria-live="polite"
      aria-label="Initializing AR Dining Environment"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050507] text-white select-none overflow-hidden cursor-pointer transition-all duration-400 ease-out ${
        isFading
          ? "opacity-0 scale-[1.04] pointer-events-none"
          : "opacity-100 scale-100"
      }`}
      style={{ perspective: "1000px" }}
    >
      {/* 0.0s OPENING MOMENT: Singularity Point of Light */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-amber-400 blur-[1px] animate-singularity-bloom z-30"
        aria-hidden="true"
      />

      {/* ATMOSPHERIC DEPTH: Soft Warm Amber Core Light */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle_at_center,rgba(245,110,15,0.15)_0%,rgba(180,83,9,0.03)_50%,transparent_75%)] -z-30"
        aria-hidden="true"
      />

      {/* ATMOSPHERIC DEPTH: Soft Edge Vignette */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_42%,rgba(4,4,6,0.95)_100%)] -z-20"
        aria-hidden="true"
      />

      {/* ATMOSPHERIC DEPTH: Volumetric Light Shafts (Subtle Angled Beams) */}
      <div
        className="pointer-events-none absolute top-[-25%] left-[-15%] w-[340px] h-[950px] bg-gradient-to-b from-amber-500/4 via-amber-500/1 to-transparent blur-3xl transform -rotate-30 -z-20"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-[-15%] right-[-15%] w-[280px] h-[850px] bg-gradient-to-b from-orange-500/3 via-orange-500/1 to-transparent blur-3xl transform rotate-25 -z-20"
        aria-hidden="true"
      />

      {/* SPATIAL BACKGROUND GRID (Reacts to signature shockwave) */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 animate-grid-shockwave-pulse"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(255, 255, 255, 0.95) 1px, transparent 1px),
            linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px, 96px 96px, 96px 96px",
          maskImage: "radial-gradient(circle at center, black 32%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(circle at center, black 32%, transparent 75%)",
        }}
        aria-hidden="true"
      />

      {/* FLOATING SPATIAL DUST & PARTICLES */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <span className="absolute top-[24%] left-[20%] h-1 w-1 rounded-full bg-amber-400/50 blur-[0.4px] animate-particle-float-1" />
        <span className="absolute top-[30%] right-[22%] h-1 w-1 rounded-full bg-orange-400/40 blur-[0.4px] animate-particle-float-2" />
        <span className="absolute bottom-[32%] left-[26%] h-1.5 w-1.5 rounded-full bg-amber-300/40 blur-[0.5px] animate-particle-float-3" />
        <span className="absolute bottom-[26%] right-[24%] h-1 w-1 rounded-full bg-amber-500/40 blur-[0.4px] animate-particle-float-1" />
        <span className="absolute top-[46%] left-[12%] h-1 w-1 rounded-full bg-orange-300/35 blur-[0.4px] animate-particle-float-2" />
        <span className="absolute top-[50%] right-[14%] h-1 w-1 rounded-full bg-amber-400/35 blur-[0.4px] animate-particle-float-3" />
      </div>

      {/* 0.45s SURFACE DETECTION: Physical Dining Plane (Perspective Table Surface) */}
      <div
        className="pointer-events-none absolute top-[50%] left-1/2 -translate-x-1/2 h-[180px] w-[290px] sm:w-[330px] -z-10 animate-surface-plane-reveal"
        aria-hidden="true"
      >
        {/* Surface Grid Mesh */}
        <div
          className="h-full w-full rounded-2xl border border-amber-500/25"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(245, 110, 15, 0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(245, 110, 15, 0.22) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(circle at center, black 42%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(circle at center, black 42%, transparent 80%)",
          }}
        />

        {/* 4 Surface Tracking Fiducials (Locking to Physical Table) */}
        <div className="absolute inset-4 animate-fiducial-lock">
          <span className="absolute -top-1 -left-1 h-3 w-3 border-t-2 border-l-2 border-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <span className="absolute -top-1 -right-1 h-3 w-3 border-t-2 border-r-2 border-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <span className="absolute -bottom-1 -left-1 h-3 w-3 border-b-2 border-l-2 border-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <span className="absolute -bottom-1 -right-1 h-3 w-3 border-b-2 border-r-2 border-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
        </div>

        {/* Surface Altitude & Lock Status */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-mono tracking-[0.28em] text-amber-400/70 uppercase">
          SURFACE LOCKED // +0.00m
        </div>
      </div>

      {/* CENTERPIECE CONTAINER */}
      <div className="relative flex flex-col items-center">
        {/* 0.2s - 0.7s: High-Energy Thin LiDAR Scanning Beam */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_12px_rgba(251,191,36,0.95)] animate-surface-scan-sweep pointer-events-none z-30" />

        {/* AR SCANNING INTERFACE (Concentric Rings & Reticles) */}
        <div className="relative flex items-center justify-center w-[210px] h-[210px] sm:w-[230px] sm:h-[230px]">
          {/* 1.3s SIGNATURE MOMENT: Amber Resonance Shockwave expanding outward */}
          <div className="pointer-events-none absolute inset-0 rounded-full border border-amber-400/80 shadow-[0_0_20px_rgba(245,110,15,0.5)] animate-signature-shockwave z-20" />

          {/* SVG Concentric Rings */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
            viewBox="0 0 230 230"
            fill="none"
          >
            {/* Outer Coordinate Tick Ring (Clockwise) */}
            <g className="animate-[spin_32s_linear_infinite] origin-center">
              <circle cx="115" cy="115" r="104" stroke="#f59e0b" strokeOpacity="0.14" strokeWidth="1" />
              {/* Cardinal crosshairs at 0°, 90°, 180°, 270° */}
              <line x1="115" y1="7" x2="115" y2="13" stroke="#f59e0b" strokeOpacity="0.5" strokeWidth="1.5" />
              <line x1="115" y1="217" x2="115" y2="223" stroke="#f59e0b" strokeOpacity="0.5" strokeWidth="1.5" />
              <line x1="7" y1="115" x2="13" y2="115" stroke="#f59e0b" strokeOpacity="0.5" strokeWidth="1.5" />
              <line x1="217" y1="115" x2="223" y2="115" stroke="#f59e0b" strokeOpacity="0.5" strokeWidth="1.5" />
              {/* Coordinate micro dots */}
              <circle cx="115" cy="11" r="1.5" fill="#f59e0b" fillOpacity="0.6" />
              <circle cx="188" cy="42" r="1" fill="#f59e0b" fillOpacity="0.3" />
              <circle cx="219" cy="115" r="1.5" fill="#f59e0b" fillOpacity="0.6" />
              <circle cx="188" cy="188" r="1" fill="#f59e0b" fillOpacity="0.3" />
              <circle cx="115" cy="219" r="1.5" fill="#f59e0b" fillOpacity="0.6" />
              <circle cx="42" cy="188" r="1" fill="#f59e0b" fillOpacity="0.3" />
              <circle cx="11" cy="115" r="1.5" fill="#f59e0b" fillOpacity="0.6" />
              <circle cx="42" cy="42" r="1" fill="#f59e0b" fillOpacity="0.3" />
            </g>

            {/* Inner Dashed Ring (Counter-Clockwise) */}
            <g className="animate-[spin_22s_linear_infinite_reverse] origin-center">
              <circle cx="115" cy="115" r="88" stroke="#ea580c" strokeOpacity="0.22" strokeWidth="1.2" strokeDasharray="4 8" />
            </g>

            {/* Dynamic Radar Scanning Arc */}
            <g className="animate-radar-spin origin-center">
              <circle cx="115" cy="115" r="72" stroke="#fbbf24" strokeOpacity="0.45" strokeWidth="1.8" strokeDasharray="32 190" strokeLinecap="round" />
            </g>
          </svg>

          {/* Viewfinder Reticle Brackets */}
          <div className="absolute inset-12 pointer-events-none z-10 animate-fiducial-lock">
            <span className="absolute -top-1 -left-1 h-3.5 w-3.5 border-t-2 border-l-2 border-amber-400/80 rounded-tl-[3px] shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 border-t-2 border-r-2 border-amber-400/80 rounded-tr-[3px] shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            <span className="absolute -bottom-1 -left-1 h-3.5 w-3.5 border-b-2 border-l-2 border-amber-400/80 rounded-bl-[3px] shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 border-b-2 border-r-2 border-amber-400/80 rounded-br-[3px] shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
          </div>

          {/* 0.85s - 1.35s BRAND CONSTRUCTION: 3D Faceted Cube Constructing from Geometric Fragments */}
          <div className="relative z-10 flex h-22 w-22 sm:h-24 sm:w-24 items-center justify-center rounded-2xl border border-amber-500/35 bg-gradient-to-b from-zinc-900/95 via-zinc-950/95 to-[#09090b] shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_35px_rgba(245,110,15,0.22),inset_0_1px_1px_rgba(255,255,255,0.14)] overflow-hidden">
            {/* 1.1s Specular Light Sweep across the cube */}
            <div
              className="pointer-events-none absolute -inset-y-6 -left-16 w-24 bg-gradient-to-r from-transparent via-white/25 to-transparent blur-xs animate-cube-specular-shimmer"
              aria-hidden="true"
            />

            {/* Dimensional 3D Faceted Isometric Cube SVG */}
            <svg
              className="h-12 w-12 sm:h-14 sm:w-14 relative z-10 drop-shadow-[0_4px_18px_rgba(245,110,15,0.4)]"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Top Face Gradient: illuminated warm amber-gold */}
                <linearGradient id="cubeTopGradV2" x1="14" y1="10" x2="50" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
                  <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.95" />
                </linearGradient>

                {/* Left Face Gradient: metallic deep charcoal with warm amber rim light */}
                <linearGradient id="cubeLeftGradV2" x1="14" y1="20" x2="32" y2="54" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#3f3f46" stopOpacity="0.95" />
                  <stop offset="40%" stopColor="#27272a" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#18181b" stopOpacity="0.95" />
                </linearGradient>

                {/* Right Face Gradient: obsidian shadow with ambient floor bounce */}
                <linearGradient id="cubeRightGradV2" x1="50" y1="20" x2="32" y2="54" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#27272a" stopOpacity="0.95" />
                  <stop offset="60%" stopColor="#18181b" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#09090b" stopOpacity="0.95" />
                </linearGradient>

                {/* Inner Spatial Core Gradient */}
                <linearGradient id="cubeCoreGradV2" x1="26" y1="27" x2="38" y2="35" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
              </defs>

              {/* FRAGMENT 1: Left Face converging from bottom-left */}
              <g className="animate-fragment-left origin-center">
                <path
                  d="M14 20.4L32 32V54L14 42.4V20.4Z"
                  fill="url(#cubeLeftGradV2)"
                  stroke="#f97316"
                  strokeOpacity="0.3"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
              </g>

              {/* FRAGMENT 2: Right Face converging from bottom-right */}
              <g className="animate-fragment-right origin-center">
                <path
                  d="M32 32L50 20.4V42.4L32 54V32Z"
                  fill="url(#cubeRightGradV2)"
                  stroke="#ea580c"
                  strokeOpacity="0.3"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
              </g>

              {/* FRAGMENT 3: Top Face converging from above */}
              <g className="animate-fragment-top origin-center">
                <path
                  d="M32 10L50 20.4L32 32L14 20.4L32 10Z"
                  fill="url(#cubeTopGradV2)"
                  stroke="#fef08a"
                  strokeOpacity="0.55"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
              </g>

              {/* Precision Seam Ignite Lines (Ignite on fragment convergence) */}
              <path
                d="M32 10L32 32M14 20.4L32 32M50 20.4L32 32M32 32L32 54"
                stroke="#fbbf24"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-seam-ignite"
              />

              {/* FRAGMENT 4: Inner Spatial Diamond Core */}
              <g className="animate-fragment-core origin-center">
                <path
                  d="M32 26.5L37.5 29.8L32 33.1L26.5 29.8Z"
                  fill="url(#cubeCoreGradV2)"
                  stroke="#fef08a"
                  strokeWidth="0.6"
                  className="animate-pulse"
                />
              </g>
            </svg>

            {/* Subtle bottom amber ambient flare */}
            <div className="pointer-events-none absolute -bottom-2 h-4 w-14 rounded-full bg-orange-500/35 blur-sm" />
          </div>
        </div>

        {/* TELEMETRY & SPATIAL ENGINE STATUS */}
        <div className="mt-3 flex items-center gap-2 px-3 py-0.5 rounded-full bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xs">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
          </span>
          <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.24em] text-zinc-400 uppercase font-medium">
            {phaseText}
          </span>
        </div>

        {/* BRAND IDENTITY REVEAL */}
        <div className="mt-3.5 text-center animate-brand-text-reveal">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            <span>AR</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 drop-shadow-[0_2px_14px_rgba(245,110,15,0.35)]">
              MENU
            </span>
          </h1>

          <p className="mt-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.34em] text-zinc-400 flex items-center justify-center gap-2">
            <span>Scan</span>
            <span className="text-amber-500/70 text-[8px]">•</span>
            <span>Explore</span>
            <span className="text-amber-500/70 text-[8px]">•</span>
            <span>Visualize</span>
          </p>
        </div>

        {/* MICRO PROGRESS TRACKER */}
        <div className="mt-5 h-[2px] w-36 sm:w-40 overflow-hidden rounded-full bg-zinc-800/80 border border-zinc-700/40">
          <div className="h-full w-full rounded-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500 shadow-[0_0_12px_rgba(245,110,15,0.7)] animate-progress-fill-v2" />
        </div>
      </div>

      {/* HIDDEN PROFESSIONAL TRACKING TELEMETRY (Low Opacity 10-15% for repeated viewing) */}
      <div className="pointer-events-none absolute bottom-14 sm:bottom-16 inset-x-8 sm:inset-x-12 flex items-center justify-between opacity-15 text-[8px] font-mono tracking-widest text-zinc-500">
        <span>X: +0.14  Y: -0.02  Z: +0.85</span>
        <span className="hidden sm:inline">FOV 68° // MESH LOCKED</span>
        <span>SYS.READY // 60FPS</span>
      </div>

      {/* FOOTER: Tap to skip hint */}
      <div className="absolute bottom-6 sm:bottom-8 text-[11px] font-medium tracking-wide text-zinc-500/60 transition-opacity hover:opacity-100">
        Tap anywhere to enter
      </div>
    </div>
  );
}
