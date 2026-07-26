import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

import { DeviceFrame } from "@/components/device-frame";

import "./globals.css";

/*
 * The design calls for General Sans / Clash Display, which are Fontshare fonts
 * and cannot be self-hosted via next/font/google. Inter is the spec'd fallback
 * until the licensed files are added to /public/fonts.
 */
const display = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Reserved for the single editorial moment per screen (the Home greeting).
const editorial = Fraunces({
  subsets: ["latin"],
  variable: "--font-editorial",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Baymax",
  description: "The health memory layer for every family.",
  // Medical screens must never be indexed or previewed by third parties.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fafafe",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${editorial.variable} h-full`}>
      <body className="min-h-full antialiased">
        <DeviceFrame>{children}</DeviceFrame>
      </body>
    </html>
  );
}
