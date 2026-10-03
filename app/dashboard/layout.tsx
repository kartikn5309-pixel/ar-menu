import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const metadata: Metadata = {
  title: "Management Console | AR MENU",
  description: "Restaurant operations dashboard for digital menus, table QR codes, and live orders.",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
