import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";

const inter = localFont({
  variable: "--font-inter",
  display: "swap",
  src: [
    { path: "../../public/fonts/Inter_400Regular.ttf", weight: "400" },
    { path: "../../public/fonts/Inter_500Medium.ttf", weight: "500" },
    { path: "../../public/fonts/Inter_600SemiBold.ttf", weight: "600" },
  ],
});

// The same serif the Cheeku app uses for its own headlines.
const serif = localFont({
  variable: "--font-serif",
  display: "swap",
  src: [
    { path: "../../public/fonts/InstrumentSerif_400Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/InstrumentSerif_400Regular_Italic.ttf", weight: "400", style: "italic" },
  ],
});

const title = "Cheeku: looking after your family between doctor visits";
const description =
  "Cheeku reads every report and prescription, explains them in simple words, and gets the next test or doctor booked, for everyone at home. Join the waitlist.";

export const metadata: Metadata = {
  title,
  description,
  icons: { icon: "/favicon.png" },
  openGraph: { title, description, type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
