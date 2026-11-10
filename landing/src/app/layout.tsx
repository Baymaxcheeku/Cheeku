import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import "./globals.css";

const title = "Cheeku: your family's health, sorted";
const description =
  "Send Cheeku any report or prescription. It explains it in simple words, remembers it for each person at home and books the next test or doctor. Join the waitlist.";

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
    <html lang="en-IN" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
