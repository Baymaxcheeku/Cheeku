import { addDays } from "@/lib/records/details";

import { daysBetween, type ResolvedClock } from "./clock";
import type { Series } from "./series";
import { toCelsius } from "./thresholds";
import type { Fact } from "./types";

/*
 * FACTS SAID IN THE CHAT, AND WHAT HAPPENS WHEN ONE IS WRONG.
 *
 * Half of what a family knows never arrives as a document: a BP monitor
 * reading, a weight at the clinic, "bilirubin was 11 this morning". Those are
 * kept as facts with a date and a source, and join the same series as the lab
 * values, so trends include them.
 *
 * SELF-CORRECTION is a trust mechanic. In the reference thread a weight was
 * misread as a gain when it was a loss, and the correction came three turns
 * later. The right response is to find every conclusion that leaned on the
 * old value, work it out again, and SAY what changed. An app that quietly
 * updates loses the person.
 *
 * CONTRADICTIONS are never resolved silently. Two values for the same thing on
 * the same day are both shown, with which one is being used and why.
 *
 * Extraction is deliberately narrow. A number that cannot be tied to a
 * measurement with confidence is left alone: partial beats confidently wrong.
 */

export type ParsedFact = Omit<Fact, "id" | "messageId" | "documentId" | "supersededBy" | "source"> & { source: "chat" | "device" };

const n = (s: string | undefined) => (s === undefined ? NaN : Number(s));

/** The date a message is talking about: today, yesterday, or "on day 3". */
function observedOn(text: string, today: string, clock: ResolvedClock, dob: string | null): string {
  if (/\byesterday\b|\bkal\b/i.test(text)) return addDays(today, -1);
  const day = text.match(/\bon day (\d{1,2})\b|\bday (\d{1,2}) (?:it was|reading|value|bilirubin|weight)/i);
  if (day && dob && clock.relative?.kind === "day_of_life") {
    const d = n(day[1] ?? day[2]);
    if (Number.isFinite(d) && d <= 28) return addDays(dob, d);
  }
  return today;
}

export function parseFacts(text: string, today: string, clock: ResolvedClock, dob: string | null = null): ParsedFact[] {
  const out: ParsedFact[] = [];
  const t = text.replace(/,/g, "");
  const on = observedOn(t, today, clock, dob);
  const device = /\b(monitor|machine|omron|reading|meter|device)\b/i.test(t);
  const push = (key: string, label: string, value: number | null, unit: string | null, valueText: string | null = null) =>
    out.push({ key, label, value, unit, valueText, observedOn: on, source: device ? "device" : "chat" });

  const bp = t.match(/\b(?:bp|b\.p\.|blood pressure|pressure)?\D{0,12}\b(\d{2,3})\s*\/\s*(\d{2,3})\b/i);
  if (bp && /bp|b\.p\.|pressure|\d{2,3}\s*\/\s*\d{2,3}\s*(mm|mmhg)?/i.test(t)) {
    const sys = n(bp[1]);
    const dia = n(bp[2]);
    if (sys >= 60 && sys <= 260 && dia >= 30 && dia <= 160 && sys > dia) {
      push("bp_systolic", "Blood pressure (top)", sys, "mmHg", `${sys}/${dia}`);
      push("bp_diastolic", "Blood pressure (bottom)", dia, "mmHg", `${sys}/${dia}`);
    }
  }

  // "3.5 to 3.3 kg", "weight 3.3kg", "weighed 3300 g". The last number is now.
  const w = t.match(/\b(?:weight|weighs|weighed|weighing|wt|wazan)\b[^.?!]{0,30}?(\d+(?:\.\d+)?)\s*(kg|kgs|kilos?|g|grams|gm)\b(?:[^.?!]{0,12}?\bto\b\s*(\d+(?:\.\d+)?)\s*(kg|kgs|kilos?|g|grams|gm)?\b)?/i);
  if (w) {
    const unit = (w[4] ?? w[2] ?? "kg").toLowerCase();
    const raw = n(w[3] ?? w[1]);
    const kg = unit.startsWith("g") ? raw / 1000 : raw;
    if (kg > 0.3 && kg < 300) push("weight", "Weight", Math.round(kg * 1000) / 1000, "kg");
  }

  const temp = t.match(/\b(?:temp(?:erature)?|fever|bukhar)\b[^.?!]{0,20}?(\d{2,3}(?:\.\d)?)\s*(?:°\s*)?([cf])?\b/i);
  if (temp) {
    const v = toCelsius(n(temp[1]));
    if (v >= 34 && v <= 43) push("temperature", "Temperature", v, "°C");
  }

  const bili = t.match(/\b(?:bilirubin|tsb|serum bilirubin|sbr)\b[^.?!]{0,20}?(\d{1,2}(?:\.\d{1,2})?)\b/i);
  if (bili) {
    const v = n(bili[1]);
    if (v > 0 && v < 40) push("bilirubin_total", "Bilirubin", v, "mg/dL");
  }

  const sugar = t.match(/\b(?:fasting (?:sugar|glucose)|fbs|fasting)\b[^.?!]{0,15}?(\d{2,3})\b/i);
  if (sugar) {
    const v = n(sugar[1]);
    if (v >= 40 && v <= 500) push("glucose_fasting", "Fasting blood sugar", v, "mg/dL");
  }

  const hb = t.match(/\b(?:hb|haemoglobin|hemoglobin)\b[^.?!]{0,12}?(\d{1,2}(?:\.\d)?)\b/i);
  if (hb) {
    const v = n(hb[1]);
    if (v >= 3 && v <= 22) push("haemoglobin", "Haemoglobin", v, "g/dL");
  }

  return out;
}

const CORRECTION = /\b(actually|sorry|correction|i meant|i mean|my (mistake|bad)|typo|that'?s wrong|was wrong|not (up|down|gained|lost)|it (went|was) (down|up)|galat|nahi,)\b/i;

export function isCorrection(text: string): boolean {
  return CORRECTION.test(text);
}

export type Revision = {
  key: string;
  label: string;
  before: string;
  after: string;
  supersedes: string;
  /** Earlier answers that leaned on the old value. */
  affectedMessageIds: string[];
  text: string;
};

const show = (f: Pick<Fact, "value" | "valueText" | "unit">) => f.valueText ?? `${f.value ?? "?"}${f.unit ? ` ${f.unit}` : ""}`;

/**
 * Which stored facts a correcting message replaces. Only the same measurement,
 * said in the last 14 days, in a message flagged as a correction. Anything
 * looser risks "correcting" a real second reading.
 */
export function findCorrections(
  text: string,
  parsed: readonly ParsedFact[],
  stored: readonly Fact[],
  usage: readonly { messageId: string; factIds: string[] }[],
  today: string,
): Revision[] {
  if (!isCorrection(text)) return [];
  const out: Revision[] = [];
  const seen = new Set<string>();
  for (const p of parsed) {
    // BP arrives as two facts; one revision says it.
    if (p.key === "bp_diastolic") continue;
    const old = stored
      .filter((f) => f.key === p.key && !f.supersededBy && f.source !== "record" && daysBetween(f.observedOn, today) <= 14)
      .sort((a, b) => b.observedOn.localeCompare(a.observedOn))[0];
    if (!old || seen.has(old.id)) continue;
    if (old.value === p.value && old.valueText === p.valueText) continue;
    seen.add(old.id);
    const affected = usage.filter((u) => u.factIds.includes(old.id)).map((u) => u.messageId);
    out.push({
      key: p.key,
      label: p.label,
      before: show(old),
      after: show(p),
      supersedes: old.id,
      affectedMessageIds: affected,
      text: affected.length
        ? `I had ${p.label.toLowerCase()} as ${show(old)}. You've corrected it to ${show(p)}, so I've gone back over what I said earlier using the new number.`
        : `Noted: ${p.label.toLowerCase()} is ${show(p)}, not ${show(old)}. I've replaced the old number.`,
    });
  }
  return out;
}

export type Contradiction = { key: string; label: string; date: string; values: { source: string; value: string }[]; using: string; text: string };

/** Same measurement, same day, a record and a chat reading that disagree. */
export function contradictions(all: Map<string, Series>): Contradiction[] {
  const out: Contradiction[] = [];
  for (const s of all.values()) {
    const byDate = new Map<string, typeof s.points>();
    for (const p of s.points) byDate.set(p.date, [...(byDate.get(p.date) ?? []), p]);
    for (const [date, pts] of byDate) {
      const rec = pts.find((p) => p.source === "record");
      const said = pts.find((p) => p.source !== "record");
      if (!rec || !said || !rec.value) continue;
      if (Math.abs(rec.value - said.value) / Math.abs(rec.value) < 0.05) continue;
      const unit = s.unit ? ` ${s.unit}` : "";
      out.push({
        key: s.key,
        label: s.name,
        date,
        values: [
          { source: "Lab report", value: `${rec.value}${unit}` },
          { source: "You told me", value: `${said.value}${unit}` },
        ],
        using: "Lab report",
        text: `Two different ${s.name.toLowerCase()} values for ${date}: ${rec.value}${unit} on the report and ${said.value}${unit} in our chat. I'm going by the report. If the report is the one that's wrong, tell me and I'll switch.`,
      });
    }
  }
  return out;
}
