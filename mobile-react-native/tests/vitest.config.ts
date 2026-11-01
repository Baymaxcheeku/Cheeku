import { defineConfig } from "vitest/config";

/*
 * The database tests: a static RLS audit over supabase/migrations, and the
 * runtime profile-isolation proof, which skips unless EXPO_PUBLIC_SUPABASE_URL,
 * EXPO_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are exported in
 * the shell. The service key never goes in this app's .env.local.
 */
export default defineConfig({
  test: { include: ["db/**/*.test.ts"], environment: "node" },
});
