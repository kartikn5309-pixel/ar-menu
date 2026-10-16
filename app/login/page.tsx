"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoadingIndicator from "@/components/ui/LoadingIndicator";
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  GoogleIcon,
  FacebookIcon,
  AppleIcon,
  LockIcon,
} from "@/components/ui/Icons";

const PENDING_RESTAURANT_KEY = "ar-menu-pending-restaurant";

type OAuthProvider = "google" | "facebook" | "apple";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);

  // Password reset flow
  const [isResetMode, setIsResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Status feedback (supporting direct query params and user actions)
  const rawQueryError = searchParams.get("error");
  const rawQueryMessage = searchParams.get("message");
  const [dismissedQuery, setDismissedQuery] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccessMessage, setFormSuccessMessage] = useState("");

  const error = formError || (!dismissedQuery && rawQueryError ? decodeURIComponent(rawQueryError) : "");
  const successMessage =
    formSuccessMessage || (!dismissedQuery && rawQueryMessage ? decodeURIComponent(rawQueryMessage) : "");

  function setError(msg: string) {
    setDismissedQuery(true);
    setFormError(msg);
  }

  function setSuccessMessage(msg: string) {
    setDismissedQuery(true);
    setFormSuccessMessage(msg);
  }

  // Email / Password Login
  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError) {
        setError(authError.message || "Invalid email or password.");
        setIsSubmitting(false);
        return;
      }

      // Check for pending restaurant registration setup
      try {
        const pendingName = window.localStorage.getItem(PENDING_RESTAURANT_KEY)?.trim();
        if (pendingName && data.user) {
          const { data: existingRestaurant, error: lookupError } = await supabase
            .from("restaurants")
            .select("id")
            .eq("owner_id", data.user.id)
            .maybeSingle();

          if (!lookupError && !existingRestaurant) {
            await supabase
              .from("restaurants")
              .insert({ owner_id: data.user.id, name: pendingName });
          }
          window.localStorage.removeItem(PENDING_RESTAURANT_KEY);
        }
      } catch {
        // Fallback gracefully if localStorage is restricted
      }

      // Route smoothly to authenticated management console
      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in. Please try again.";
      setError(message);
      setIsSubmitting(false);
    }
  }

  // Real Supabase OAuth sign-in flow with validated callback route
  async function handleOAuthSignIn(provider: OAuthProvider) {
    setError("");
    setSuccessMessage("");
    setOauthLoading(provider);

    try {
      const redirectOrigin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "https://ar-menu.vercel.app";
      const redirectTo = `${redirectOrigin}/auth/callback`;

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: provider === "google" ? { prompt: "select_account" } : undefined,
        },
      });

      if (oauthError) {
        const providerName =
          provider === "google"
            ? "Google"
            : provider === "facebook"
            ? "Facebook"
            : "Apple";

        if (
          oauthError.message.toLowerCase().includes("not enabled") ||
          oauthError.message.toLowerCase().includes("validation_failed")
        ) {
          setError(
            `${providerName} sign-in is not yet enabled in your Supabase project. Please configure ${providerName} provider in Authentication → Providers.`
          );
        } else {
          setError(oauthError.message);
        }
        setOauthLoading(null);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : `Unable to initiate ${provider} sign in.`;
      setError(message);
      setOauthLoading(null);
    }
  }

  // Password reset request
  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    const targetEmail = resetEmail.trim() || email.trim();
    if (!targetEmail) {
      setError("Please provide your account email address.");
      return;
    }

    setResetSubmitting(true);

    try {
      const redirectOrigin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${redirectOrigin}/login?reset=success`,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccessMessage(
          `Password reset instructions have been sent to ${targetEmail}. Please check your inbox.`
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unable to process password reset request.";
      setError(message);
    } finally {
      setResetSubmitting(false);
    }
  }

  const isAnyLoading = isSubmitting || oauthLoading !== null;

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

      {/* Main Authentication Container */}
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
            {isResetMode ? "Reset Password" : "Restaurant Sign In"}
          </h1>
          <p className="text-xs text-[#687B70] mt-1 max-w-xs leading-relaxed font-medium">
            {isResetMode
              ? "Enter your registered email address to receive password recovery instructions."
              : "Sign in to manage your dining menus, table QR codes, and live kitchen orders."}
          </p>
        </div>

        {/* Card Shell */}
        <div className="bg-white rounded-2xl border border-[#DCE7DC] shadow-sm p-6 sm:p-8">
          {/* Status Banners */}
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 flex items-start gap-2.5"
            >
              <span className="text-red-500 text-sm leading-none shrink-0">⚠️</span>
              <p className="flex-1 leading-relaxed font-medium">{error}</p>
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mb-5 rounded-xl bg-[#EAF7EF] border border-[#DCE7DC] p-3.5 text-xs text-[#168548] flex items-start gap-2.5"
            >
              <span className="text-[#168548] text-sm leading-none shrink-0">✓</span>
              <p className="flex-1 leading-relaxed font-medium">{successMessage}</p>
            </div>
          )}

          {/* Conditional View: Password Reset Form */}
          {isResetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="reset-email"
                  className="block text-xs font-semibold text-[#1D2923] uppercase tracking-wider mb-1.5"
                >
                  Account Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  disabled={resetSubmitting}
                  value={resetEmail || email}
                  onChange={(e) => {
                    setResetEmail(e.target.value);
                    setEmail(e.target.value);
                  }}
                  placeholder="owner@restaurant.com"
                  required
                  className="w-full rounded-xl border border-[#DCE7DC] bg-[#F7FAF5] px-3.5 py-2.5 text-sm text-[#1D2923] placeholder:text-[#687B70]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#168548]/20 focus:border-[#168548] transition-colors disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={resetSubmitting}
                className="relative w-full overflow-hidden rounded-xl bg-[#168548] py-2.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#11733D] active:scale-[0.99] transition-all disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {resetSubmitting ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <span>Send Reset Instructions</span>
                )}
              </button>

              <button
                type="button"
                disabled={resetSubmitting}
                onClick={() => {
                  setIsResetMode(false);
                  setError("");
                  setSuccessMessage("");
                }}
                className="w-full text-center text-xs font-semibold text-[#687B70] hover:text-[#168548] pt-1 cursor-pointer"
              >
                ← Return to Sign In
              </button>
            </form>
          ) : (
            <>
              {/* Primary Email / Password Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-[#1D2923] uppercase tracking-wider mb-1.5"
                  >
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    disabled={isAnyLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@restaurant.com"
                    required
                    className="w-full rounded-xl border border-[#DCE7DC] bg-[#F7FAF5] px-3.5 py-2.5 text-sm text-[#1D2923] placeholder:text-[#687B70]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#168548]/20 focus:border-[#168548] transition-colors disabled:opacity-60"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-[#1D2923] uppercase tracking-wider"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      disabled={isAnyLoading}
                      onClick={() => {
                        setIsResetMode(true);
                        setError("");
                        setSuccessMessage("");
                      }}
                      className="text-xs font-semibold text-[#168548] hover:underline underline-offset-2 cursor-pointer disabled:opacity-60"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      disabled={isAnyLoading}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your account password"
                      required
                      className="w-full rounded-xl border border-[#DCE7DC] bg-[#F7FAF5] pl-3.5 pr-11 py-2.5 text-sm text-[#1D2923] placeholder:text-[#687B70]/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#168548]/20 focus:border-[#168548] transition-colors disabled:opacity-60"
                    />
                    <button
                      type="button"
                      disabled={isAnyLoading}
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#687B70] hover:text-[#1D2923] transition-colors focus:outline-none cursor-pointer disabled:opacity-60"
                    >
                      {showPassword ? (
                        <EyeOffIcon className="w-4 h-4" />
                      ) : (
                        <EyeIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isAnyLoading}
                  className="relative w-full overflow-hidden rounded-xl bg-[#168548] py-3 px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#11733D] active:scale-[0.99] transition-all disabled:opacity-75 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />
                      <span className="tracking-wide">Signing In...</span>
                      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#DDF5E8] to-transparent animate-mint-line-glide" />
                    </>
                  ) : (
                    <span>Sign In to Dashboard</span>
                  )}
                </button>
              </form>

              {/* SaaS Divider */}
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[#DCE7DC]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 font-semibold text-[#687B70] tracking-wider text-[11px]">
                    or continue with
                  </span>
                </div>
              </div>

              {/* OAuth Providers with Active Feedback */}
              <div className="space-y-2.5">
                {/* Google */}
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={isAnyLoading}
                  className={`relative w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-2xs overflow-hidden ${
                    oauthLoading === "google"
                      ? "border-[#168548]/40 bg-[#EAF7EF] text-[#168548] cursor-wait"
                      : "border-[#DCE7DC] bg-white hover:bg-[#F7FAF5] active:bg-[#EAF7EF]/50 text-[#1D2923] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  }`}
                >
                  {oauthLoading === "google" ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-[#168548]/40 border-t-[#168548] animate-spin shrink-0" />
                      <span className="font-semibold text-[#168548]">
                        Connecting to Google...
                      </span>
                      <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#168548] to-transparent animate-mint-line-glide" />
                    </>
                  ) : (
                    <>
                      <GoogleIcon className="w-4 h-4 shrink-0" />
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                {/* Facebook */}
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn("facebook")}
                  disabled={isAnyLoading}
                  className={`relative w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-2xs overflow-hidden ${
                    oauthLoading === "facebook"
                      ? "border-[#168548]/40 bg-[#EAF7EF] text-[#168548] cursor-wait"
                      : "border-[#DCE7DC] bg-white hover:bg-[#F7FAF5] active:bg-[#EAF7EF]/50 text-[#1D2923] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  }`}
                >
                  {oauthLoading === "facebook" ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-[#168548]/40 border-t-[#168548] animate-spin shrink-0" />
                      <span className="font-semibold text-[#168548]">
                        Connecting to Facebook...
                      </span>
                      <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#168548] to-transparent animate-mint-line-glide" />
                    </>
                  ) : (
                    <>
                      <FacebookIcon className="w-4 h-4 shrink-0" />
                      <span>Continue with Facebook</span>
                    </>
                  )}
                </button>

                {/* Apple */}
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn("apple")}
                  disabled={isAnyLoading}
                  className={`relative w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all shadow-2xs overflow-hidden ${
                    oauthLoading === "apple"
                      ? "border-[#168548]/40 bg-[#EAF7EF] text-[#168548] cursor-wait"
                      : "border-[#DCE7DC] bg-white hover:bg-[#F7FAF5] active:bg-[#EAF7EF]/50 text-[#1D2923] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  }`}
                >
                  {oauthLoading === "apple" ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-[#168548]/40 border-t-[#168548] animate-spin shrink-0" />
                      <span className="font-semibold text-[#168548]">
                        Connecting to Apple...
                      </span>
                      <div className="absolute bottom-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#168548] to-transparent animate-mint-line-glide" />
                    </>
                  ) : (
                    <>
                      <AppleIcon className="w-4 h-4 shrink-0" />
                      <span>Continue with Apple</span>
                    </>
                  )}
                </button>
              </div>

              {/* Registration Link */}
              <div className="pt-6 mt-6 border-t border-[#DCE7DC] text-center">
                <p className="text-xs text-[#687B70] font-medium">
                  New restaurant?{" "}
                  <Link
                    href="/signup"
                    className="font-semibold text-[#168548] hover:underline underline-offset-4 ml-1"
                  >
                    Create Restaurant Account
                  </Link>
                </p>
              </div>
            </>
          )}
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <LoadingIndicator
          fullScreen
          message="Loading login portal..."
        />
      }
    >
      <LoginContent />
    </Suspense>
  );
}