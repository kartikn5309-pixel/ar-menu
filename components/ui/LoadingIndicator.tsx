"use client";

import React from "react";

interface LoadingIndicatorProps {
  /** If true, renders full-screen with soft mint / sage backdrop for root or page-level transit */
  fullScreen?: boolean;
  /** Optional contextual subtitle message */
  message?: string;
  /** Size scale for the emblem and typography */
  size?: "sm" | "md" | "lg";
  /** Optional additional container class name */
  className?: string;
}

export default function LoadingIndicator({
  fullScreen = false,
  message,
  size = "md",
  className = "",
}: LoadingIndicatorProps) {
  const isSm = size === "sm";
  const isLg = size === "lg";

  const content = (
    <div
      className={`flex flex-col items-center justify-center text-center select-none ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Refined Brand Emblem */}
      <div
        className={`relative flex items-center justify-center rounded-2xl bg-[#168548] text-white border border-[#DDF5E8] shadow-sm shadow-[#168548]/20 transition-transform ${
          isSm
            ? "h-9 w-9 rounded-xl"
            : isLg
            ? "h-14 w-14 rounded-2xl"
            : "h-11 w-11 rounded-2xl"
        }`}
      >
        <span
          className={`font-mono font-bold tracking-wider text-white ${
            isSm ? "text-xs" : isLg ? "text-base" : "text-sm"
          }`}
        >
          AR
        </span>
      </div>

      {/* Understated Brand Wordmark */}
      <div className={`${isSm ? "mt-2" : "mt-3"} text-center`}>
        <div className="flex items-center justify-center gap-1.5">
          <span
            className={`font-extrabold tracking-tight text-[#1D2923] leading-none ${
              isSm ? "text-xs" : isLg ? "text-base" : "text-sm"
            }`}
          >
            AR MENU
          </span>
        </div>
        <p
          className={`font-mono uppercase tracking-[0.22em] text-[#168548] font-semibold mt-1 ${
            isSm ? "text-[8px]" : "text-[9px]"
          }`}
        >
          Hospitality Suite
        </p>
      </div>

      {/* Subtle Mint Line Animation */}
      <div
        className={`relative overflow-hidden rounded-full bg-[#DCE7DC] ${
          isSm
            ? "mt-2.5 h-[1.5px] w-20"
            : isLg
            ? "mt-4 h-[2px] w-36"
            : "mt-3.5 h-[1.5px] w-28"
        }`}
        aria-hidden="true"
      >
        <div className="absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-transparent via-[#168548] to-transparent animate-mint-line-glide" />
      </div>

      {/* Optional Contextual Message */}
      {message && (
        <p
          className={`font-medium text-[#687B70] transition-opacity duration-300 ${
            isSm ? "mt-2 text-[11px]" : "mt-2.5 text-xs"
          }`}
        >
          {message}
        </p>
      )}

      <span className="sr-only">Loading, please wait...</span>
    </div>
  );

  if (fullScreen) {
    return (
      <main className="fixed inset-0 z-50 flex items-center justify-center bg-[#F7FAF5] text-[#1D2923] px-6 py-12 transition-opacity duration-300 animate-fadeIn">
        {content}
      </main>
    );
  }

  return content;
}
