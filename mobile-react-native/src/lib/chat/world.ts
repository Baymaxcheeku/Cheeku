import { extensionChatNotes, extensionSignals } from "@/lib/extensions";
import { useAppointments, isUpcoming, whenLabel } from "@/lib/booking/appointments";
import { goalByKey, goalTitle, readGoalPrefs } from "@/lib/home/goals";
import { fetchDailyLogs, fetchDailyPrefs } from "@/lib/home/logs";
import { focusAreas, longevityAreas, recordSignals, type Area, type Signal } from "@/lib/longevity/areas";
import { longevityDigest } from "@/lib/longevity/digest";
import { dayLabel } from "./daily";

export { longevityDigest };
import { buildContext, type MemoryContext } from "@/lib/memory/context";
import { fetchMemory } from "@/lib/memory/store";
import { supabase } from "@/lib/supabase/client";

/*
 * EVERYTHING AROUND THE PERSON, FOR ONE CHAT TURN.
 *
 * The memory digest (lib/memory/model.ts) is the person's records. This is
 * the rest of their world, so Cheeku can talk about all of it:
 *
 *   longevity  the six areas, on track / watch / act, with the reason
 *   today      the goal they chose and what was logged today
 *   care       bookings coming up and just done: tests, doctors, classes
 *   device     the watch's lines, from the wearables layer if it is there
 *   family     a one-line round-up per member, only when asked and only
 *              from the account holder's own chat
 *
 * Every part is best effort with a short wait. A turn never fails, or waits,
 * because one of these could not be read.
 */

export type WorldDigest = {
  longevity: { area: string; label: string; status: Area["status"]; line: string; sample: boolean }[];
  /** `justLogged`: steps or sleep said in this very message, already saved to the day's logs. */
  today: { goal: string | null; logged: string[]; stepsToday: number | null; justLogged: string[] };
  care: { upcoming: string[]; recent: string[] };
  device: string[];
  /** Null unless the question asked for the family round-up. */
  family: { name: string; relation: string | null; you: boolean; line: string }[] | null;
};

export const FAMILY_ROUNDUP = /\b(how(?:'s| is| are)? (?:every(?:one|body)|the family|my family|all of us|sab)|family (?:update|round.?up|summary|check)|sab (?:kaise|theek)|everyone ok)\b/i;

const WAIT_MS = 1500;

function within<T>(p: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), WAIT_MS))]);
}

export function isPregnant(ctx: MemoryContext): boolean {
  return ctx.clock.relative?.kind === "gestational";
}

async function today(profileId: string, day: string): Promise<Omit<WorldDigest["today"], "justLogged">> {
  const [prefs, logs] = await Promise.all([fetchDailyPrefs(profileId), fetchDailyLogs(profileId)]);
  const g = readGoalPrefs(prefs.goal);
  const goal = g ? goalByKey(g.key) : null;
  const mine = logs.filter((l) => l.day === day);
  const steps = mine.filter((l) => l.kind === "steps" && typeof l.value === "number").map((l) => l.value as number);
  return {
    goal: goal && g ? goalTitle(goal, g.answers) : null,
    logged: mine.filter((l) => l.kind !== "steps").map((l) => l.valueText ?? l.taskKey).slice(0, 8),
    stepsToday: steps.length ? Math.max(...steps) : null,
  };
}

async function care(profileId: string, firstName: string): Promise<WorldDigest["care"]> {
  const upcoming: string[] = [];
  const recent: string[] = [];
  await useAppointments.getState().load();
  for (const a of useAppointments.getState().items) {
    if (a.status !== "booked" || (a.profileId && a.profileId !== profileId)) continue;
    if (!a.profileId && a.forName && !a.forName.toLowerCase().startsWith(firstName.toLowerCase())) continue;
    (isUpcoming(a) ? upcoming : recent).push(`Doctor ${a.mode === "online" ? "video call" : "visit"} ${whenLabel(a)}, about ${a.concern || "a check-up"}`);
  }
  const [labs, classes] = await Promise.all([
    supabase.from("lab_bookings").select("tests, slot_date, status").eq("profile_id", profileId).order("created_at", { ascending: false }).limit(4),
    supabase.from("fitness_bookings").select("session_title, studio_name, starts_at, status").eq("profile_id", profileId).order("starts_at", { ascending: false }).limit(4),
  ]);
  for (const b of labs.data ?? []) {
    const tests = Array.isArray(b.tests) ? (b.tests as { name?: string; label?: string }[]).map((t) => t.label ?? t.name).filter(Boolean).slice(0, 3).join(", ") : "tests";
    const line = `Home test (${tests || "tests"}) on ${dayLabel(b.slot_date as string)}, ${String(b.status).replace(/_/g, " ")}`;
    (b.status === "ready" || b.status === "cancelled" ? recent : upcoming).push(line);
  }
  const now = Date.now();
  for (const c of classes.data ?? []) {
    if (c.status === "cancelled") continue;
    const line = `${c.session_title} at ${c.studio_name}, ${dayLabel(c.starts_at as string)}`;
    (Date.parse(c.starts_at as string) > now ? upcoming : recent).push(line);
  }
  // The same class booked twice reads as one line, and the soonest comes first.
  return { upcoming: [...new Set(upcoming)].reverse().slice(0, 4), recent: [...new Set(recent)].slice(0, 4) };
}

/** One line per family member, worst area first. Only from the account holder's own chat. */
async function family(viewing: string, day: string): Promise<WorldDigest["family"]> {
  const { data } = await supabase.from("profiles").select("id, name, relationship, is_primary").order("created_at");
  const rows = (data ?? []).slice(0, 6);
  const out: NonNullable<WorldDigest["family"]> = [];
  for (const p of rows) {
    const bundle = await within(fetchMemory(p.id as string), null);
    if (!bundle) {
      out.push({ name: String(p.name).split(" ")[0]!, relation: (p.relationship as string | null) ?? null, you: p.id === viewing, line: "Nothing on file yet." });
      continue;
    }
    const ctx = buildContext(bundle, day);
    const signals = recordSignals({ series: ctx.series, loops: ctx.loops, today: day, ageYears: ctx.clock.ageYears ?? null, pregnant: isPregnant(ctx) });
    const areas = focusAreas(longevityAreas(signals));
    const first = areas[0];
    out.push({
      name: ctx.subject.firstName,
      relation: (p.relationship as string | null) ?? null,
      you: p.id === viewing,
      line: first ? `${first.label}: ${first.line}` : ctx.loops.length ? `${ctx.loops.length} thing${ctx.loops.length > 1 ? "s" : ""} open, nothing urgent.` : "All quiet.",
    });
  }
  return out;
}

/**
 * Gathers the world for one turn. `isPrimary` gates the family round-up: a
 * parent's or child's chat never talks about everyone else.
 */
export async function gatherWorld(args: { profileId: string; ctx: MemoryContext; question: string; isPrimary: boolean; day: string; justLogged?: string[] }): Promise<WorldDigest> {
  const { profileId, ctx, day } = args;
  const base = recordSignals({ series: ctx.series, loops: ctx.loops, today: day, ageYears: ctx.clock.ageYears ?? null, pregnant: isPregnant(ctx) });
  const wantsFamily = args.isPrimary && FAMILY_ROUNDUP.test(args.question);
  const [device, signals, t, c, f] = await Promise.all([
    within(extensionChatNotes(profileId), [] as string[]),
    within(extensionSignals(profileId), [] as Signal[]),
    within(today(profileId, day), { goal: null, logged: [], stepsToday: null }),
    within(care(profileId, ctx.subject.firstName), { upcoming: [], recent: [] }),
    wantsFamily ? within(family(profileId, day), null) : Promise.resolve(null),
  ]);
  return { longevity: longevityDigest([...base, ...signals]), today: { ...t, justLogged: args.justLogged ?? [] }, care: c, device, family: f };
}
