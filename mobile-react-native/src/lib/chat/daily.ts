import { areaQuestion, focusAreas, type Area } from "@/lib/longevity/areas";

/** The areas for one person (same shape as useAreas). */
export type AreasView = { areas: Area[]; focus: Area[]; known: boolean };

export function areasView(areas: Area[]): AreasView {
  return { areas, focus: focusAreas(areas), known: areas.some((a) => a.status !== "unknown") };
}

/*
 * CHEEKU SPEAKS FIRST.
 *
 * Once a day, before anyone types, the chat opens with one short note from
 * Cheeku: the one area to work on, or on Sundays the weekly check-in. Each
 * note has one button that asks the question for you, so the sparrow's
 * answers (lib/memory/sparrow.ts) are a tap away instead of a phrase you
 * have to guess. Pure: the screen passes in the areas and the clock.
 */

/** `record`: ask about that record (the chat scopes the question to it). */
export type NoteButton = { label: string; send?: string; route?: string; record?: string };
export type DailyNote = { key: string; greeting: string; line: string; primary: NoteButton; secondary: NoteButton | null };

export function partOfDay(hour: number): "morning" | "afternoon" | "evening" {
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

export function dailyNote(args: { name: string; self: boolean; areas: AreasView | null; now: Date }): DailyNote {
  const { name, self, areas, now } = args;
  const greeting = self ? `Good ${partOfDay(now.getHours())}, ${name}.` : `Good ${partOfDay(now.getHours())}. Here's ${name}'s day.`;
  const plan: NoteButton = { label: "Today's plan", route: "/today" };

  if (now.getDay() === 0) {
    return {
      key: "checkin",
      greeting,
      line: `It's check-in day. Two minutes on how ${self ? "your" : `${name}'s`} week went, and I'll tune next week's plan around it.`,
      primary: { label: "Start my check-in", send: "How was my week?" },
      secondary: plan,
    };
  }
  const focus = areas?.focus[0];
  if (focus) {
    return {
      key: `focus:${focus.key}`,
      greeting,
      line: `One thing today: ${focus.label.toLowerCase() === "heart and bp" ? "heart and BP" : focus.label.toLowerCase()}. ${focus.line}`,
      primary: { label: "Talk it through", send: areaQuestion(focus) },
      secondary: plan,
    };
  }
  if (!areas?.known) {
    return {
      key: "empty",
      greeting,
      line: `I don't have much on ${self ? "you" : name} yet. A recent blood report is the fastest way for me to start watching the big areas: heart, sugar, check-ups.`,
      primary: { label: "Add a report", route: "/scan" },
      secondary: { label: "Connect a watch", route: "/wearables/connect" },
    };
  }
  return {
    key: "clear",
    greeting,
    line: "Everything I can see is on track. Keep the small daily steps going and I'll tell you if anything moves.",
    primary: { label: "How am I doing?", send: "How am I doing overall?" },
    secondary: plan,
  };
}

/** The five shortcuts above the typing box. `family` only for the account holder with family added. */
export type Shortcut = { key: "checkin" | "log" | "goals" | "book" | "family"; label: string; send?: string };

export function shortcuts(showFamily: boolean): Shortcut[] {
  return [
    { key: "checkin", label: "Weekly check-in", send: "How was my week?" },
    { key: "log", label: "Log" },
    { key: "goals", label: "Goals", send: "Change my goal" },
    { key: "book", label: "Book", send: "I want to book something" },
    ...(showFamily ? [{ key: "family" as const, label: "Family", send: "How is everyone?" }] : []),
  ];
}

/** What "Log" offers: each one starts the sentence, the person finishes it. */
export const LOG_STARTS: { key: string; label: string; text: string }[] = [
  { key: "steps", label: "Steps", text: "I walked " },
  { key: "sleep", label: "Sleep", text: "I slept " },
  { key: "bp", label: "BP", text: "My BP is " },
  { key: "weight", label: "Weight", text: "My weight is " },
  { key: "sugar", label: "Sugar", text: "My fasting sugar is " },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Fri 13 Nov": short, and the same on every phone (no Intl). */
export function dayLabel(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
