"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
} from "@/components/ui/Icons";

const PENDING_RESTAURANT_KEY = "ar-menu-pending-restaurant";

export default function SignupPage() {
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const name = restaurantName.trim();
    const normalizedEmail = email.trim();
    if (!name || !normalizedEmail || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    const { data, error: signupError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (signupError || !data.user) {
      setError(signupError?.message ?? "Could not create your account.");
      setSaving(false);
      return;
    }

    if (!data.session) {
      try {
        window.localStorage.setItem(PENDING_RESTAURANT_KEY, name);
      } catch {
        // Continue even if localStorage is restricted
      }
      setMessage(
        "Account created! Please check your inbox to confirm your email, then log in to finalize your restaurant setup."
      );
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("restaurants")
      .insert({ owner_id: data.user.id, name });

    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#F7FAF5] text-[#1D2923] flex flex-col justify-between selection:bg-[#DDF5E8] selection:text-[#168548] relative overflow-hidden">
      {/* Background Soft Mint Glows */}
      <div className="pointer-events-none absolute -top-40 right-1/4 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle_at_center,rgba(22,133,72,0.07)_0%,transparent_70%)] blur-3xl -z-10" />
      <div className="pointer-events-none absolute bottom-0 -left-40 w-[450px] h-[450px] rounded-full bg-[radial-gradient(circle_at_center,rgba(234,247,239,0.8)_0%,transparent_70%)] blur-3xl -z-10" />

      {/* Top Bar Navigation */}
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#687B70] hover:text-[#168548] transition-colors group"
        >
          <ArrowLeftIcon className="w-4 h-4 text-[#687B70] group-hover:text-[#168548] transition-colors" />
          <span>Back to AR MENU</span>
        </Link>

        <span className="text-[11px] font-mono tracking-wider text-[#168548] uppercase bg-[#EAF7EF] border border-[#DCE7DC] px-2.5 py-1 rounded-md font-semibold">
          Portal v2.4
        </span>
      </header>

      {/* Main Container */}
      <div className="w-full max-w-md mx-auto px-5 sm:px-6 py-4 my-auto">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="flex items-center gap-3 group mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#168548] text-white border border-[#DDF5E8] flex items-center justify-center font-mono font-bold text-sm tracking-widest shadow-sm group-hover:bg-[#11733D] transition-colors">
              AR
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold tracking-tight text-xl leading-tight text-[#1D2923]">
                AR MENU
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] text-[#168548] uppercase font-semibold">
                Restaurant Management Portal
              </span>
            </div>
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#1D2923]">
            Create Restaurant Account
          </h1>
          <p className="text-xs text-[#687B70] mt-1 max-w-xs leading-relaxed font-medium">
            Set up your digital dining catalog, table QR codes, and live kitchen dispatch.
          </p>
        </div>

        {/* Card Shell */}
        <div className="bg-white rounded-2xl border border-[#DCE7DC] shadow-sm p-6 sm:p-8">
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 flex items-start gap-2.5"
            >
              <span className="text-red-500 text-sm leading-none shrink-0">⚠️</span>
              <p className="flex-1 leading-relaxed font-medium">{error}</p>
            </div>
          )}

          {message && (
            <div
              role="status"
              className="mb-5 rounded-xl bg-[#EAF7EF] border border-[#DCE7DC] p-3.5 text-xs text-[#168548] flex items-start gap-2.5"
            >
              <span className="text-[#168548] text-sm leading-none shrink-0">✓</span>
              <p className="flex-1 leading-relaxed font-medium">{message}</p>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label
                htmlFor="restaurant-name"
                className="block text-xs font-semibold text-[#1D2923] uppercase tracking-wider mb-1.5"
              >
                Restaurant Name
              </label>
              <input
                id="restaurant-name"
                type="text"
                required
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                placeholder="e.g. The Grand Bistro"
                className="w-full rounded-xl border border-[#DCE7DC] bg-[#F7FAF5] px-3.5 py-2.5 text-sm text-[#1D2923] placeholder:text-[#687B70]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#168548]/20 focus:border-[#168548] transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="owner-email"
                className="block text-xs font-semibold text-[#1D2923] uppercase tracking-wider mb-1.5"
              >
                Owner Email Address
              </label>
              <input
                id="owner-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@restaurant.com"
                className="w-full rounded-xl border border-[#DCE7DC] bg-[#F7FAF5] px-3.5 py-2.5 text-sm text-[#1D2923] placeholder:text-[#687B70]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#168548]/20 focus:border-[#168548] transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="block text-xs font-semibold text-[#1D2923] uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-[#DCE7DC] bg-[#F7FAF5] pl-3.5 pr-11 py-2.5 text-sm text-[#1D2923] placeholder:text-[#687B70]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#168548]/20 focus:border-[#168548] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#687B70] hover:text-[#1D2923] transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOffIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold text-[#1D2923] uppercase tracking-wider mb-1.5"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full rounded-xl border border-[#DCE7DC] bg-[#F7FAF5] pl-3.5 pr-11 py-2.5 text-sm text-[#1D2923] placeholder:text-[#687B70]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#168548]/20 focus:border-[#168548] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#687B70] hover:text-[#1D2923] transition-colors focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-[#168548] py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#11733D] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2 cursor-pointer"
            >
              {saving ? "Creating Account..." : "Create Restaurant Account"}
            </button>
          </form>

          {/* Login Link */}
          <div className="pt-6 mt-6 border-t border-[#DCE7DC] text-center">
            <p className="text-xs text-[#687B70] font-medium">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#168548] hover:underline underline-offset-4 ml-1"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>

        {/* Security / System Footer Note */}
        <div className="flex items-center justify-center gap-1.5 mt-6 text-[#687B70] text-[11px] font-medium">
          <LockIcon className="w-3 h-3 text-[#168548]" />
          <span>Secured with Supabase authentication &amp; 256-bit encryption</span>
        </div>
      </div>

      {/* Page Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-6 text-center text-xs text-[#687B70] font-medium">
        <p>© {new Date().getFullYear()} AR MENU Inc. All rights reserved.</p>
      </footer>
    </main>
  );
}
