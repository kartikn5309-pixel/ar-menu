"use client";

import { use, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Order = { order_id: string; order_number: string; restaurant_id: string; table_id: string; restaurant_name: string; table_name: string; total: number; status: string; created_at: string; items: { item_name: string; unit_price: number; quantity: number; line_total: number }[] };

export default function OrderStatusPage({ params }: { params: Promise<{ orderId: string }> }) {
  const searchParams = useSearchParams();
  const { orderId } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) return;
    const accessToken = token;
    async function loadOrder() {
      const response = await fetch(`/api/order-status?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(accessToken)}`, { cache: "no-store" });
      const result = await response.json() as { order?: Order; error?: string };
      if (!response.ok || !result.order) setError(result.error ?? "Order status is unavailable.");
      else {
        setError("");
        setOrder(result.order);
      }
    }
    void loadOrder();
    const timer = window.setInterval(() => void loadOrder(), 15000);
    return () => window.clearInterval(timer);
  }, [orderId, token]);

  if (!token) return <Message title="Order status unavailable" message="This order status link is incomplete." />;
  if (error) return <Message title="Order status unavailable" message={error} />;
  if (!order) return <Message title="Loading your order" message="Please wait while we retrieve your order." />;
  return <main className="min-h-screen bg-[#fffaf5] px-5 py-8 text-slate-900 sm:px-8 sm:py-12"><section className="mx-auto max-w-2xl rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-10"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">Order placed successfully</p><h1 className="mt-3 text-3xl font-bold">{order.order_number}</h1><p className="mt-2 text-slate-500">{order.restaurant_name} · {order.table_name}</p><p className="mt-1 text-slate-500">Your order has been sent to the restaurant.</p><div className="mt-8 rounded-2xl bg-orange-50 p-5"><p className="text-sm text-orange-700">Current status</p><p className="mt-1 text-2xl font-bold capitalize text-orange-900">{order.status}</p></div><div className="mt-8 space-y-3">{order.items.map((item) => <div key={`${item.item_name}-${item.quantity}`} className="flex justify-between gap-4 border-b pb-3 text-sm"><span>{item.quantity} × {item.item_name}</span><span className="font-semibold">₹{Number(item.line_total).toFixed(2)}</span></div>)}</div><div className="mt-5 flex justify-between text-lg font-bold"><span>Total</span><span className="text-orange-600">₹{Number(order.total).toFixed(2)}</span></div><p className="mt-8 text-center text-sm text-slate-400">Status updates refresh automatically.</p></section></main>;
}

function Message({ title, message }: { title: string; message: string }) { return <main className="flex min-h-screen items-center justify-center bg-[#fffaf5] px-5 text-center text-slate-900"><section className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-8 shadow-sm"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-3 leading-7 text-slate-500">{message}</p></section></main>; }