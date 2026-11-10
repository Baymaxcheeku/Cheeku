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
    { path: "../../public/fonts/Inter_700Bold.ttf", weight: "700" },
  ],
});

const serif = localFont({
  variable: "--font-serif-display",
  display: "swap",
  src: [
    { path: "../../public/fonts/InstrumentSerif_400Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/InstrumentSerif_400Regular_Italic.ttf", weight: "400", style: "italic" },
  ],
});

const title = "Cheeku AI: the health companion that owns the 90 days between doctor visits";
const description =
  "India lives to 71 but stays healthy only till 60. Cheeku keeps one health memory for your whole family, reads every report, checks every prescription and books the next step. In stealth. Join early access.";

export const metadata: Metadata = {
  title,
  description,
  icons: { icon: "/favicon.png" },
  openGraph: { title, description, type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fafafe",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
