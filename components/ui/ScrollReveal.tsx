"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore, ReactNode } from "react";

export interface ScrollRevealProps {
  children: ReactNode;
  /** Additional CSS class names */
  className?: string;
  /** Direction from which the element slides in */
  direction?: "up" | "down" | "left" | "right" | "none";
  /** Travel distance in pixels (default: 24) */
  distance?: number;
  /** Transition duration in milliseconds (default: 700) */
  duration?: number;
  /** Delay before animation starts in milliseconds (default: 0) */
  delay?: number;
  /** Stagger index: automatically computes delay as `staggerIndex * 100ms` */
  staggerIndex?: number;
  /** Viewport intersection threshold between 0 and 1 (default: 0.12) */
  threshold?: number;
  /** Root margin for triggering earlier or later (default: "0px 0px -40px 0px") */
  rootMargin?: string;
  /** If true, animates only once upon entry (default: true) */
  once?: boolean;
  /** HTML tag or element to render as (default: "div") */
  as?: keyof HTMLElementTagNameMap;
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export default function ScrollReveal({
  children,
  className = "",
  direction = "up",
  distance = 24,
  duration = 700,
  delay = 0,
  staggerIndex,
  threshold = 0.12,
  rootMargin = "0px 0px -40px 0px",
  once = true,
  as: Component = "div",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  // Compute final delay (incorporating staggerIndex if provided)
  const computedDelay = staggerIndex !== undefined ? staggerIndex * 100 : delay;

  useEffect(() => {
    if (prefersReducedMotion) return;

    const target = ref.current;
    if (!target) return;

    // Check if IntersectionObserver is supported
    if (!("IntersectionObserver" in window)) {
      const timer = setTimeout(() => setIsVisible(true), 0);
      return () => clearTimeout(timer);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) {
              observer.unobserve(entry.target);
            }
          } else if (!once) {
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, once, prefersReducedMotion]);

  // Compute directional transform offset
  const getInitialTransform = () => {
    if (prefersReducedMotion || direction === "none") return "translate3d(0, 0, 0)";
    switch (direction) {
      case "up":
        return `translate3d(0, ${distance}px, 0)`;
      case "down":
        return `translate3d(0, -${distance}px, 0)`;
      case "left":
        return `translate3d(${distance}px, 0, 0)`;
      case "right":
        return `translate3d(-${distance}px, 0, 0)`;
      default:
        return `translate3d(0, ${distance}px, 0)`;
    }
  };

  const isRevealed = prefersReducedMotion || isVisible;

  const style: React.CSSProperties = prefersReducedMotion
    ? {}
    : {
        opacity: isRevealed ? 1 : 0,
        transform: isRevealed ? "translate3d(0, 0, 0)" : getInitialTransform(),
        transitionProperty: "opacity, transform",
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: `${computedDelay}ms`,
        willChange: isRevealed ? "auto" : "opacity, transform",
      };

  const DynamicTag = Component as unknown as React.ElementType;

  return (
    <DynamicTag
      ref={ref}
      style={style}
      className={`scroll-reveal-item ${className}`}
    >
      {children}
    </DynamicTag>
  );
}
