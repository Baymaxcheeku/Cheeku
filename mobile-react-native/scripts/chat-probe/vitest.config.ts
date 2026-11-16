import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

/*
 * Live chat probe: who answers each question, Gemini or the rules/stand-in.
 * Not part of `npx vitest run`. Run with:
 *
 *   npm run chat:probe
 *
 * Reads the Supabase URL, anon key, CHAT_PROBE_EMAIL and CHAT_PROBE_PASSWORD
 * from .env.local (or the shell), so the login never goes on a command line.
 */
const root = path.resolve(__dirname, "../..");
const env: Record<string, string> = {};
try {
  for (const line of readFileSync(path.join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^(EXPO_PUBLIC_SUPABASE_URL|EXPO_PUBLIC_SUPABASE_ANON_KEY|CHAT_PROBE_EMAIL|CHAT_PROBE_PASSWORD)=(.*)$/);
    if (m) env[m[1]!] = m[2]!.trim().replace(/^["']|["']$/g, "");
  }
} catch {
  // No .env.local: the probe says so and stops.
}

export default defineConfig({
  root,
  resolve: { alias: { "@": path.join(root, "src") } },
  test: {
    include: ["scripts/chat-probe/chat-probe.test.ts"],
    environment: "node",
    testTimeout: 180_000,
    // The shell wins over .env.local for the login.
    env: {
      ...env,
      ...(process.env.CHAT_PROBE_EMAIL ? { CHAT_PROBE_EMAIL: process.env.CHAT_PROBE_EMAIL } : {}),
      ...(process.env.CHAT_PROBE_PASSWORD ? { CHAT_PROBE_PASSWORD: process.env.CHAT_PROBE_PASSWORD } : {}),
      ...(process.env.CHAT_PROBE_Q ? { CHAT_PROBE_Q: process.env.CHAT_PROBE_Q } : {}),
      ...(process.env.CHAT_PROBE_OUT ? { CHAT_PROBE_OUT: process.env.CHAT_PROBE_OUT } : {}),
      ...(process.env.CHAT_PROBE_FULL ? { CHAT_PROBE_FULL: process.env.CHAT_PROBE_FULL } : {}),
      EXPO_PUBLIC_CHAT_MODEL: "edge",
    },
  },
});
