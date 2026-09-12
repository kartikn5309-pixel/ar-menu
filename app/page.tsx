"use client";

import Link from "next/link";
import { useState } from "react";

type FeatureKey = "qr" | "ar" | "ordering";

const featureDetails: Record<FeatureKey, { title: string; description: string }> = {
  qr: {
    title: "QR Digital Menu",
    description:
      "Give every table a QR code so guests can open your menu instantly on their phones.",
  },
  ar: {
    title: "3D & AR Dishes",
    description:
      "AR and 3D dish previews are planned for a future release. This feature is coming soon.",
  },
  ordering: {
    title: "Online Ordering",
    description:
      "Guests can browse dishes, add them to a cart, and place an order directly from the table.",
  },
};

export default function Home() {
  const [selectedFeature, setSelectedFeature] = useState<FeatureKey | null>(null);

  function showFeature(feature: FeatureKey) {
    setSelectedFeature(feature);
    document.getElementById("features")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function scrollToFeatures() {
    document.getElementById("features")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      {/* Navigation */}
      <nav className="flex items-center justify-between border-b px-6 py-5 md:px-12">
        <h1 className="text-2xl font-bold tracking-tight">
          AR <span className="text-orange-500">MENU</span>
        </h1>

        <Link
          href="/login"
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Restaurant Login
        </Link>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex min-h-[75vh] max-w-6xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600">
          🍽️ Smart Digital Menu for Restaurants
        </div>

        <h2 className="max-w-4xl text-5xl font-bold leading-tight tracking-tight md:text-7xl">
          Turn your restaurant menu into an
          <span className="text-orange-500"> interactive experience.</span>
        </h2>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
          Customers scan a QR code, explore your menu, view dishes in 3D,
          experience AR, and place orders directly from their table.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-orange-500 px-8 py-4 font-semibold text-white shadow-lg shadow-orange-200 hover:bg-orange-600"
          >
            Get Started
          </Link>

          <button
            type="button"
            onClick={scrollToFeatures}
            className="rounded-full border border-zinc-300 px-8 py-4 font-semibold hover:bg-zinc-50"
          >
            See How It Works
          </button>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-6 border-t bg-zinc-50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h3 className="text-center text-3xl font-bold">
            Everything a modern restaurant needs
          </h3>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Feature
              feature="qr"
              icon="📱"
              title="QR Digital Menu"
              description="Customers scan a table QR code and instantly open your restaurant menu."
              onClick={showFeature}
            />

            <Feature
              feature="ar"
              icon="🥘"
              title="3D & AR Dishes"
              description="Let customers view dishes in interactive 3D and AR where supported."
              onClick={showFeature}
            />

            <Feature
              feature="ordering"
              icon="🛒"
              title="Online Ordering"
              description="Customers can add dishes to their cart and place orders directly."
              onClick={showFeature}
            />
          </div>

          {selectedFeature && (
            <div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-orange-200 bg-orange-50 p-6 text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
                {selectedFeature === "ar" ? "Coming Soon" : "How it works"}
              </p>
              <h4 className="mt-2 text-2xl font-bold">
                {featureDetails[selectedFeature].title}
              </h4>
              <p className="mt-2 leading-7 text-zinc-600">
                {featureDetails[selectedFeature].description}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-8 text-center text-sm text-zinc-500">
        © 2026 AR MENU — Smart Digital Dining
      </footer>
    </main>
  );
}

function Feature({
  feature,
  icon,
  title,
  description,
  onClick,
}: {
  feature: FeatureKey;
  icon: string;
  title: string;
  description: string;
  onClick: (feature: FeatureKey) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(feature)}
      className="w-full rounded-3xl border bg-white p-8 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="text-4xl">{icon}</div>

      <h4 className="mt-5 text-xl font-bold">{title}</h4>

      <p className="mt-3 leading-7 text-zinc-600">{description}</p>
    </button>
  );
}