import type { Extraction } from "@/lib/ai/mock/extract-types";

import { readDetails, toProfileMedication } from "./details";

/*
 * What a reading turns into as `entities` rows: lab values for trends and the
 * health file, medicines and vaccines for the member's history. Pure, so the
 * mapping for every type is tested (reading.test.ts).
 */

type EntityInsert = {
  kind: "lab_value" | "medication" | "vaccine";
  name: string;
  canonical_name: string | null;
  value: number | null;
  value_text: string | null;
  unit: string | null;
  ref_range: string | null;
  flag: "normal" | "high" | "low" | "caution" | null;
};

/** The entities a reading produces, by type. */
export function entityRows(extraction: Extraction): EntityInsert[] {
  if (extraction.docType === "lab_report") {
    return extraction.values.map((v) => {
      const n = Number(v.value.replace(/,/g, ""));
      const numeric = v.value.trim() !== "" && Number.isFinite(n);
      return {
        kind: "lab_value",
        name: v.label,
        canonical_name: v.key,
        value: numeric ? n : null,
        value_text: numeric ? null : v.value,
        unit: v.unit,
        ref_range: v.refRange,
        flag: v.flag,
      };
    });
  }
  const details = readDetails(extraction.docType, { details: extraction.details });
  if (!details) return [];
  if (details.kind === "prescription" || details.kind === "discharge" || details.kind === "medication") {
    return details.medicines.map((m) => ({
      kind: "medication",
      name: toProfileMedication(m).name,
      canonical_name: m.name.toLowerCase(),
      value: null,
      value_text: toProfileMedication(m).frequency,
      unit: null,
      ref_range: null,
      flag: null,
    }));
  }
  if (details.kind === "vaccination") {
    return [{
      kind: "vaccine",
      name: details.vaccine,
      canonical_name: (details.protectsAgainst ?? details.vaccine).toLowerCase(),
      value: details.dose,
      value_text: details.doses > 1 ? `Dose ${details.dose} of ${details.doses}` : "Single dose",
      unit: null,
      ref_range: null,
      flag: null,
    }];
  }
  return [];
}
