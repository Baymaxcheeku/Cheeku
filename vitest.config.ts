import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Playwright owns e2e/; vitest must not try to run those specs.
    exclude: ["node_modules/**", "e2e/**"],
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
