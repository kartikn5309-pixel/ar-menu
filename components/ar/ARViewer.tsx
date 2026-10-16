"use client";

import { useEffect, useRef, useState } from "react";
import type { DetailedHTMLProps, HTMLAttributes } from "react";
import { ArCubeIcon, CloseIcon, SparklesIcon } from "@/components/ui/Icons";

type ModelViewerElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string;
  poster?: string;
  alt?: string;
  "camera-controls"?: boolean;
  "auto-rotate"?: boolean;
  ar?: boolean;
  "ar-modes"?: string;
  "ar-scale"?: string;
  "ar-placement"?: string;
  "touch-action"?: string;
  "shadow-intensity"?: string;
  loading?: string;
  reveal?: string;
};

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerElementProps;
    }
  }
}

type ARViewerProps = {
  modelUrl: string;
  itemName: string;
  poster?: string | null;
  onClose: () => void;
};

type ARStatus = "not-presenting" | "session-started" | "object-placed" | "failed";

export default function ARViewer({ modelUrl, itemName, poster, onClose }: ARViewerProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [arStatus, setArStatus] = useState<ARStatus>("not-presenting");
  const modelViewerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const modelViewer = modelViewerRef.current;
    const handleARStatus = (event: Event) => {
      const status = (event as CustomEvent<{ status?: ARStatus }>).detail?.status;
      if (status) setArStatus(status);
    };

    modelViewer?.addEventListener("ar-status", handleARStatus);
    void import("@google/model-viewer");

    return () => modelViewer?.removeEventListener("ar-status", handleARStatus);
  }, []);

  const arInstruction =
    arStatus === "session-started"
      ? "Slowly scan your table surface with the camera, then tap to place the dish."
      : arStatus === "object-placed"
      ? "Dish anchored to table! Walk 360° around your table to inspect plating & portion size."
      : "Point your camera toward your table or a flat dining surface.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-md transition-opacity duration-300"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${itemName} 3D and AR viewer`}
        className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-[#FAF8F2] border border-[#E7E2D6] shadow-2xl transition-all"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-[#E7E2D6] bg-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#C6A15B]">
                <SparklesIcon className="w-3.5 h-3.5 text-[#C6A15B]" />
                <span>Spatial 3D & AR</span>
              </span>
              <span className="text-zinc-300">•</span>
              <span className="text-[11px] font-mono text-[#5D8B82] uppercase tracking-wider">
                1:1 Scale
              </span>
            </div>
            <h2 className="mt-0.5 truncate font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#092C29]">
              {itemName}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close AR viewer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 transition-colors"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* 3D / AR Viewport */}
        <div className="relative min-h-[min(68vh,560px)] bg-gradient-to-b from-[#F5F2EA] to-[#EBE7DC] overflow-hidden">
          {/* Subtle Surface Coordinate Grid Lines */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #092C29 1px, transparent 1px), linear-gradient(to right, #092C29 1px, transparent 1px), linear-gradient(to bottom, #092C29 1px, transparent 1px)",
              backgroundSize: "32px 32px, 96px 96px, 96px 96px",
            }}
            aria-hidden="true"
          />

          {loadError ? (
            <div className="flex h-full min-h-[min(68vh,560px)] flex-col items-center justify-center px-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center text-xl mb-3">
                🍽️
              </div>
              <p className="text-lg font-bold text-zinc-900">
                This 3D model could not be loaded
              </p>
              <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
                Please check your internet connection or try opening the AR viewer again.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition"
              >
                Return to Menu
              </button>
            </div>
          ) : (
            <model-viewer
              ref={modelViewerRef}
              src={modelUrl}
              {...(poster ? { poster } : {})}
              alt={`3D model of ${itemName}`}
              camera-controls
              auto-rotate
              ar
              ar-modes="scene-viewer webxr quick-look"
              ar-scale="auto"
              ar-placement="floor"
              touch-action="pan-y"
              shadow-intensity="1.2"
              loading="eager"
              reveal="auto"
              onLoad={() => setLoading(false)}
              onError={() => setLoadError(true)}
              className="h-full min-h-[min(68vh,560px)] w-full"
            >
              {/* Native AR Launch Button */}
              <button
                slot="ar-button"
                type="button"
                className="absolute bottom-6 left-1/2 -translate-x-1/2 flex min-h-12 items-center gap-2.5 rounded-full bg-[#092C29] px-6 py-3 text-sm font-semibold text-white shadow-xl hover:bg-[#123F38] border border-[#C6A15B]/50 transition-all active:scale-95 cursor-pointer"
              >
                <ArCubeIcon className="w-4 h-4 text-[#C6A15B]" />
                <span>Place On Table in AR</span>
              </button>
            </model-viewer>
          )}

          {/* Loading Indicator */}
          {loading && !loadError && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-3 rounded-full bg-[#FAF8F2]/95 px-5 py-2.5 text-xs font-semibold text-[#092C29] shadow-xl border border-[#C6A15B]/40 backdrop-blur-md">
                <span className="w-3.5 h-3.5 border-2 border-[#C6A15B] border-t-transparent rounded-full animate-spin" />
                <span className="tracking-wide">Loading true-scale 3D dish...</span>
              </div>
            </div>
          )}

          {/* Interactive Inspection Hint (When model is loaded and before AR active) */}
          {!loading && !loadError && arStatus === "not-presenting" && (
            <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/90 backdrop-blur-md border border-[#E7E2D6] text-[11px] font-mono text-zinc-600 shadow-sm flex items-center gap-2">
              <span className="text-zinc-400">✦</span>
              <span>Drag to rotate 360° · Pinch to zoom</span>
            </div>
          )}

          {/* AR Active Guidance Banners */}
          {!loading && !loadError && arStatus !== "not-presenting" && (
            <div
              className={`pointer-events-none absolute left-1/2 top-4 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl px-4 py-3 text-center text-xs font-semibold shadow-lg backdrop-blur-md border transition-all ${
                arStatus === "object-placed"
                  ? "bg-[#092C29]/95 text-[#FAF8F2] border-[#C6A15B]/40"
                  : "bg-zinc-950/90 text-white border-zinc-800"
              }`}
            >
              {arInstruction}
            </div>
          )}

          {/* AR Failed Fallback Banner */}
          {arStatus === "failed" && (
            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-center shadow-lg">
              <p className="text-xs font-semibold text-amber-800">
                Native camera AR is not supported by this browser.
              </p>
              <p className="mt-0.5 text-[11px] text-amber-700/80">
                You can still rotate, zoom, and inspect the true-scale 3D dish right here.
              </p>
            </div>
          )}
        </div>

        {/* Footer Guidance */}
        <div className="border-t border-[#E7E2D6] bg-white px-5 py-3.5 text-xs text-zinc-500 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-[11px]">
            Tap <strong className="text-zinc-800 font-semibold">Place On Table</strong> to project the dish into physical dining space.
          </p>
          <span className="text-[10px] font-mono text-[#5D8B82] tracking-wider uppercase">
            6DoF World Anchor
          </span>
        </div>
      </section>
    </div>
  );
}
