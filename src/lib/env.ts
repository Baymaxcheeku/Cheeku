import { z } from "zod";

/*
 * Fail loudly at boot rather than at the first Supabase call. Client and server
 * schemas are separate so the service-role key can never be read from a bundle
 * that ships to the browser.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_AI_MODE: z.enum(["mock", "live"]).default("mock"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
});

export type ClientEnv = z.infer<typeof clientSchema>;

// Next inlines process.env.NEXT_PUBLIC_* only for statically analysable reads,
// so each key must be written out in full.
export const clientEnv: ClientEnv = clientSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_AI_MODE: process.env.NEXT_PUBLIC_AI_MODE,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

/**
 * The one sanctioned NODE_ENV read. Next inlines it at build time so it is safe
 * in either bundle, but it lives here so nothing else needs `process.env`.
 */
export const IS_PRODUCTION = process.env.NODE_ENV === "production";

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

/**
 * Reads server-only secrets. Throws if called from a browser bundle.
 */
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error(
      "serverEnv() was called in the browser. The service-role key must never ship to a client.",
    );
  }
  return serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
