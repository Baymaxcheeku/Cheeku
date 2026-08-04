import { defineConfig } from "vitest/config";
import path from "node:path";

/*
 * Logic tests only. These cover the ported rules — the safety gate, plans,
 * grouping, insight and the mock answer engine — none of which touch React
 * Native. Component and flow tests belong in Maestro, not here.
 */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: { include: ["src/**/*.test.ts"], environment: "node" },
});
