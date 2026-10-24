import { softLower } from "@/lib/content/words";

import type { MemoryContext } from "./context";
import { loopWhen } from "./loops";

/*
 * WHAT TO OFFER ON AN EMPTY COMPOSER.
 *
 * Starters come from what Cheeku remembers about this person, not from a
 * fixed list: an open loop, a number that moved, where they are on their
 * clock. A starter is a promise that the answer will be specific, so each one
 * is only offered when the memory can keep it.
 *
 * They still never ask "is this bad?" about a value. They ask what changed,
 * what is pending, what to watch for, which the layer answers from the record.
 */

export type Starter = { key: string; text: string; detail: string | null; icon: "loop" | "trend" | "clock" | "meds" | "symptom" | "file" };

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function memoryStarters(c: MemoryContext): Starter[] {
  const name = c.subject.firstName;
  const out: Starter[] = [];

  const loop = c.loops[0];
  if (loop) out.push({ key: "loops", text: `What's still pending for ${name}?`, detail: `${loop.title} · ${loopWhen(loop)}`, icon: "loop" });

  const r = c.clock.relative;
  if (r?.kind === "gestational") out.push({ key: "clock", text: `What should we watch for at ${r.weeks} weeks?`, detail: c.clock.label, icon: "clock" });
  else if (r?.kind === "day_of_life") out.push({ key: "clock", text: `What's normal for a baby on day ${r.day}?`, detail: "Feeding, weight, colour, sleep", icon: "clock" });
  else if (r?.kind === "postpartum") out.push({ key: "clock", text: "What's normal in the weeks after birth?", detail: c.clock.label, icon: "clock" });

  const moved = [...c.series.values()]
    .filter((s) => s.key !== "bp_diastolic" && s.previous && s.delta !== null && s.direction !== "same")
    .sort((a, b) => b.latest.date.localeCompare(a.latest.date))[0];
  if (moved && moved.previous) {
    out.push({
      key: "trend",
      text: `How has ${name}'s ${moved.key === "bp_systolic" ? "blood pressure" : softLower(moved.name)} changed?`,
      detail: `${fmt(moved.previous.value)} to ${fmt(moved.latest.value)}${moved.unit ? ` ${moved.unit}` : ""}`,
      icon: "trend",
    });
  }

  const active = c.ledger.filter((e) => e.status !== "ended");
  if (active.length >= 2) out.push({ key: "meds", text: `Do any of ${name}'s medicines overlap?`, detail: `${active.length} on the list`, icon: "meds" });

  if (c.documents.length && out.length < 3) out.push({ key: "file", text: `What changed in ${name}'s last report?`, detail: null, icon: "file" });

  return out.slice(0, 3);
}
