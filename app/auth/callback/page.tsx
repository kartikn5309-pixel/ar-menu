"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LoadingIndicator from "@/components/ui/LoadingIndicator";

const PENDING_RESTAURANT_KEY = "ar-menu-pending-restaurant";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusMessage, setStatusMessage] = useState("Verifying your credentials...");

  useEffect(() => {
    let isMounted = true;

    async function processAuth() {
      try {
        // 1. Check for OAuth error parameters in query string or URL hash
        let errorMsg = searchParams.get("error_description") || searchParams.get("error");
        if (!errorMsg && typeof window !== "undefined" && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          errorMsg = hashParams.get("error_description") || hashParams.get("error");
        }
        if (errorMsg) {
          if (isMounted) {
            router.replace(`/login?error=${encodeURIComponent(errorMsg)}`);
          }
          return;
        }

        // 2. Check for PKCE authorization code in query string
        const code = searchParams.get("code");
        if (code) {
          if (isMounted) setStatusMessage("Establishing secure restaurant session...");
          const { data: exchangeData, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (!exchangeError && exchangeData.session?.user) {
            await finalizeAuth(exchangeData.session.user.id);
            return;
          }

          // If exchangeCodeForSession failed, detectSessionInUrl may have already exchanged it
          const { data: fallbackSession } = await supabase.auth.getSession();
          if (fallbackSession.session?.user) {
            await finalizeAuth(fallbackSession.session.user.id);
            return;
          }

          if (exchangeError) {
            console.error("[auth-callback] exchangeCodeForSession failed:", exchangeError);
            if (isMounted) {
              router.replace(
                `/login?error=${encodeURIComponent(
                  exchangeError.message || "Failed to exchange authorization code."
                )}`
              );
            }
            return;
          }
        }

        // 3. Check for implicit hash fragment or existing session
        if (isMounted) setStatusMessage("Validating authenticated session...");
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("[auth-callback] getSession error:", sessionError);
          if (isMounted) {
            router.replace(`/login?error=${encodeURIComponent(sessionError.message)}`);
          }
          return;
        }

        if (sessionData.session?.user) {
          await finalizeAuth(sessionData.session.user.id);
          return;
        }

        // 4. Listen for auth state change if the client is still parsing URL tokens
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
              authListener.subscription.unsubscribe();
              await finalizeAuth(session.user.id);
            }
          }
        );

        // Safety timeout to prevent infinite spinner
        const timeout = setTimeout(() => {
          authListener.subscription.unsubscribe();
          if (isMounted) {
            router.replace(
              "/login?error=" +
                encodeURIComponent("Authentication timed out. Please try signing in again.")
            );
          }
        }, 5000);

        return () => {
          clearTimeout(timeout);
          authListener.subscription.unsubscribe();
        };
      } catch (err: unknown) {
        console.error("[auth-callback] unexpected error:", err);
        const message = err instanceof Error ? err.message : "Authentication failed.";
        if (isMounted) {
          router.replace(`/login?error=${encodeURIComponent(message)}`);
        }
      }
    }

    async function finalizeAuth(userId: string) {
      if (isMounted) setStatusMessage("Opening restaurant management console...");

      // Validate destination: ensure it's a relative path starting with '/' and not '//'
      const nextParam = searchParams.get("next");
      let destination = "/dashboard";
      if (nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")) {
        destination = nextParam;
      }

      // Check for pending restaurant registration setup (from signup flow)
      try {
        const pendingName = window.localStorage.getItem(PENDING_RESTAURANT_KEY)?.trim();
        if (pendingName) {
          const { data: existingRestaurant, error: lookupError } = await supabase
            .from("restaurants")
            .select("id")
            .eq("owner_id", userId)
            .maybeSingle();

          if (!lookupError && !existingRestaurant) {
            await supabase
              .from("restaurants")
              .insert({ owner_id: userId, name: pendingName });
          }
          window.localStorage.removeItem(PENDING_RESTAURANT_KEY);
        }
      } catch {
        // Storage access might be restricted in some browser contexts
      }

      if (isMounted) {
        router.replace(destination);
      }
    }

    void processAuth();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <LoadingIndicator
      fullScreen
      message={statusMessage}
    />
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <LoadingIndicator
          fullScreen
          message="Authenticating your restaurant console..."
        />
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
