import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    /*
     * The db tests read Supabase credentials from process.env, and vitest does
     * not load .env.local on its own — which is why profile-isolation.test.ts
     * reported "skipped" rather than "failed" even once a project existed. It
     * was not waiting on credentials; nothing was ever going to set them.
     *
     * The mode is deliberately "development", not "test": Vite skips .env.local
     * when the mode is "test", so asking for the test mode here would silently
     * reproduce the exact bug this line exists to fix.
     */
    env: loadEnv("development", process.cwd(), ""),
  },
});
