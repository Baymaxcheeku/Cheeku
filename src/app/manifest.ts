import type { MetadataRoute } from "next";

/**
 * Lets the app be installed to a phone's home screen and launched standalone.
 *
 * `display: "standalone"` is the load-bearing field: every screen here is
 * composed against a phone viewport with the primary action just above the
 * thumb, and a browser toolbar eating 80pt off the bottom pushes that action
 * under it. Testing in Safari chrome misjudges the layout of every screen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Baymax: your family's health companion",
    short_name: "Baymax",
    description: "The health memory layer for every family.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fafafe",
    theme_color: "#fafafe",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
