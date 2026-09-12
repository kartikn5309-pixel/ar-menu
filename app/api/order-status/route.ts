import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  const token = url.searchParams.get("token");
  if (!orderId || !token) return NextResponse.json({ error: "Missing order access details." }, { status: 400 });
  const { data, error } = await supabase.rpc("get_guest_order", { p_order_id: orderId, p_access_token: token });
  if (error) {
    console.error("get_guest_order RPC failed", { code: error.code, message: error.message, details: error.details, hint: error.hint });
    return NextResponse.json({ error: "Order status is unavailable." }, { status: 404 });
  }
  if (!data) return NextResponse.json({ error: "Order status is unavailable." }, { status: 404 });
  return NextResponse.json({ order: data });
}