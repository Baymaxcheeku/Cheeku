import { shortDate } from "@/lib/records/details";

import { formatGa, type ResolvedClock } from "./clock";
import type { LedgerEntry } from "./ledger";
import type { LoopView } from "./loops";
import { describeChange, type Series } from "./series";
import type { SymptomMatch } from "./symptoms";
import type { Subject } from "./types";

/*
 * THE CLINICIAN SCRIPT. The product, not the diagnosis.
 *
 * "Call the doctor" is useless at 11 pm with a yellow baby. This is:
 *
 *   "This is about Imaad, day 6 of life, born at 39 weeks.
 *    Bilirubin was 11.0 mg/dL on day 3. Weight 3.5 to 3.3 kg in 6 days.
 *    Eyes look yellow since this morning.
 *    Do you want a repeat bilirubin, and when?"
 *
 * Built only from stored values and the person's own words, so every line can
 * be traced back to a record or a message. Generated whenever the tier is
 * "contact today" or above, and on request for any appointment.
 */

export type Script = {
  /** Who to say it to, when the records name someone. */
  to: string | null;
  phone: string | null;
  opener: string;
  lines: string[];
  asks: string[];
  /** The whole thing as plain text, for copy, share or reading out. */
  text: string;
};

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

function whoLine(subject: Subject, clock: ResolvedClock): string {
  const name = subject.firstName;
  const r = clock.relative;
  if (r?.kind === "day_of_life") {
    const ga = subject.birth?.gaAtBirthDays;
    const born = ga ? `, born at ${formatGa(ga)}` : "";
    const how = subject.birth?.deliveryMode ? ` by ${subject.birth.deliveryMode}` : "";
    return `This is about ${name}, day ${r.day} of life${born}${how}.`;
  }
  if (r?.kind === "gestational") {
    const by = r.source === "scan" ? " by scan dating" : r.source === "lmp" ? " by LMP" : "";
    return `This is about ${name}, ${formatGa(r.totalDays)} pregnant${by}, due ${shortDate(r.edd)}.`;
  }
  if (r?.kind === "postpartum") return `This is about ${name}, ${r.day} days after giving birth.`;
  if (clock.ageDays !== null && clock.ageDays < 730) return `This is about ${name}, ${clock.label.replace(" old", "")} old.`;
  if (clock.ageYears !== null) return `This is about ${name}, ${clock.ageYears}.`;
  return `This is about ${name}.`;
}

function seriesLine(s: Series, clock: ResolvedClock, dob: string | null): string {
  const unit = s.unit ? ` ${s.unit}` : "";
  const when = (date: string) => {
    if (clock.relative?.kind === "day_of_life" && dob) {
      const d = Math.round((Date.parse(date) - Date.parse(dob)) / 86_400_000);
      if (d >= 0 && d <= 28) return `day ${d}`;
    }
    return date;
  };
  // A newborn's readings are said by day of life, every one: "11.0 on day 3, 11.0 on day 6".
  if (clock.relative?.kind === "day_of_life" && s.points.length > 1) {
    return `${s.name}: ${s.points
      .slice(-3)
      .map((p) => `${fmt(p.value)}${unit} on ${when(p.date)}`)
      .join(", ")}.`;
  }
  const change = describeChange(s);
  if (change) return `${s.name}: ${change}.`;
  return `${s.name} ${fmt(s.latest.value)}${unit} on ${when(s.latest.date)}.`;
}

export function buildScript(input: {
  subject: Subject;
  clock: ResolvedClock;
  question: string;
  symptoms: readonly SymptomMatch[];
  series: readonly Series[];
  ledger: readonly LedgerEntry[];
  loops: readonly LoopView[];
  notes: readonly string[];
  doctor: { name: string; phone: string | null } | null;
}): Script {
  const opener = whoLine(input.subject, input.clock);
  const lines: string[] = [];

  const words = input.question.trim().replace(/\s+/g, " ");
  if (words) lines.push(`${input.symptoms.length ? "What we're seeing" : "My question"}: "${words.length > 160 ? `${words.slice(0, 157)}...` : words}"`);
  for (const s of input.series.slice(0, 4)) lines.push(seriesLine(s, input.clock, input.subject.dob));

  const active = input.ledger.filter((e) => e.status !== "ended").map((e) => e.name);
  if (active.length) lines.push(`Currently taking: ${active.slice(0, 5).join(", ")}${active.length > 5 ? ` and ${active.length - 5} more` : ""}.`);
  if (input.subject.allergies.length) lines.push(`Allergies: ${input.subject.allergies.join(", ")}.`);
  for (const l of input.loops.slice(0, 2)) lines.push(`Still open: ${l.title}${l.daysOpen ? `, ${l.daysOpen} days` : ""}.`);
  for (const n of input.notes.slice(0, 2)) lines.push(n);

  const asks = [...new Set(input.symptoms.flatMap((s) => s.model.askDoctor))].slice(0, 2);
  if (!asks.length) asks.push("Does this need to be seen today?");

  const to = input.doctor?.name ?? null;
  const text = [to ? `For ${to}:` : null, opener, ...lines, ...asks.map((a) => `Question: ${a}`)].filter(Boolean).join("\n");
  return { to, phone: input.doctor?.phone ?? null, opener, lines, asks, text };
}
