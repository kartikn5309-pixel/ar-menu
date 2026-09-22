"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const PENDING_RESTAURANT_KEY = "ar-menu-pending-restaurant";

export default function SignupPage() {
  const router = useRouter();
  const [restaurantName, setRestaurantName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setError("Enter a valid email address.");
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
    const { data, error: signupError } = await supabase.auth.signUp({ email: normalizedEmail, password });
    if (signupError || !data.user) {
      setError(signupError?.message ?? "Could not create your account.");
      setSaving(false);
      return;
    }

    if (!data.session) {
      try {
        window.localStorage.setItem(PENDING_RESTAURANT_KEY, name);
      } catch {
      }
      setMessage("Account created. Confirm your email, then log in to finish setting up your restaurant.");
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabase.from("restaurants").insert({ owner_id: data.user.id, name });
    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white">AR MENU</h1>
          <p className="text-slate-400 mt-2">Restaurant Management Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-900">Create Restaurant Account</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">Set up your restaurant to manage menus, tables, and orders.</p>
          {error && <p role="alert" className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {message && <p role="status" className="mb-5 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

          <form onSubmit={handleSignup} className="space-y-5">
            <Field label="Restaurant Name" value={restaurantName} onChange={setRestaurantName} placeholder="Your restaurant name" />
            <Field label="Owner Email" type="email" value={email} onChange={setEmail} placeholder="restaurant@example.com" />
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" />
            <Field label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat your password" />
            <button type="submit" disabled={saving} className="w-full rounded-lg bg-slate-900 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Creating account..." : "Create Account"}</button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-slate-900 hover:underline">Log in</Link></p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, type = "text", value, onChange, placeholder }: { label: string; type?: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:ring-2 focus:ring-slate-900" /></label>;
}
