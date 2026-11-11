import type { ChatAction } from "@/lib/memory/model";

/*
 * Which proposed chat actions may be shown (lib/chat/actions.ts). Pure, so the
 * thread reader and tests can use it without the app's server client.
 */

/** Screens a chat button may open. Anything else a model suggests is dropped. */
export const ROUTES: readonly string[] = [
  "/today",
  "/plan",
  "/memory",
  "/health-file",
  "/family",
  "/appointments",
  "/labs",
  "/fitness",
  "/services",
  "/medicines",
  "/insurance",
  "/wearables",
  "/wearables/connect",
  "/wearables/steps",
  "/wearables/sleep",
  "/wearables/restingHr",
];

const GOALS = new Set(["sleep", "weight", "sugar", "legs", "calm"]);

/** Keeps only actions the app can carry out, at most three, no repeats. */
export function safeActions(raw: unknown): ChatAction[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatAction[] = [];
  for (const a of raw) {
    if (!a || typeof a !== "object") continue;
    const r = a as Record<string, unknown>;
    const label = typeof r.label === "string" ? r.label.trim().slice(0, 40) : "";
    if (!label) continue;
    if (r.type === "set_goal" && typeof r.goal === "string" && GOALS.has(r.goal)) out.push({ type: "set_goal", goal: r.goal as never, label });
    if (r.type === "open" && typeof r.route === "string" && ROUTES.includes(r.route)) out.push({ type: "open", route: r.route, label });
  }
  return out.filter((a, i) => out.findIndex((b) => b.label === a.label) === i).slice(0, 3);
}

