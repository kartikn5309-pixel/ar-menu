"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PENDING_RESTAURANT_KEY = "ar-menu-pending-restaurant";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: FormEvent) {
  e.preventDefault();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
    return;
  }

  try {
    const pendingName = window.localStorage.getItem(PENDING_RESTAURANT_KEY)?.trim();
    if (pendingName && data.user) {
      const { data: existingRestaurant, error: lookupError } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", data.user.id)
        .maybeSingle();
      if (lookupError) {
        alert(lookupError.message);
        return;
      }
      if (!existingRestaurant) {
        const { error: profileError } = await supabase.from("restaurants").insert({ owner_id: data.user.id, name: pendingName });
        if (profileError) {
          alert(profileError.message);
          return;
        }
      }
      window.localStorage.removeItem(PENDING_RESTAURANT_KEY);
    }
  } catch {
    // Continue login if browser storage is unavailable.
  }

router.push("/dashboard");
}
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">AR MENU</h1>
          <p className="text-slate-400 mt-2">
            Restaurant Management Portal
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Restaurant Login
          </h2>

          <p className="text-sm text-slate-500 mt-2 mb-6">
            Login to manage your restaurant menu and orders.
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="restaurant@example.com"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 py-3 font-semibold text-white hover:bg-slate-800 transition"
            >
              Login
            </button>
          </form>

          <p className="text-xs text-slate-400 text-center mt-6">
            Secure restaurant portal
          </p>
          <p className="text-sm text-center mt-4 text-slate-500">
            New restaurant? <Link href="/signup" className="font-semibold text-slate-900 hover:underline">Create Restaurant Account</Link>
          </p>
        </div>
      </div>
    </main>
  );
}