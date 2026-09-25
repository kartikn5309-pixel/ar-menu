"use client";

import { useEffect, useRef, useState } from "react";
import type { DetailedHTMLProps, HTMLAttributes } from "react";

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

  const arInstruction = arStatus === "session-started"
    ? "Move your phone slowly to find a surface, then tap to place your dish."
    : arStatus === "object-placed"
      ? "Move around your table to view the dish from different angles."
      : "Point your camera at a table or flat surface.";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 p-4 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${itemName} 3D and AR viewer`}
        className="mx-auto flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">3D & AR dish</p>
            <h2 className="mt-1 truncate text-xl font-bold text-slate-950">{itemName}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close AR viewer" className="flex h-10 shrink-0 items-center justify-center rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-200">Close AR</button>
        </div>

        <div className="relative min-h-[min(68vh,560px)] bg-[#f3efe7]">
          {loadError ? (
            <div className="flex h-full min-h-[min(68vh,560px)] flex-col items-center justify-center px-6 text-center">
              <p className="text-lg font-bold text-slate-900">This dish could not be loaded</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Please check your connection and try opening the AR viewer again.</p>
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
              ar-modes="webxr scene-viewer quick-look"
              ar-scale="auto"
              ar-placement="floor"
              touch-action="pan-y"
              shadow-intensity="1"
              loading="eager"
              reveal="auto"
              onLoad={() => setLoading(false)}
              onError={() => setLoadError(true)}
              className="h-full min-h-[min(68vh,560px)] w-full"
            >
              <button slot="ar-button" type="button" className="absolute bottom-5 left-1/2 min-h-12 -translate-x-1/2 rounded-full bg-orange-500 px-6 text-sm font-bold text-white shadow-lg shadow-orange-950/20 transition hover:bg-orange-600">
                Place on table
              </button>
            </model-viewer>
          )}
          {loading && !loadError && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="rounded-full bg-white/90 px-5 py-3 text-sm font-semibold text-slate-700 shadow-lg">Loading 3D dish...</div></div>}
          {!loading && !loadError && arStatus !== "object-placed" && <div className="pointer-events-none absolute left-1/2 top-4 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-slate-950/75 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">{arInstruction}</div>}
          {!loading && !loadError && arStatus === "object-placed" && <div className="pointer-events-none absolute left-1/2 top-4 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl bg-emerald-950/80 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg">{arInstruction}</div>}
          {arStatus === "failed" && <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-red-200 bg-white p-4 text-center shadow-lg"><p className="text-sm font-semibold text-red-700">AR could not start on this device.</p><p className="mt-1 text-xs text-slate-500">You can still rotate and zoom the 3D dish here.</p></div>}
        </div>

        <div className="border-t border-slate-200 px-5 py-4 text-sm text-slate-500 sm:px-6">
          <p>Tap <span className="font-semibold text-slate-700">Place on table</span> to start native AR when supported.</p>
          <p className="mt-1 text-xs text-slate-400">On devices without AR support, rotate and zoom the 3D model here instead.</p>
        </div>
      </section>
    </div>
  );
}
