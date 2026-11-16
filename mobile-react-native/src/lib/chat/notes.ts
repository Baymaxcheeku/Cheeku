import type { NoteButton } from "./daily";
import { dayLabel } from "./daily";

/*
 * CHEEKU TELLS YOU WHAT HAPPENED.
 *
 * Reports and bookings speak in the chat (owner, 16 Nov 2026), so the chat is
 * where the family's health story is told, not a box that waits for a
 * question:
 *
 *   a report filed        "I've read the lipid profile. LDL 131, up from 118."
 *   a prescription filed  "Dr Rao's prescription: 3 medicines. Check them?"
 *   a result back         "Your HbA1c from the home test is back."
 *   a test booked         "Booked: HbA1c at home, Fri 20 Nov, 6-8 am."
 *   the day before        "Tomorrow, 6-8 am: the collector comes for HbA1c."
 *   a class or a visit    reminder before, a check-in after.
 *
 * Each note is said once (the screen remembers which it has shown) and has
 * one clear next step. Pure: the screen passes in what it has read.
 */

export type DocIn = {
  id: string;
  title: string;
  docType: string;
  /** When it was filed in the app (created_at). */
  filedAt: string;
  /** Values the report marks outside its printed range. */
  flagged: { name: string; value: string }[];
  /** Readings on this report that moved since the one before. */
  changes: { name: string; from: string; to: string; direction: "up" | "down" | "same" | null }[];
  /** Medicines on a prescription. */
  medicines: number;
  doctor: string | null;
};

export type LabIn = { id: string; tests: string[]; slotDate: string; slotWindow: string; status: string; createdAt: string; resultDocumentId: string | null };
export type ClassIn = { id: string; title: string; studio: string; startsAt: string; status: string; createdAt: string };
export type VisitIn = { id: string; doctor: string; mode: "online" | "clinic"; startsAt: string; when: string; status: string; createdAt: string };

export type ChatNote = {
  key: string;
  /** For ordering, newest first. */
  at: string;
  title: string;
  line: string;
  primary: NoteButton;
  secondary: NoteButton | null;
};

const DAY = 864e5;
/** Records worth a word in chat. Bills, invoices and policies are filed quietly. */
const SPOKEN = new Set(["lab_report", "scan", "discharge", "prescription"]);
const FRESH_DAYS = 14;

function list(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function testsLabel(tests: string[]): string {
  return tests.length > 2 ? `${tests.slice(0, 2).join(", ")} and ${tests.length - 2} more` : list(tests);
}

/** "today", "tomorrow" or "Fri 20 Nov", against the local day. */
function relDay(iso: string, now: Date): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  const a = new Date(now);
  a.setHours(0, 0, 0, 0);
  const b = new Date(d);
  b.setHours(0, 0, 0, 0);
  const diff = Math.round((b.getTime() - a.getTime()) / DAY);
  return diff === 0 ? "today" : diff === 1 ? "tomorrow" : dayLabel(iso);
}

/**
 * The question a report note asks. Plain on purpose: the stand-in reads "my last
 * blood report" best (naming a value like Vitamin D can match a medicine of the
 * same name), and the real model gets the record itself through the scope.
 */
function askAbout(docType: string): string {
  return docType === "lab_report" ? "What did my last blood report say?" : "What does this report say?";
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function docNote(d: DocIn, name: string, fromLab: LabIn | null): ChatNote {
  const open: NoteButton = { label: "Open it", route: d.docType === "prescription" ? `/prescription/${d.id}` : `/records/${d.id}` };
  if (d.docType === "prescription") {
    const who = d.doctor ? `${d.doctor}'s prescription` : "the prescription";
    return {
      key: `doc:${d.id}`,
      at: d.filedAt,
      title: `I've read ${who}.`,
      line: d.medicines
        ? `${d.medicines} medicine${d.medicines === 1 ? "" : "s"} on it. I can check them against ${name}'s other medicines, allergies and conditions, and score the prescription.`
        : `It's in ${name}'s file now. I'll keep it next to the visit it came from.`,
      primary: d.medicines ? { label: "Check the medicines", route: `/prescription/${d.id}` } : open,
      secondary: d.medicines ? { label: "Ask about it", send: "What should I know about this prescription?", record: d.id } : null,
    };
  }
  const title = fromLab ? `Your ${testsLabel(fromLab.tests)} result is back.` : `I've read the ${d.title.toLowerCase().startsWith("the ") ? d.title.slice(4) : d.title}.`;
  const parts: string[] = [];
  const moved = d.changes.filter((c) => c.direction && c.direction !== "same").slice(0, 2);
  if (moved.length) parts.push(moved.map((c) => `${c.name} ${c.to}, ${c.direction === "up" ? "up" : "down"} from ${c.from}`).join("; ") + ".");
  const outside = d.flagged.filter((f) => !moved.some((c) => c.name === f.name)).slice(0, 2);
  if (outside.length) parts.push(`Outside the printed range: ${outside.map((f) => `${f.name} ${f.value}`).join(", ")}.`);
  if (!parts.length) parts.push(d.flagged.length ? `${d.flagged.length} values are outside the printed range.` : "Everything on it is inside the printed ranges.");
  return {
    key: `doc:${d.id}`,
    at: d.filedAt,
    title,
    line: parts.join(" "),
    primary: { label: moved.length || d.flagged.length ? "What does it mean?" : "Walk me through it", send: askAbout(d.docType), record: d.id },
    secondary: open,
  };
}

export function chatNotes(args: { name: string; docs: DocIn[]; labs: LabIn[]; classes: ClassIn[]; visits: VisitIn[]; now: Date }): ChatNote[] {
  const { name, now } = args;
  const t = now.getTime();
  const out: ChatNote[] = [];
  const fresh = (iso: string) => t - Date.parse(iso) < FRESH_DAYS * DAY;

  // Reports and prescriptions filed in the last two weeks. A lab result names its test.
  const resultOf = new Map(args.labs.filter((l) => l.resultDocumentId).map((l) => [l.resultDocumentId!, l]));
  for (const d of args.docs) {
    if (!SPOKEN.has(d.docType) || !fresh(d.filedAt)) continue;
    out.push(docNote(d, name, resultOf.get(d.id) ?? null));
  }

  // Home tests: booked, then the day before.
  for (const l of args.labs) {
    if (l.status === "cancelled" || l.status === "ready") continue;
    const slot = Date.parse(`${l.slotDate}T00:00:00`);
    const daysTo = Math.round((slot - new Date(now).setHours(0, 0, 0, 0)) / DAY);
    if (daysTo < 0) continue;
    const tests = testsLabel(l.tests);
    if (daysTo <= 1) {
      out.push({
        key: `lab:${l.id}:soon`,
        at: new Date(t - 1000).toISOString(),
        title: `${cap(relDay(l.slotDate, now))}, ${l.slotWindow}: the collector comes for ${tests}.`,
        line: `Keep the address handy. The result comes straight into ${name}'s file, and I'll tell you what changed.`,
        primary: { label: "See the booking", route: `/labs/booking/${l.id}` },
        secondary: null,
      });
    } else if (fresh(l.createdAt)) {
      out.push({
        key: `lab:${l.id}:booked`,
        at: l.createdAt,
        title: `Booked: ${tests} at home, ${relDay(l.slotDate, now)}, ${l.slotWindow}.`,
        line: `I'll remind you the day before. The result comes straight into ${name}'s file.`,
        primary: { label: "See the booking", route: `/labs/booking/${l.id}` },
        secondary: null,
      });
    }
  }

  // Classes: a reminder on the day, a check-in after.
  for (const c of args.classes) {
    if (c.status === "cancelled") continue;
    const start = Date.parse(c.startsAt);
    const hoursTo = (start - t) / 36e5;
    const time = new Date(start);
    const clock = `${time.getHours() % 12 || 12}:${String(time.getMinutes()).padStart(2, "0")} ${time.getHours() < 12 ? "am" : "pm"}`;
    if (hoursTo > 0 && hoursTo <= 24) {
      out.push({
        key: `class:${c.id}:soon`,
        at: new Date(t - 2000).toISOString(),
        title: `${cap(relDay(c.startsAt, now))} at ${clock}: ${c.title} at ${c.studio}.`,
        line: "Your check-in code is on the ticket. Water bottle, and go easy if it's your first one.",
        primary: { label: "Open the ticket", route: `/fitness/booking/${c.id}` },
        secondary: null,
      });
    } else if (hoursTo < 0 && hoursTo > -72) {
      out.push({
        key: `class:${c.id}:after`,
        at: new Date(start + 2 * 36e5).toISOString(),
        title: `How was ${c.title} at ${c.studio}?`,
        line: "Each class counts towards the week's movement. Want the next one lined up?",
        primary: { label: "Book the next one", route: "/fitness" },
        secondary: null,
      });
    }
  }

  // Doctor visits: prepare before, the prescription after.
  for (const v of args.visits) {
    if (v.status !== "booked") continue;
    const start = Date.parse(v.startsAt);
    const hoursTo = (start - t) / 36e5;
    const kind = v.mode === "online" ? "video call" : "visit";
    if (hoursTo > 0 && hoursTo <= 48) {
      out.push({
        key: `visit:${v.id}:soon`,
        at: new Date(t - 3000).toISOString(),
        title: `${v.when}: ${kind} with ${v.doctor}.`,
        line: `I can write out what to tell the doctor, with ${name}'s numbers, so nothing gets missed.`,
        primary: { label: "Prepare for it", send: "Prepare for my appointment" },
        secondary: { label: "See the booking", route: `/appointments/${v.id}` },
      });
    } else if (hoursTo < 0 && hoursTo > -72) {
      out.push({
        key: `visit:${v.id}:after`,
        at: new Date(start + 36e5).toISOString(),
        title: `How did the ${kind} with ${v.doctor} go?`,
        line: `Add the prescription and I'll read it, check the medicines and keep it with ${name}'s file.`,
        primary: { label: "Add the prescription", route: "/scan" },
        secondary: null,
      });
    }
  }

  // What to say first: a new report, then what's about to happen, then confirmations and check-ins.
  const rank = (k: string) => (k.startsWith("doc:") ? 0 : k.endsWith(":soon") ? 1 : k.endsWith(":booked") ? 2 : 3);
  return out.sort((a, b) => rank(a.key) - rank(b.key) || b.at.localeCompare(a.at));
}
