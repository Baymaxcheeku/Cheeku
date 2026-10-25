/*
 * THE DAY'S NUDGES, PLANNED ON THE PHONE.
 *
 * A pure planner: what Cheeku should say on the lock screen over the next two
 * days for one member, and when. push.ts schedules the answer as local
 * notifications, so none of it needs a server, an APNs key or a network, and
 * a dose reminder still fires on a plane.
 *
 * TWO KINDS, TWO SWITCHES.
 *   medicines   a reminder at each dose time, one follow-up an hour later if
 *               the doses are still not ticked, and a refill nudge while a
 *               strip has five days or fewer left. "Medicine reminders" in
 *               settings, and the member's own switch on Your medicines.
 *   daily       the morning plan, what's due, the lunch photo, the evening
 *               walk, the goal check-in, a streak about to break, and the
 *               Sunday reset. "Daily nudges" in settings. The account holder
 *               only, and only once Today is unlocked; a family member's
 *               phone is not here to be nudged.
 *
 * THE LIMITS, SO IT NEVER TURNS INTO NOISE.
 *   - At most four daily nudges a day. Doses are not counted: they were asked for.
 *   - Nothing within 90 minutes of anything else, doses included. A nudge
 *     has a few times it may go out; it takes the first one that fits.
 *   - Quiet from 10 pm to 7:30 am. A dose time the person picked is kept.
 *   - Each nudge only if it still matters: no lunch nudge once lunch is
 *     logged, no streak nudge once something is done today.
 *
 * TOMORROW is planned as if nothing is done yet. Doing anything means
 * opening the app, which plans again from what is true now.
 *
 * WORDS follow docs/content-system.md: title 40, body 90, playful on habits,
 * plain on medicines. The lock screen never names a medicine, a condition, a
 * reading or the goal; a family member is named by first name only.
 */

export type Slot = "morning" | "afternoon" | "night";

export type EngageInput = {
  now: Date;
  profileId: string;
  /** First name, for a family member; null for the account holder. */
  name: string | null;
  primary: boolean;
  switches: { dailyNudges: boolean; medicineReminders: boolean };
  /** Today is unlocked for this family: the daily nudges have something to open. */
  todayUnlocked: boolean;
  meds: {
    remind: boolean;
    slots: { slot: Slot; time: string; count: number; taken: boolean }[];
    /** Days left on each strip that is running low. */
    low: number[];
  } | null;
  plan: {
    openToday: number;
    doneToday: number;
    lunchLogged: boolean;
    stepsOpen: boolean;
    /** Tests and follow-ups overdue or due within the week, not yet done. */
    dueSoon: number;
  };
  goal: { hour: number; remind: boolean; doneToday: boolean } | null;
  /** Days in a row with something done, today counted once it is. */
  streak: number;
  /** How many days to plan, today included. */
  days?: number;
};

export type Nudge = {
  /** `eng-<profileId>-<yyyymmdd>-<kind>`: stable, so a resync replaces rather than doubles. */
  id: string;
  kind: string;
  at: Date;
  title: string;
  body: string;
  url: string;
  channel: "default" | "medicines";
};

export const NUDGE_LIMIT = { title: 40, body: 90 } as const;
export const DAILY_CAP = 4;
const GAP = 90 * 60_000;
const QUIET_FROM = 22 * 60;
const QUIET_TO = 7 * 60 + 30;

const SLOT_WORD: Record<Slot, string> = { morning: "morning", afternoon: "afternoon", night: "night" };

export const nudgePrefix = (profileId: string) => `eng-${profileId}-`;

const stamp = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

function at(day: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

const minutes = (d: Date) => d.getHours() * 60 + d.getMinutes();
const quiet = (d: Date) => minutes(d) >= QUIET_FROM || minutes(d) < QUIET_TO;

/** A name short enough for a title: "Papa", "Ravi". */
const short = (name: string) => (name.trim().split(/\s+/)[0] ?? "").slice(0, 10);

type Candidate = { kind: string; times: string[]; title: string; body: string; url: string; channel?: Nudge["channel"] };

export function engagementPlan(input: EngageInput): Nudge[] {
  const { now, profileId } = input;
  const days = input.days ?? 2;
  const out: Nudge[] = [];
  const soon = now.getTime() + 60_000;
  const who = input.name ? short(input.name) : null;

  for (let d = 0; d < days; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    day.setHours(0, 0, 0, 0);
    const first = d === 0;
    const id = (kind: string) => `${nudgePrefix(profileId)}${stamp(day)}-${kind}`;
    const placed: Nudge[] = [];

    // 1. Doses, exempt from the cap, at the times the person picked.
    if (input.meds && input.meds.remind && input.switches.medicineReminders) {
      for (const s of input.meds.slots) {
        if (s.count <= 0 || (first && s.taken)) continue;
        const when = at(day, s.time);
        const word = SLOT_WORD[s.slot];
        const doses = s.count === 1 ? "1 dose" : `${s.count} doses`;
        if (when.getTime() > soon) {
          placed.push({
            id: id(`dose-${s.slot}`),
            kind: "dose",
            at: when,
            title: who ? `${who}'s ${word} doses are due` : `Time for your ${word} medicines`,
            body: `${doses}. Tap to tick ${s.count === 1 ? "it" : "them"} off once ${s.count === 1 ? "it's" : "they're"} in.`,
            url: "/medicines",
            channel: "medicines",
          });
        }
        const again = new Date(when.getTime() + 60 * 60_000);
        if (again.getTime() > soon && !quiet(again)) {
          placed.push({
            id: id(`dose-${s.slot}-check`),
            kind: "dose_check",
            at: again,
            title: who ? `Has ${who} had the ${word} doses?` : `Had your ${word} medicines?`,
            body: "A quick tick keeps the week right for your doctor.",
            url: "/medicines",
            channel: "medicines",
          });
        }
      }
    }

    // 2. Everything else, most useful first, under the cap and the gap.
    const wanted: Candidate[] = [];
    const low = input.meds && input.switches.medicineReminders ? input.meds.low.map((n) => n - d) : [];
    if (low.length) {
      const least = Math.max(0, Math.min(...low));
      wanted.push({
        kind: "refill",
        times: ["10:00", "11:00", "12:00", "17:00"],
        title: least === 0 ? (who ? `One of ${who}'s medicines ran out` : "One of your medicines ran out") : who ? `${who}'s medicine is running low` : "A medicine is running low",
        body: least === 0 ? "Tap to refill it today." : `About ${least} day${least === 1 ? "" : "s"} left. Tap to refill before it runs out.`,
        url: "/medicines",
        channel: "medicines",
      });
    }

    const daily = input.switches.dailyNudges && input.todayUnlocked;
    if (daily && input.plan.dueSoon > 0) {
      wanted.push({
        kind: "due",
        times: ["11:00", "12:00", "16:00"],
        title: who ? `Something is due for ${who}` : "Something on your list is due",
        body: "Tap to plan it. Two minutes now saves a scramble later.",
        url: "/today",
      });
    }
    if (daily && input.primary) {
      const doneToday = first ? input.plan.doneToday : 0;
      if (input.goal && input.goal.remind && !(first && input.goal.doneToday)) {
        const h = Math.min(21, Math.max(8, input.goal.hour));
        const hh = (n: number) => `${String(n).padStart(2, "0")}`;
        wanted.push({ kind: "goal", times: [`${hh(h)}:00`, `${hh(h)}:30`, `${hh(h + 1)}:00`], title: "Two minutes for your goal", body: "One small step today keeps your streak going.", url: "/today" });
      }
      // Tomorrow's streak is only known if today already counts.
      const streak = first ? input.streak : input.plan.doneToday > 0 ? input.streak : 0;
      if (streak >= 2 && doneToday === 0) {
        wanted.push({ kind: "streak", times: ["20:30", "21:00"], title: `Keep your ${streak}-day streak going`, body: "One small step before bed keeps it alive.", url: "/today" });
      }
      if (!first || input.plan.openToday > 0) {
        wanted.push({ kind: "morning", times: ["08:30", "09:00", "09:30", "10:00", "10:30"], title: "Your 3 for this morning are ready", body: "Two minutes each. Start with the easiest one.", url: "/today" });
      }
      if (!(first && input.plan.lunchLogged)) {
        wanted.push({ kind: "lunch", times: ["13:30", "14:00", "14:30"], title: "Snap your lunch plate", body: "One photo, and I'll read it against your numbers.", url: "/today?task=meal%3Alunch" });
      }
      if (input.plan.stepsOpen) {
        wanted.push({ kind: "walk", times: ["18:30", "19:00", "19:30"], title: "A 10-minute walk before dinner", body: "Ten easy minutes. Your step count will thank you.", url: "/today?task=steps" });
      }
      if (day.getDay() === 0) {
        wanted.push({ kind: "sunday", times: ["18:00", "17:00", "19:30"], title: "A new week starts tomorrow", body: "Two minutes now: see what's due and pick this week's focus.", url: "/today" });
      }
    }

    let count = 0;
    for (const c of wanted) {
      if (count >= DAILY_CAP) break;
      const time = c.times
        .map((t) => at(day, t))
        .find((t) => t.getTime() > soon && !quiet(t) && placed.every((p) => Math.abs(p.at.getTime() - t.getTime()) >= GAP));
      if (!time) continue;
      placed.push({ id: id(c.kind), kind: c.kind, at: time, title: c.title, body: c.body, url: c.url, channel: c.channel ?? "default" });
      count++;
    }

    out.push(...placed);
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}
