import type { NextConfig } from "next";

const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/*
 * This app renders medical data. No third-party scripts are permitted on any
 * screen, so the CSP is deliberately narrow: it allows Supabase (auth, storage,
 * realtime) and nothing else.
 */
const csp = [
  "default-src 'self'",
  // Next injects inline bootstrap scripts, so 'unsafe-inline' is required until
  // nonce-based CSP lands in Phase 7.
  "script-src 'self' 'unsafe-inline'" +
    (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:" + (supabaseOrigin ? ` ${supabaseOrigin}` : ""),
  "font-src 'self' data:",
  `connect-src 'self'${
    supabaseOrigin ? ` ${supabaseOrigin} ${supabaseOrigin.replace(/^https/, "wss")}` : ""
  }`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), geolocation=(self), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
