import { supabase } from "@/lib/supabase/client";
import type { DocType, EntityFlag } from "./types";

/*
 * The health file, read once.
 *
 * Everything the Home block and the dashboard show comes from here, so the two
 * can never disagree about how many reports someone has — which is exactly what
 * happened with the old summary tiles and the record list beneath them, both
 * counting the same documents in their own way, one screen apart.
 *
 * NOTHING IS DERIVED THAT THE RECORDS DO NOT SAY. No score, no grade, no
 * "health age". A single number summarising a person's health is a clinical
 * judgement, and this app does not make those — it counts what is filed, shows
 * what the lab flagged, and stops.
 */

export type FlaggedValue = {
  id: string;
  name: string;
  value: string;
  unit: string | null;
  refRange: string | null;
  flag: EntityFlag;
  eventDate: string | null;
  documentId: string | null;
  /** Set when an earlier reading of the same thing exists to compare against. */
  direction: "up" | "down" | "same" | null;
};

export type MedicationEntry = {
  id: string;
  name: string;
  dose: string | null;
  /** Where it came from: a filed prescription, or the reader's own profile. */
  source: "record" | "profile";
};

export type HealthOverview = {
  /** Counts per document type, only for types actually present. */
  byType: { type: DocType; count: number }[];
  totalDocuments: number;
  needsReview: number;
  /** Distinct lab values captured across every report. */
  dataPoints: number;
  flagged: FlaggedValue[];
  medications: MedicationEntry[];
  vaccinations: number;
  /** Distinct doctors and facilities seen across the file. */
  facilities: string[];
  doctors: string[];
  /** The most recent event date on any document. */
  lastEvent: string | null;
};

const EMPTY: HealthOverview = {
  byType: [],
  totalDocuments: 0,
  needsReview: 0,
  dataPoints: 0,
  flagged: [],
  medications: [],
  vaccinations: 0,
  facilities: [],
  doctors: [],
  lastEvent: null,
};

export async function healthOverview(profileId: string | null): Promise<HealthOverview> {
  if (!profileId) return EMPTY;

  const [documents, entities, profile] = await Promise.all([
    supabase
      .from("documents")
      .select("id, doc_type, status, event_date, facility, doctor")
      .eq("profile_id", profileId),
    supabase
      .from("entities")
      .select("id, document_id, kind, name, canonical_name, value, value_text, unit, ref_range, flag, event_date")
      .eq("profile_id", profileId),
    supabase.from("profiles").select("medications").eq("id", profileId).maybeSingle(),
  ]);

  const docs = documents.data ?? [];
  const ents = entities.data ?? [];

  const counts = new Map<DocType, number>();
  const facilities = new Set<string>();
  const doctors = new Set<string>();
  let needsReview = 0;
  let lastEvent: string | null = null;

  for (const d of docs) {
    const type = d.doc_type as DocType;
    counts.set(type, (counts.get(type) ?? 0) + 1);
    if (d.status === "needs_review") needsReview += 1;
    if (d.facility) facilities.add(d.facility as string);
    if (d.doctor) doctors.add(d.doctor as string);

    const event = d.event_date as string | null;
    if (event && (!lastEvent || event > lastEvent)) lastEvent = event;
  }

  const labs = ents.filter((e) => e.kind === "lab_value" || e.kind === "vital");

  /*
   * Flagged values, newest first, ONE PER MEASUREMENT.
   *
   * Without the dedupe a reader with four haemoglobin tests sees the same name
   * four times and reads it as four problems. Grouping by canonical name and
   * keeping the newest also gives the comparison the direction arrow needs.
   */
  const byName = new Map<string, typeof labs>();
  for (const e of labs) {
    const key = ((e.canonical_name as string | null) ?? (e.name as string)).toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), e]);
  }

  const flagged: FlaggedValue[] = [];
  for (const readings of byName.values()) {
    const sorted = [...readings].sort((a, b) =>
      String(b.event_date ?? "").localeCompare(String(a.event_date ?? "")),
    );
    const latest = sorted[0];
    if (!latest) continue;

    const flag = latest.flag as EntityFlag | null;
    if (!flag || flag === "normal") continue;

    const previous = sorted[1];
    const current = latest.value as number | null;
    const before = previous?.value as number | null | undefined;

    flagged.push({
      id: latest.id as string,
      name: latest.name as string,
      value: latest.value !== null ? String(latest.value) : ((latest.value_text as string) ?? "—"),
      unit: latest.unit as string | null,
      refRange: latest.ref_range as string | null,
      flag,
      eventDate: latest.event_date as string | null,
      documentId: latest.document_id as string | null,
      direction:
        current === null || before === null || before === undefined
          ? null
          : current > before
            ? "up"
            : current < before
              ? "down"
              : "same",
    });
  }

  flagged.sort((a, b) => String(b.eventDate ?? "").localeCompare(String(a.eventDate ?? "")));

  /*
   * Medicines from two places, and the source is kept.
   *
   * A name extracted from a prescription and a name the reader typed into their
   * health profile are different kinds of fact, and the dashboard says which is
   * which rather than blending them into one list nobody can audit.
   */
  const medications: MedicationEntry[] = ents
    .filter((e) => e.kind === "medication")
    .map((e) => ({
      id: e.id as string,
      name: e.name as string,
      dose: (e.value_text as string | null) ?? (e.unit as string | null),
      source: "record" as const,
    }));

  const declared = (profile.data?.medications ?? []) as { name?: string; dose?: string }[];
  for (const [i, m] of declared.entries()) {
    if (!m?.name) continue;
    if (medications.some((x) => x.name.toLowerCase() === m.name?.toLowerCase())) continue;
    medications.push({
      id: `profile-${i}`,
      name: m.name,
      dose: m.dose ?? null,
      source: "profile",
    });
  }

  return {
    byType: [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    totalDocuments: docs.length,
    needsReview,
    dataPoints: labs.length,
    flagged,
    medications,
    vaccinations: ents.filter((e) => e.kind === "vaccine").length,
    facilities: [...facilities],
    doctors: [...doctors],
    lastEvent,
  };
}
