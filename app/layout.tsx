import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SplashScreen from "@/components/ui/SplashScreen";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AR MENU | Smart Digital Dining & 3D AR Experience",
  description: "Browse curated restaurant dishes in interactive 3D and Augmented Reality directly from your table.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#faf9f5] text-zinc-900 selection:bg-orange-100 selection:text-orange-900">
        <SplashScreen />
        {children}
      </body>
    </html>
  );
}
