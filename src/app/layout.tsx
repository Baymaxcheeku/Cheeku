import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";

import { DeviceFrame } from "@/components/device-frame";
import { IllustrationDefs } from "@/components/illustrations/defs";

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
  /*
   * Added so "Add to Home Screen" on iOS launches this standalone — no
   * address bar, no Safari toolbar, its own icon and app switcher card. The
   * whole product is designed as a phone app (the desktop device frame exists
   * only to simulate one), so testing it inside browser chrome misrepresents
   * every screen's vertical rhythm: the CTA that sits just above the thumb
   * here is under a toolbar there.
   */
  appleWebApp: {
    capable: true,
    title: "Baymax",
    // Matches --canvas, so the status bar area blends into the app.
    statusBarStyle: "default",
  },
  manifest: "/manifest.webmanifest",
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
        {/* Gradients and filters the illustrations reference by id. Rendered
            once here so the artwork itself can stay a server component. */}
        <IllustrationDefs />
        <DeviceFrame>{children}</DeviceFrame>
      </body>
    </html>
  );
}
